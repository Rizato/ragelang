import type {
  Program,
  Statement,
  Expression,
  DrawBlock,
  UpdateBlock,
  FunctionDeclaration,
  EnumDeclaration,
  ReturnStatement,
  IfStatement,
  LoopStatement,
  BlockStatement,
  VariableDeclaration,
  AssignmentExpression,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  MemberExpression,
  IndexExpression,
  ArrayLiteral,
  ObjectLiteral,
  MatchExpression,
  Pattern,
  Identifier,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
} from '../parser/ast.js';
import { CanvasRenderer } from '../renderer/canvas.js';
import {
  type RageValue,
  type RageFunction,
  type RageEnumVariantDef,
  type BuiltinFunction,
  createBuiltins,
  createPrototype,
  isPrototype,
  isEnumVariantDef,
  isEnumVariant,
  createEnumVariant,
} from './builtins.js';

/**
 * Return exception for unwinding the call stack
 */
class ReturnException {
  constructor(public value: RageValue) {}
}

/**
 * Break exception for exiting loops
 */
class BreakException {}

function isRageFunction(value: RageValue): value is RageFunction {
  return typeof value === 'object' && 
         value !== null && 
         !Array.isArray(value) &&
         (value as RageFunction).__type === 'function';
}

/**
 * Environment for variable scoping
 */
