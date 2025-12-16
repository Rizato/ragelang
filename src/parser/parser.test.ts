import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/lexer.js';
import { Parser } from './parser.js';
import {
  Program,
  VariableDeclaration,
  ExpressionStatement,
  CallExpression,
  BinaryExpression,
  NumberLiteral,
  StringLiteral,
  Identifier,
  DrawBlock,
  UpdateBlock,
  IfStatement,
} from './ast.js';

function parse(source: string): Program {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('Parser', () => {
  it('should parse variable declarations', () => {
    const ast = parse('x = 42');

    expect(ast.body).toHaveLength(1);
    const decl = ast.body[0] as VariableDeclaration;
    expect(decl.type).toBe('VariableDeclaration');
    expect(decl.name).toBe('x');
    expect((decl.init as NumberLiteral).value).toBe(42);
  });

  it('should parse string literals', () => {
    const ast = parse('message = "Hello"');

    const decl = ast.body[0] as VariableDeclaration;
    expect(decl.type).toBe('VariableDeclaration');
    expect((decl.init as StringLiteral).value).toBe('Hello');
  });

  it('should parse function calls', () => {
    const ast = parse('print("Hello", 42)');

    const stmt = ast.body[0] as ExpressionStatement;
    const call = stmt.expression as CallExpression;
    expect(call.type).toBe('CallExpression');
    expect((call.callee as Identifier).name).toBe('print');
    expect(call.arguments).toHaveLength(2);
  });

  it('should parse binary expressions', () => {
    const ast = parse('result = 2 + 3 * 4');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    expect(expr.type).toBe('BinaryExpression');
    expect(expr.operator).toBe('+');
    
    // Right side should be 3 * 4 due to precedence
    const right = expr.right as BinaryExpression;
    expect(right.operator).toBe('*');
  });

  it('should parse comparison expressions', () => {
    const ast = parse('result = x > 10');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    expect(expr.operator).toBe('>');
  });

  it('should parse prototype creation', () => {
    const ast = parse('player = prototype()');

    const decl = ast.body[0] as VariableDeclaration;
    expect(decl.init.type).toBe('PrototypeExpression');
  });

  it('should parse member expressions', () => {
    const ast = parse('player.x = 100');

    const stmt = ast.body[0] as ExpressionStatement;
    expect(stmt.expression.type).toBe('AssignmentExpression');
  });

  it('should parse draw blocks', () => {
    const ast = parse('draw { clear() }');

    const block = ast.body[0] as DrawBlock;
    expect(block.type).toBe('DrawBlock');
    expect(block.body.body).toHaveLength(1);
  });

  it('should parse update blocks with parameter', () => {
    const ast = parse('update(dt) { x = x + dt }');

    const block = ast.body[0] as UpdateBlock;
    expect(block.type).toBe('UpdateBlock');
    expect(block.parameter).toBe('dt');
    expect(block.body.body).toHaveLength(1);
  });

  it('should parse if statements', () => {
    const ast = parse('if (x > 10) { y = 1 }');

    const stmt = ast.body[0] as IfStatement;
    expect(stmt.type).toBe('IfStatement');
    expect(stmt.consequent.body).toHaveLength(1);
    expect(stmt.alternate).toBeNull();
  });

  it('should parse if-else statements', () => {
    const ast = parse('if (x > 10) { y = 1 } else { y = 0 }');

    const stmt = ast.body[0] as IfStatement;
    expect(stmt.type).toBe('IfStatement');
    expect(stmt.alternate).not.toBeNull();
    expect(stmt.alternate!.type).toBe('BlockStatement');
  });

  it('should parse if-else-if chains', () => {
    const ast = parse('if (x > 10) { y = 1 } else if (x > 5) { y = 2 } else { y = 0 }');

    const stmt = ast.body[0] as IfStatement;
    expect(stmt.type).toBe('IfStatement');
    expect(stmt.alternate).not.toBeNull();
    expect(stmt.alternate!.type).toBe('IfStatement');
  });

  it('should parse unary expressions', () => {
    const ast = parse('x = -5');

    const decl = ast.body[0] as VariableDeclaration;
    expect(decl.init.type).toBe('UnaryExpression');
  });

  it('should parse logical expressions', () => {
    const ast = parse('result = x and y or z');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    // 'or' has lower precedence than 'and'
    expect(expr.operator).toBe('or');
  });

  it('should parse parenthesized expressions', () => {
    const ast = parse('result = (2 + 3) * 4');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    expect(expr.operator).toBe('*');
    expect((expr.left as BinaryExpression).operator).toBe('+');
  });

  it('should parse a complete program', () => {
    const source = `
player = prototype()
player.x = 100
player.y = 200
gravity = 9.8

draw {
  clear("#000000")
  text("Hello", player.x, player.y, "#ffffff")
}

update(dt) {
  player.y = player.y + gravity * dt
}
`;
    const ast = parse(source);

    // Should have: player decl, player.x, player.y, gravity, draw block, update block
    expect(ast.body.length).toBeGreaterThanOrEqual(5);
  });

  it('should handle empty programs', () => {
    const ast = parse('');
    expect(ast.body).toHaveLength(0);
  });

  it('should parse boolean literals', () => {
    const ast = parse('enabled = true');

    const decl = ast.body[0] as VariableDeclaration;
    expect(decl.init.type).toBe('BooleanLiteral');
  });

  it('should parse method calls on objects', () => {
    const ast = parse('obj.method(1, 2)');

    const stmt = ast.body[0] as ExpressionStatement;
    const call = stmt.expression as CallExpression;
    expect(call.type).toBe('CallExpression');
    expect(call.callee.type).toBe('MemberExpression');
  });
});

