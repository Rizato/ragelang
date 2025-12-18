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
  UpdateExpression,
  CallExpression,
  MemberExpression,
  IndexExpression,
  SliceExpression,
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
import { InputManager } from '../input/input.js';
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
  private inputManager: InputManager;
  
  private drawBlock: DrawBlock | null = null;
  private updateBlock: UpdateBlock | null = null;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private running: boolean = false;
  private frameCount: number = 0;

  constructor(renderer: CanvasRenderer, inputManager?: InputManager) {
    this.globalEnv = new Environment();
    this.currentEnv = this.globalEnv;
    
    // Create or use provided input manager
    this.inputManager = inputManager ?? new InputManager();
    
    // If we have a canvas from the renderer, set it for input
    const ctx = renderer.getContext();
    if (ctx?.canvas) {
      this.inputManager.setCanvas(ctx.canvas);
    }
    
    this.builtins = createBuiltins(renderer, undefined, this.inputManager, () => this.frameCount);

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

    // Increment frame counter
    this.frameCount++;

    // Update input state at start of frame
    this.inputManager.update();

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
      case 'NullLiteral':
        return null;
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
      case 'SliceExpression':
        return this.evaluateSlice(expr as SliceExpression);
      case 'AssignmentExpression':
        return this.evaluateAssignment(expr as AssignmentExpression);
      case 'UpdateExpression':
        return this.evaluateUpdate(expr as UpdateExpression);
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
        // Pattern matched! Create a scope with bindings and execute body
        const matchEnv = new Environment(this.currentEnv);
        for (const [name, value] of bindings) {
          matchEnv.define(name, value);
        }
        
        const prevEnv = this.currentEnv;
        this.currentEnv = matchEnv;
        try {
          // Handle block statement bodies (containing statements)
          if (arm.body.type === 'BlockStatement') {
            this.executeBlockStatements(arm.body as BlockStatement);
            return null; // Block bodies don't return a value
          }
          // Handle expression bodies
          return this.evaluate(arm.body as Expression);
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
    // Handle short-circuit evaluation for logical operators FIRST
    // These must not evaluate the right operand unless necessary
    switch (expr.operator) {
      case 'and':
      case '&&': {
        const left = this.evaluate(expr.left);
        // Short-circuit: if left is falsy, return left without evaluating right
        if (!this.isTruthy(left)) {
          return left;
        }
        // Left is truthy, evaluate and return right
        return this.evaluate(expr.right);
      }
      case 'or':
      case '||': {
        const left = this.evaluate(expr.left);
        // Short-circuit: if left is truthy, return left without evaluating right
        if (this.isTruthy(left)) {
          return left;
        }
        // Left is falsy, evaluate and return right
        return this.evaluate(expr.right);
      }
    }

    // For all other operators, evaluate both operands
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

  // Parameter names for built-in functions (for keyword argument support)
  private static BUILTIN_PARAMS: Record<string, string[]> = {
    'sprite': ['path', 'x', 'y', 'width', 'height', 'sx', 'sy', 'sw', 'sh', 'color'],
    'text': ['text', 'x', 'y', 'size', 'color'],
    'rect': ['x', 'y', 'width', 'height', 'color'],
    'circle': ['x', 'y', 'radius', 'color'],
    'line': ['x1', 'y1', 'x2', 'y2', 'color', 'width'],
    'clear': ['color'],
    'min': ['a', 'b'],
    'max': ['a', 'b'],
    'clamp': ['value', 'min', 'max'],
    'lerp': ['a', 'b', 't'],
    'distance': ['x1', 'y1', 'x2', 'y2'],
    'rect_overlap': ['x1', 'y1', 'w1', 'h1', 'x2', 'y2', 'w2', 'h2'],
    'randomInt': ['min', 'max'],
    'push': ['arr', 'value'],
    'insert': ['arr', 'index', 'value'],
    'remove': ['arr', 'value'],
    'extend': ['arr', 'other'],
    'count': ['arr', 'value'],
    'index': ['arr', 'value'],
    'contains': ['arr', 'value'],
    'slice': ['arr', 'start', 'end'],
    'join': ['arr', 'separator'],
    'array': ['size'],
    // Audio
    'music': ['path', 'volume'],
    'music_volume': ['volume'],
    'sound': ['path', 'gain'],
    'master_volume': ['volume'],
    // Input
    'pressed': ['action'],
    'held': ['action'],
    'released': ['action'],
    'key_pressed': ['key'],
    'key_held': ['key'],
    'key_released': ['key'],
    'mouse_pressed': ['button'],
    'mouse_held': ['button'],
    'mouse_released': ['button'],
    'touch_x': ['index'],
    'touch_y': ['index'],
    // Input Buffer
    'buffer_input': ['action', 'duration'],
    'check_buffer': ['action'],
    'peek_buffer': ['action'],
    'clear_buffer': ['action'],
    'buffer_time': ['action'],
    // Math
    'deg': ['radians'],
    'rad': ['degrees'],
    'asin': ['x'],
    'acos': ['x'],
    'atan': ['x'],
    'sinh': ['x'],
    'cosh': ['x'],
    'tanh': ['x'],
    'log': ['x'],
    'log10': ['x'],
    'exp': ['x'],
    // Time
    'time': [],
    'frames': [],
  };

  private evaluateCall(expr: CallExpression): RageValue {
    const callee = this.evaluate(expr.callee);
    
    // Separate positional and keyword arguments
    const positionalArgs: RageValue[] = [];
    const keywordArgs: Map<string, RageValue> = new Map();
    
    for (const arg of expr.arguments) {
      const value = this.evaluate(arg.value);
      if (arg.name === null) {
        positionalArgs.push(value);
      } else {
        keywordArgs.set(arg.name, value);
      }
    }

    // Built-in function
    if (typeof callee === 'function') {
      // Try to get parameter names for this builtin
      let builtinName: string | null = null;
      if (expr.callee.type === 'Identifier') {
        builtinName = (expr.callee as Identifier).name;
      }
      
      const params = builtinName ? Interpreter.BUILTIN_PARAMS[builtinName] : null;
      const args = this.resolveArgs(positionalArgs, keywordArgs, params);
      return callee(...args);
    }

    // User-defined function
    if (isRageFunction(callee)) {
      return this.callFunction(callee, positionalArgs, keywordArgs);
    }

    // Enum variant constructor
    if (isEnumVariantDef(callee)) {
      const args = this.resolveArgs(positionalArgs, keywordArgs, callee.fields);
      return this.callVariantConstructor(callee, args);
    }

    throw new Error('Can only call functions or enum variant constructors');
  }

  /**
   * Resolve positional and keyword arguments into a single argument array
   */
  private resolveArgs(
    positional: RageValue[],
    keyword: Map<string, RageValue>,
    params: string[] | null
  ): RageValue[] {
    if (keyword.size === 0) {
      return positional;
    }
    
    if (!params) {
      // No parameter info - just append keyword values after positional
      return [...positional, ...keyword.values()];
    }
    
    // Build args array, filling in keyword args at correct positions
    const args: RageValue[] = [...positional];
    
    // Extend array to accommodate keyword args
    for (const [name, value] of keyword) {
      const idx = params.indexOf(name);
      if (idx === -1) {
        throw new Error(`Unknown keyword argument: ${name}`);
      }
      // Ensure array is long enough
      while (args.length <= idx) {
        args.push(null);
      }
      args[idx] = value;
    }
    
    return args;
  }

  private callFunction(
    fn: RageFunction, 
    positionalArgs: RageValue[], 
    keywordArgs: Map<string, RageValue>
  ): RageValue {
    // Create new environment with closure as parent
    const fnEnv = new Environment(fn.closure as Environment);
    
    // First, bind positional arguments
    for (let i = 0; i < fn.parameters.length; i++) {
      fnEnv.define(fn.parameters[i], positionalArgs[i] ?? null);
    }
    
    // Then, override with keyword arguments
    for (const [name, value] of keywordArgs) {
      if (!fn.parameters.includes(name)) {
        throw new Error(`Unknown keyword argument: ${name} for function ${fn.name}`);
      }
      fnEnv.define(name, value);
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

    if (object === null) {
      throw new Error('Cannot access property on null');
    }

    if (isPrototype(object)) {
      return object[property] ?? null;
    }

    throw new Error('Can only access properties on prototypes');
  }

  private evaluateIndex(expr: IndexExpression): RageValue {
    const object = this.evaluate(expr.object);
    const index = this.evaluate(expr.index);

    if (Array.isArray(object)) {
      let idx = Number(index) | 0;
      // Support negative indexing like Python
      if (idx < 0) idx = object.length + idx;
      return object[idx] ?? null;
    }

    if (typeof object === 'string') {
      let idx = Number(index) | 0;
      if (idx < 0) idx = object.length + idx;
      return object[idx] ?? null;
    }

    if (isPrototype(object)) {
      return object[String(index)] ?? null;
    }

    throw new Error('Can only index into arrays, strings, or prototypes');
  }

  private evaluateSlice(expr: SliceExpression): RageValue {
    const object = this.evaluate(expr.object);
    const startVal = expr.start ? this.evaluate(expr.start) : null;
    const endVal = expr.end ? this.evaluate(expr.end) : null;

    // Helper to normalize index (handle negative values)
    const normalizeIndex = (idx: number | null, length: number, isEnd: boolean): number => {
      if (idx === null) {
        return isEnd ? length : 0;
      }
      let n = idx | 0;
      if (n < 0) {
        n = length + n;
      }
      // Clamp to valid range
      return Math.max(0, Math.min(length, n));
    };

    if (Array.isArray(object)) {
      const start = normalizeIndex(startVal !== null ? Number(startVal) : null, object.length, false);
      const end = normalizeIndex(endVal !== null ? Number(endVal) : null, object.length, true);
      return object.slice(start, end);
    }

    if (typeof object === 'string') {
      const start = normalizeIndex(startVal !== null ? Number(startVal) : null, object.length, false);
      const end = normalizeIndex(endVal !== null ? Number(endVal) : null, object.length, true);
      return object.slice(start, end);
    }

    throw new Error('Can only slice arrays or strings');
  }

  private evaluateAssignment(expr: AssignmentExpression): RageValue {
    const rightValue = this.evaluate(expr.right);
    
    // Get the current value for compound assignments
    let currentValue: RageValue = null;
    if (expr.operator !== '=') {
      if (expr.left.type === 'Identifier') {
        currentValue = this.currentEnv.get((expr.left as Identifier).name);
      } else if (expr.left.type === 'MemberExpression') {
        currentValue = this.evaluateMember(expr.left as MemberExpression);
      } else if (expr.left.type === 'IndexExpression') {
        currentValue = this.evaluateIndex(expr.left as IndexExpression);
      }
    }

    // Calculate the new value based on operator
    let value: RageValue;
    switch (expr.operator) {
      case '=':
        value = rightValue;
        break;
      case '+=':
        if (typeof currentValue === 'string' || typeof rightValue === 'string') {
          value = String(currentValue) + String(rightValue);
        } else {
          value = (currentValue as number) + (rightValue as number);
        }
        break;
      case '-=':
        value = (currentValue as number) - (rightValue as number);
        break;
      case '*=':
        value = (currentValue as number) * (rightValue as number);
        break;
      case '/=':
        value = (currentValue as number) / (rightValue as number);
        break;
      case '%=':
        value = (currentValue as number) % (rightValue as number);
        break;
      case '&=':
        value = (currentValue as number) & (rightValue as number);
        break;
      case '|=':
        value = (currentValue as number) | (rightValue as number);
        break;
      case '^=':
        value = (currentValue as number) ^ (rightValue as number);
        break;
      default:
        throw new Error(`Unknown assignment operator: ${expr.operator}`);
    }

    // Assign the value
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

  private evaluateUpdate(expr: UpdateExpression): RageValue {
    // Get current value
    let currentValue: RageValue;
    if (expr.argument.type === 'Identifier') {
      currentValue = this.currentEnv.get((expr.argument as Identifier).name);
    } else if (expr.argument.type === 'MemberExpression') {
      currentValue = this.evaluateMember(expr.argument as MemberExpression);
    } else {
      currentValue = this.evaluateIndex(expr.argument as IndexExpression);
    }

    if (typeof currentValue !== 'number') {
      throw new Error('Increment/decrement requires a number');
    }

    // Calculate new value
    const newValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;

    // Assign new value
    if (expr.argument.type === 'Identifier') {
      this.currentEnv.set((expr.argument as Identifier).name, newValue);
    } else if (expr.argument.type === 'MemberExpression') {
      const memberExpr = expr.argument as MemberExpression;
      const object = this.evaluate(memberExpr.object);
      if (isPrototype(object)) {
        object[memberExpr.property.name] = newValue;
      } else {
        throw new Error('Can only set properties on prototypes');
      }
    } else {
      const indexExpr = expr.argument as IndexExpression;
      const object = this.evaluate(indexExpr.object);
      const index = this.evaluate(indexExpr.index);
      if (Array.isArray(object)) {
        object[Number(index) | 0] = newValue;
      } else if (isPrototype(object)) {
        object[String(index)] = newValue;
      } else {
        throw new Error('Can only index-assign to arrays or prototypes');
      }
    }

    // Return old or new value depending on prefix/postfix
    return expr.prefix ? newValue : currentValue;
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
    this.frameCount = 0;

    // Re-add builtins
    for (const [name, fn] of this.builtins) {
      this.globalEnv.define(name, fn);
    }
  }
}