class Environment {
  private values: Map<string, RageValue> = new Map();
  private parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.parent = parent;
  }

  define(name: string, value: RageValue): void {
    this.values.set(name, value);
  }

  get(name: string): RageValue {
    if (this.values.has(name)) {
      return this.values.get(name)!;
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new Error(`Undefined variable: ${name}`);
  }

  set(name: string, value: RageValue): void {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.set(name, value);
      return;
    }
    // Create new variable in current scope
    this.values.set(name, value);
  }

  has(name: string): boolean {
    if (this.values.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
}

/**
 * Ragelang Interpreter
 */
export class Interpreter {
  private globalEnv: Environment;
  private currentEnv: Environment;
  private builtins: Map<string, BuiltinFunction>;
  
  private drawBlock: DrawBlock | null = null;
  private updateBlock: UpdateBlock | null = null;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private running: boolean = false;

  constructor(renderer: CanvasRenderer) {
    this.globalEnv = new Environment();
    this.currentEnv = this.globalEnv;
    this.builtins = createBuiltins(renderer);

    // Add builtins to global environment
    for (const [name, fn] of this.builtins) {
      this.globalEnv.define(name, fn);
    }
  }

  /**
   * Run a Ragelang program
   */
  run(program: Program): void {
    for (const statement of program.body) {
      this.executeStatement(statement);
    }
  }

  /**
   * Start the game loop
   */
  startGameLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stopGameLoop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    const currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Execute update block if it exists
    if (this.updateBlock) {
      const updateEnv = new Environment(this.globalEnv);
      updateEnv.define(this.updateBlock.parameter, dt);
      const prevEnv = this.currentEnv;
      this.currentEnv = updateEnv;
      try {
        this.executeBlock(this.updateBlock.body);
      } catch (e) {
        if (!(e instanceof ReturnException)) throw e;
      }
      this.currentEnv = prevEnv;
    }

    // Execute draw block if it exists
    if (this.drawBlock) {
      const drawEnv = new Environment(this.globalEnv);
      const prevEnv = this.currentEnv;
      this.currentEnv = drawEnv;
      try {
        this.executeBlock(this.drawBlock.body);
      } catch (e) {
        if (!(e instanceof ReturnException)) throw e;
      }
      this.currentEnv = prevEnv;
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private executeStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'DrawBlock':
        this.drawBlock = stmt;
        break;
      case 'UpdateBlock':
        this.updateBlock = stmt;
        break;
      case 'FunctionDeclaration':
        this.executeFunctionDeclaration(stmt);
        break;
      case 'EnumDeclaration':
        this.executeEnumDeclaration(stmt as EnumDeclaration);
        break;
      case 'ReturnStatement':
        this.executeReturn(stmt);
        break;
      case 'IfStatement':
        this.executeIf(stmt);
        break;
      case 'LoopStatement':
        this.executeLoop(stmt);
        break;
      case 'BreakStatement':
        throw new BreakException();
        break;
      case 'BlockStatement':
        this.executeBlock(stmt);
        break;
      case 'ExpressionStatement':
        this.evaluate(stmt.expression);
        break;
      case 'VariableDeclaration':
        this.executeVariableDeclaration(stmt);
        break;
    }
  }

  private executeFunctionDeclaration(stmt: FunctionDeclaration): void {
    const fn: RageFunction = {
      __type: 'function',
      name: stmt.name,
      parameters: stmt.parameters,
      body: stmt.body,
      closure: this.currentEnv,
    };
    this.currentEnv.define(stmt.name, fn);
  }

  private executeEnumDeclaration(stmt: EnumDeclaration): void {
    // Register each variant as a callable constructor in the environment
    for (const variant of stmt.variants) {
      const variantDef: RageEnumVariantDef = {
        __type: 'enum_variant_def',
        enumName: stmt.name,
        variantName: variant.name,
        fields: variant.fields,
      };
      
      // Unit variants (no fields) are stored as a pre-created instance
      if (variant.fields.length === 0) {
        const instance = createEnumVariant(stmt.name, variant.name);
        this.currentEnv.define(variant.name, instance);
      } else {
        // Data variants are stored as the variant definition (acts as constructor)
        this.currentEnv.define(variant.name, variantDef);
      }
    }
  }

  private executeReturn(stmt: ReturnStatement): void {
    const value = stmt.argument ? this.evaluate(stmt.argument) : null;
    throw new ReturnException(value);
  }

  private executeIf(stmt: IfStatement): void {
    const condition = this.evaluate(stmt.condition);
    
    if (this.isTruthy(condition)) {
      // Don't create new scope for if/else blocks - flat scoping
      this.executeBlockStatements(stmt.consequent);
    } else if (stmt.alternate) {
      if (stmt.alternate.type === 'IfStatement') {
        this.executeIf(stmt.alternate);
      } else {
        this.executeBlockStatements(stmt.alternate);
      }
    }
  }

  private executeLoop(stmt: LoopStatement): void {
    try {
      while (true) {
        this.executeBlockStatements(stmt.body);
      }
    } catch (e) {
      if (e instanceof BreakException) {
        return; // Exit the loop
      }
      throw e;
    }
  }

  private executeBlock(block: BlockStatement): void {
    const blockEnv = new Environment(this.currentEnv);
    const prevEnv = this.currentEnv;
    this.currentEnv = blockEnv;

    try {
      for (const stmt of block.body) {
        this.executeStatement(stmt);
      }
    } finally {
      this.currentEnv = prevEnv;
    }
  }

  /**
   * Execute block statements without creating a new scope
   * Used for if/else/while blocks where variables should be visible outside
   */
  private executeBlockStatements(block: BlockStatement): void {
    for (const stmt of block.body) {
      this.executeStatement(stmt);
    }
  }

  private executeVariableDeclaration(stmt: VariableDeclaration): void {
    const value = this.evaluate(stmt.init);
    // Use set() instead of define() so that if the variable exists in an
    // outer scope, it gets updated there instead of creating a new local
    this.currentEnv.set(stmt.name, value);
  }

  private evaluate(expr: Expression): RageValue {
    switch (expr.type) {
      case 'NumberLiteral':
        return (expr as NumberLiteral).value;
      case 'StringLiteral':
        return (expr as StringLiteral).value;
      case 'BooleanLiteral':
        return (expr as BooleanLiteral).value;
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expr as ArrayLiteral);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(expr as ObjectLiteral);
      case 'MatchExpression':
        return this.evaluateMatch(expr as MatchExpression);
      case 'Identifier':
        return this.currentEnv.get((expr as Identifier).name);
      case 'PrototypeExpression':
        return createPrototype();
      case 'BinaryExpression':
        return this.evaluateBinary(expr as BinaryExpression);
      case 'UnaryExpression':
        return this.evaluateUnary(expr as UnaryExpression);
      case 'CallExpression':
        return this.evaluateCall(expr as CallExpression);
      case 'MemberExpression':
        return this.evaluateMember(expr as MemberExpression);
      case 'IndexExpression':
        return this.evaluateIndex(expr as IndexExpression);
      case 'AssignmentExpression':
        return this.evaluateAssignment(expr as AssignmentExpression);
      default:
        throw new Error(`Unknown expression type: ${(expr as Expression).type}`);
    }
  }

  private evaluateArrayLiteral(expr: ArrayLiteral): RageValue[] {
    return expr.elements.map(el => this.evaluate(el));
  }

  private evaluateObjectLiteral(expr: ObjectLiteral): RageValue {
    const obj = createPrototype();
    for (const prop of expr.properties) {
      obj[prop.key] = this.evaluate(prop.value);
    }
    return obj;
  }

  private evaluateMatch(expr: MatchExpression): RageValue {
    const subject = this.evaluate(expr.subject);
    
    for (const arm of expr.arms) {
      const bindings = this.matchPattern(arm.pattern, subject);
      if (bindings !== null) {
        // Pattern matched! Create a scope with bindings and evaluate body
        const matchEnv = new Environment(this.currentEnv);
        for (const [name, value] of bindings) {
          matchEnv.define(name, value);
        }
        
        const prevEnv = this.currentEnv;
        this.currentEnv = matchEnv;
        try {
          return this.evaluate(arm.body);
        } finally {
          this.currentEnv = prevEnv;
        }
      }
    }
    
    throw new Error('Non-exhaustive match: no pattern matched');
  }

  /**
   * Try to match a pattern against a value.
   * Returns a Map of bindings if successful, null if pattern doesn't match.
   */
  private matchPattern(pattern: Pattern, value: RageValue): Map<string, RageValue> | null {
    switch (pattern.type) {
      case 'WildcardPattern':
        // _ matches anything
        return new Map();
      
      case 'LiteralPattern':
        // Match exact value
        if (value === pattern.value) {
          return new Map();
        }
        return null;
      
      case 'IdentifierPattern': {
        // Convention: PascalCase identifiers (starting with uppercase) in patterns
        // are treated as enum variant matches, not bindings
        const isPascalCase = pattern.name.length > 0 && 
          pattern.name[0] === pattern.name[0].toUpperCase() &&
          pattern.name[0] !== pattern.name[0].toLowerCase();
        
        if (isPascalCase) {
          // This should match an enum variant with this name
          if (!isEnumVariant(value)) {
            return null;  // Not an enum variant, no match
          }
          if (value.variantName !== pattern.name) {
            return null;  // Different variant name, no match
          }
          return new Map();  // Matched!
        }
        
        // lowercase identifiers bind the value to the identifier
        return new Map([[pattern.name, value]]);
      }
      
      case 'VariantPattern': {
        // Match enum variant
        if (!isEnumVariant(value)) {
          return null;
        }
        
        // Check variant name matches
        if (value.variantName !== pattern.variantName) {
          return null;
        }
        
        // Check enum name if specified
        if (pattern.enumName !== null && value.enumName !== pattern.enumName) {
          return null;
        }
        
        // Extract bindings from variant data
        const bindings = new Map<string, RageValue>();
        const dataEntries = Array.from(value.data.entries());
        
        for (let i = 0; i < pattern.bindings.length; i++) {
          const bindingName = pattern.bindings[i];
          if (i < dataEntries.length) {
            bindings.set(bindingName, dataEntries[i][1]);
          } else {
            bindings.set(bindingName, null);
          }
        }
        
        return bindings;
      }
      
      default:
        return null;
    }
  }

  private evaluateBinary(expr: BinaryExpression): RageValue {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator) {
      // Arithmetic
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left) + String(right);
        }
        return Number(left) + Number(right);
      case '-':
        return Number(left) - Number(right);
      case '*':
        return Number(left) * Number(right);
      case '/':
        return Number(left) / Number(right);
      case '%':
        return Number(left) % Number(right);
      case '**':
        return Math.pow(Number(left), Number(right));
      
      // Comparison
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        return Number(left) < Number(right);
      case '<=':
        return Number(left) <= Number(right);
      case '>':
        return Number(left) > Number(right);
      case '>=':
        return Number(left) >= Number(right);
      
      // Logical (short-circuit for keyword versions)
      case 'and':
        return this.isTruthy(left) ? right : left;
      case 'or':
        return this.isTruthy(left) ? left : right;
      case '&&':
        return this.isTruthy(left) ? right : left;
      case '||':
        return this.isTruthy(left) ? left : right;
      
      // Bitwise
      case '&':
        return (Number(left) | 0) & (Number(right) | 0);
      case '|':
        return (Number(left) | 0) | (Number(right) | 0);
      case '^':
        return (Number(left) | 0) ^ (Number(right) | 0);
      case '<<':
        return (Number(left) | 0) << (Number(right) | 0);
      case '>>':
        return (Number(left) | 0) >> (Number(right) | 0);
      
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  private evaluateUnary(expr: UnaryExpression): RageValue {
    const value = this.evaluate(expr.argument);

    switch (expr.operator) {
      case '-':
        return -Number(value);
      case '!':
        return !this.isTruthy(value);
      case '~':
        return ~(Number(value) | 0);
      default:
        throw new Error(`Unknown unary operator: ${expr.operator}`);
    }
  }

  private evaluateCall(expr: CallExpression): RageValue {
    const callee = this.evaluate(expr.callee);
    const args = expr.arguments.map(arg => this.evaluate(arg));

    // Built-in function
    if (typeof callee === 'function') {
      return callee(...args);
    }

    // User-defined function
    if (isRageFunction(callee)) {
      return this.callFunction(callee, args);
    }

    // Enum variant constructor
    if (isEnumVariantDef(callee)) {
      return this.callVariantConstructor(callee, args);
    }

    throw new Error('Can only call functions or enum variant constructors');
  }

  private callFunction(fn: RageFunction, args: RageValue[]): RageValue {
    // Create new environment with closure as parent
    const fnEnv = new Environment(fn.closure as Environment);
    
    // Bind parameters to arguments
    for (let i = 0; i < fn.parameters.length; i++) {
      fnEnv.define(fn.parameters[i], args[i] ?? null);
    }

    const prevEnv = this.currentEnv;
    this.currentEnv = fnEnv;

    try {
      this.executeBlock(fn.body as BlockStatement);
    } catch (e) {
      if (e instanceof ReturnException) {
        this.currentEnv = prevEnv;
        return e.value;
      }
      throw e;
    }

    this.currentEnv = prevEnv;
    return null;
  }

  private callVariantConstructor(variantDef: RageEnumVariantDef, args: RageValue[]): RageValue {
    const data = new Map<string, RageValue>();
    
    for (let i = 0; i < variantDef.fields.length; i++) {
      data.set(variantDef.fields[i], args[i] ?? null);
    }
    
    return createEnumVariant(variantDef.enumName, variantDef.variantName, data);
  }

  private evaluateMember(expr: MemberExpression): RageValue {
    const object = this.evaluate(expr.object);
    const property = expr.property.name;

    if (isPrototype(object)) {
      return object[property] ?? null;
    }

    // Handle array length property
    if (Array.isArray(object) && property === 'length') {
      return object.length;
    }

    throw new Error('Can only access properties on prototypes or arrays');
  }

  private evaluateIndex(expr: IndexExpression): RageValue {
    const object = this.evaluate(expr.object);
    const index = this.evaluate(expr.index);

    if (Array.isArray(object)) {
      const idx = Number(index) | 0;
      return object[idx] ?? null;
    }

    if (typeof object === 'string') {
      const idx = Number(index) | 0;
      return object[idx] ?? null;
    }

    if (isPrototype(object)) {
      return object[String(index)] ?? null;
    }

    throw new Error('Can only index into arrays, strings, or prototypes');
  }

  private evaluateAssignment(expr: AssignmentExpression): RageValue {
    const value = this.evaluate(expr.right);

    if (expr.left.type === 'Identifier') {
      const name = (expr.left as Identifier).name;
      this.currentEnv.set(name, value);
    } else if (expr.left.type === 'MemberExpression') {
      const memberExpr = expr.left as MemberExpression;
      const object = this.evaluate(memberExpr.object);
      const property = memberExpr.property.name;

      if (isPrototype(object)) {
        object[property] = value;
      } else {
        throw new Error('Can only set properties on prototypes');
      }
    } else if (expr.left.type === 'IndexExpression') {
      const indexExpr = expr.left as IndexExpression;
      const object = this.evaluate(indexExpr.object);
      const index = this.evaluate(indexExpr.index);

      if (Array.isArray(object)) {
        const idx = Number(index) | 0;
        object[idx] = value;
      } else if (isPrototype(object)) {
        object[String(index)] = value;
      } else {
        throw new Error('Can only index-assign to arrays or prototypes');
      }
    }

    return value;
  }

  private isTruthy(value: RageValue): boolean {
    if (value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  }

  /**
   * Get the current environment (for testing)
   */
  getEnvironment(): Environment {
    return this.currentEnv;
  }

  /**
   * Reset the interpreter state
   */
  reset(): void {
    this.stopGameLoop();
    this.globalEnv = new Environment();
    this.currentEnv = this.globalEnv;
    this.drawBlock = null;
    this.updateBlock = null;

    // Re-add builtins
    for (const [name, fn] of this.builtins) {
      this.globalEnv.define(name, fn);
    }
  }
}
