import {
  Program,
  Statement,
  Expression,
  DrawBlock,
  UpdateBlock,
  IfStatement,
  BlockStatement,
  ExpressionStatement,
  VariableDeclaration,
  AssignmentExpression,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  MemberExpression,
  Identifier,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
} from '../parser/ast.js';
import { CanvasRenderer } from '../renderer/canvas.js';
import {
  RageValue,
  RagePrototype,
  BuiltinFunction,
  createBuiltins,
  createPrototype,
  isPrototype,
} from './builtins.js';

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
  private renderer: CanvasRenderer;
  private builtins: Map<string, BuiltinFunction>;
  
  private drawBlock: DrawBlock | null = null;
  private updateBlock: UpdateBlock | null = null;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private running: boolean = false;

  constructor(renderer: CanvasRenderer) {
    this.renderer = renderer;
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
      this.executeBlock(this.updateBlock.body);
      this.currentEnv = prevEnv;
    }

    // Execute draw block if it exists
    if (this.drawBlock) {
      const drawEnv = new Environment(this.globalEnv);
      const prevEnv = this.currentEnv;
      this.currentEnv = drawEnv;
      this.executeBlock(this.drawBlock.body);
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
      case 'IfStatement':
        this.executeIf(stmt);
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

  private executeIf(stmt: IfStatement): void {
    const condition = this.evaluate(stmt.condition);
    
    if (this.isTruthy(condition)) {
      this.executeBlock(stmt.consequent);
    } else if (stmt.alternate) {
      if (stmt.alternate.type === 'IfStatement') {
        this.executeIf(stmt.alternate);
      } else {
        this.executeBlock(stmt.alternate);
      }
    }
  }

  private executeBlock(block: BlockStatement): void {
    const blockEnv = new Environment(this.currentEnv);
    const prevEnv = this.currentEnv;
    this.currentEnv = blockEnv;

    for (const stmt of block.body) {
      this.executeStatement(stmt);
    }

    this.currentEnv = prevEnv;
  }

  private executeVariableDeclaration(stmt: VariableDeclaration): void {
    const value = this.evaluate(stmt.init);
    this.currentEnv.define(stmt.name, value);
  }

  private evaluate(expr: Expression): RageValue {
    switch (expr.type) {
      case 'NumberLiteral':
        return (expr as NumberLiteral).value;
      case 'StringLiteral':
        return (expr as StringLiteral).value;
      case 'BooleanLiteral':
        return (expr as BooleanLiteral).value;
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
      case 'AssignmentExpression':
        return this.evaluateAssignment(expr as AssignmentExpression);
      default:
        throw new Error(`Unknown expression type: ${(expr as Expression).type}`);
    }
  }

  private evaluateBinary(expr: BinaryExpression): RageValue {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator) {
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
      case 'and':
        return this.isTruthy(left) && this.isTruthy(right);
      case 'or':
        return this.isTruthy(left) || this.isTruthy(right);
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
      default:
        throw new Error(`Unknown unary operator: ${expr.operator}`);
    }
  }

  private evaluateCall(expr: CallExpression): RageValue {
    const callee = this.evaluate(expr.callee);
    const args = expr.arguments.map(arg => this.evaluate(arg));

    if (typeof callee === 'function') {
      return callee(...args);
    }

    throw new Error('Can only call functions');
  }

  private evaluateMember(expr: MemberExpression): RageValue {
    const object = this.evaluate(expr.object);
    const property = expr.property.name;

    if (isPrototype(object)) {
      return object[property] ?? null;
    }

    throw new Error('Can only access properties on prototypes');
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

