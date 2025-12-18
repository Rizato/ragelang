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
  FunctionDeclaration,
  LoopStatement,
  ArrayLiteral,
  ObjectLiteral,
  IndexExpression,
  EnumDeclaration,
  MatchExpression,
  AssignmentExpression,
  ReturnStatement,
  SliceExpression,
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

  // ============ FUNCTION DECLARATIONS ============

  it('should parse function declarations with fun keyword', () => {
    const ast = parse('fun add(a, b) { return a + b }');

    const func = ast.body[0] as FunctionDeclaration;
    expect(func.type).toBe('FunctionDeclaration');
    expect(func.name).toBe('add');
    expect(func.parameters).toEqual(['a', 'b']);
    expect(func.body.body).toHaveLength(1);
  });

  it('should parse function with no parameters', () => {
    const ast = parse('fun greet() { return "hello" }');

    const func = ast.body[0] as FunctionDeclaration;
    expect(func.type).toBe('FunctionDeclaration');
    expect(func.name).toBe('greet');
    expect(func.parameters).toEqual([]);
  });

  it('should parse return statement', () => {
    const ast = parse('fun test() { return 42 }');

    const func = ast.body[0] as FunctionDeclaration;
    const ret = func.body.body[0] as ReturnStatement;
    expect(ret.type).toBe('ReturnStatement');
    expect((ret.argument as NumberLiteral).value).toBe(42);
  });

  // ============ LOOP STATEMENTS ============

  it('should parse loop statements', () => {
    const ast = parse('loop { x = x + 1 }');

    const loop = ast.body[0] as LoopStatement;
    expect(loop.type).toBe('LoopStatement');
    expect(loop.body.body).toHaveLength(1);
  });

  it('should parse loop with break', () => {
    const ast = parse('loop { if (x > 10) { break } }');

    const loop = ast.body[0] as LoopStatement;
    expect(loop.type).toBe('LoopStatement');
    const ifStmt = loop.body.body[0] as IfStatement;
    expect(ifStmt.type).toBe('IfStatement');
  });

  // ============ ARRAY LITERALS ============

  it('should parse array literals', () => {
    const ast = parse('arr = [1, 2, 3]');

    const decl = ast.body[0] as VariableDeclaration;
    const arr = decl.init as ArrayLiteral;
    expect(arr.type).toBe('ArrayLiteral');
    expect(arr.elements).toHaveLength(3);
  });

  it('should parse empty array', () => {
    const ast = parse('arr = []');

    const decl = ast.body[0] as VariableDeclaration;
    const arr = decl.init as ArrayLiteral;
    expect(arr.type).toBe('ArrayLiteral');
    expect(arr.elements).toHaveLength(0);
  });

  it('should parse nested arrays', () => {
    const ast = parse('matrix = [[1, 2], [3, 4]]');

    const decl = ast.body[0] as VariableDeclaration;
    const arr = decl.init as ArrayLiteral;
    expect(arr.type).toBe('ArrayLiteral');
    expect(arr.elements).toHaveLength(2);
    expect((arr.elements[0] as ArrayLiteral).type).toBe('ArrayLiteral');
  });

  // ============ INDEX EXPRESSIONS ============

  it('should parse array index access', () => {
    const ast = parse('x = arr[0]');

    const decl = ast.body[0] as VariableDeclaration;
    const idx = decl.init as IndexExpression;
    expect(idx.type).toBe('IndexExpression');
    expect((idx.object as Identifier).name).toBe('arr');
    expect((idx.index as NumberLiteral).value).toBe(0);
  });

  it('should parse chained index access', () => {
    const ast = parse('x = matrix[0][1]');

    const decl = ast.body[0] as VariableDeclaration;
    const idx = decl.init as IndexExpression;
    expect(idx.type).toBe('IndexExpression');
    expect((idx.object as IndexExpression).type).toBe('IndexExpression');
  });

  it('should parse index assignment', () => {
    const ast = parse('arr[0] = 99');

    const stmt = ast.body[0] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.type).toBe('AssignmentExpression');
    expect((assign.left as IndexExpression).type).toBe('IndexExpression');
  });

  // ============ COMPOUND ASSIGNMENT ============

  it('should parse compound assignment +=', () => {
    const ast = parse('x = 5\nx += 3');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.type).toBe('AssignmentExpression');
    expect(assign.operator).toBe('+=');
    expect((assign.left as Identifier).name).toBe('x');
  });

  it('should parse compound assignment -=', () => {
    const ast = parse('x = 5\nx -= 3');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.operator).toBe('-=');
  });

  it('should parse compound assignment *=', () => {
    const ast = parse('x = 5\nx *= 2');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.operator).toBe('*=');
  });

  it('should parse compound assignment /=', () => {
    const ast = parse('x = 10\nx /= 2');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.operator).toBe('/=');
  });

  it('should parse compound assignment %=', () => {
    const ast = parse('x = 10\nx %= 3');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.operator).toBe('%=');
  });

  it('should parse compound assignment &=', () => {
    const ast = parse('x = 7\nx &= 3');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.operator).toBe('&=');
  });

  it('should parse compound assignment |=', () => {
    const ast = parse('x = 4\nx |= 2');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.operator).toBe('|=');
  });

  it('should parse compound assignment ^=', () => {
    const ast = parse('x = 5\nx ^= 3');

    const stmt = ast.body[1] as ExpressionStatement;
    const assign = stmt.expression as AssignmentExpression;
    expect(assign.operator).toBe('^=');
  });

  // ============ INCREMENT/DECREMENT ============

  it('should parse prefix increment', () => {
    const ast = parse('x = 5\ny = ++x');

    const decl = ast.body[1] as VariableDeclaration;
    expect(decl.init.type).toBe('UpdateExpression');
    expect((decl.init as any).operator).toBe('++');
    expect((decl.init as any).prefix).toBe(true);
  });

  it('should parse postfix increment', () => {
    const ast = parse('x = 5\ny = x++');

    const decl = ast.body[1] as VariableDeclaration;
    expect(decl.init.type).toBe('UpdateExpression');
    expect((decl.init as any).operator).toBe('++');
    expect((decl.init as any).prefix).toBe(false);
  });

  it('should parse prefix decrement', () => {
    const ast = parse('x = 5\ny = --x');

    const decl = ast.body[1] as VariableDeclaration;
    expect(decl.init.type).toBe('UpdateExpression');
    expect((decl.init as any).operator).toBe('--');
    expect((decl.init as any).prefix).toBe(true);
  });

  it('should parse postfix decrement', () => {
    const ast = parse('x = 5\ny = x--');

    const decl = ast.body[1] as VariableDeclaration;
    expect(decl.init.type).toBe('UpdateExpression');
    expect((decl.init as any).operator).toBe('--');
    expect((decl.init as any).prefix).toBe(false);
  });

  // ============ SLICE EXPRESSIONS ============

  it('should parse slice with start and end', () => {
    const ast = parse('x = arr[1:3]');

    const decl = ast.body[0] as VariableDeclaration;
    const slice = decl.init as SliceExpression;
    expect(slice.type).toBe('SliceExpression');
    expect((slice.start as NumberLiteral).value).toBe(1);
    expect((slice.end as NumberLiteral).value).toBe(3);
  });

  it('should parse slice with only start', () => {
    const ast = parse('x = arr[2:]');

    const decl = ast.body[0] as VariableDeclaration;
    const slice = decl.init as SliceExpression;
    expect(slice.type).toBe('SliceExpression');
    expect((slice.start as NumberLiteral).value).toBe(2);
    expect(slice.end).toBeNull();
  });

  it('should parse slice with only end', () => {
    const ast = parse('x = arr[:3]');

    const decl = ast.body[0] as VariableDeclaration;
    const slice = decl.init as SliceExpression;
    expect(slice.type).toBe('SliceExpression');
    expect(slice.start).toBeNull();
    expect((slice.end as NumberLiteral).value).toBe(3);
  });

  it('should parse full slice', () => {
    const ast = parse('x = arr[:]');

    const decl = ast.body[0] as VariableDeclaration;
    const slice = decl.init as SliceExpression;
    expect(slice.type).toBe('SliceExpression');
    expect(slice.start).toBeNull();
    expect(slice.end).toBeNull();
  });

  // ============ OBJECT LITERALS ============

  it('should parse object literals', () => {
    const ast = parse('obj = {x: 1, y: 2}');

    const decl = ast.body[0] as VariableDeclaration;
    const obj = decl.init as ObjectLiteral;
    expect(obj.type).toBe('ObjectLiteral');
    expect(obj.properties).toHaveLength(2);
    expect(obj.properties[0].key).toBe('x');
    expect(obj.properties[1].key).toBe('y');
  });

  it('should parse empty object literal', () => {
    const ast = parse('obj = {}');

    const decl = ast.body[0] as VariableDeclaration;
    const obj = decl.init as ObjectLiteral;
    expect(obj.type).toBe('ObjectLiteral');
    expect(obj.properties).toHaveLength(0);
  });

  it('should parse nested object literals', () => {
    const ast = parse('obj = {pos: {x: 0, y: 0}, size: 10}');

    const decl = ast.body[0] as VariableDeclaration;
    const obj = decl.init as ObjectLiteral;
    expect(obj.type).toBe('ObjectLiteral');
    expect(obj.properties).toHaveLength(2);
    expect((obj.properties[0].value as ObjectLiteral).type).toBe('ObjectLiteral');
  });

  // ============ ENUM DECLARATIONS ============

  it('should parse enum with unit variants', () => {
    const ast = parse('enum State { Idle, Walking, Running }');

    const enumDecl = ast.body[0] as EnumDeclaration;
    expect(enumDecl.type).toBe('EnumDeclaration');
    expect(enumDecl.name).toBe('State');
    expect(enumDecl.variants).toHaveLength(3);
    expect(enumDecl.variants[0].name).toBe('Idle');
    expect(enumDecl.variants[0].fields).toHaveLength(0);
  });

  it('should parse enum with data variants', () => {
    const ast = parse('enum Message { Text(content), Number(value) }');

    const enumDecl = ast.body[0] as EnumDeclaration;
    expect(enumDecl.type).toBe('EnumDeclaration');
    expect(enumDecl.name).toBe('Message');
    expect(enumDecl.variants).toHaveLength(2);
    expect(enumDecl.variants[0].name).toBe('Text');
    expect(enumDecl.variants[0].fields).toEqual(['content']);
    expect(enumDecl.variants[1].name).toBe('Number');
    expect(enumDecl.variants[1].fields).toEqual(['value']);
  });

  it('should parse enum with mixed variants', () => {
    const ast = parse('enum Event { Start, Stop, Pause(reason), Resume }');

    const enumDecl = ast.body[0] as EnumDeclaration;
    expect(enumDecl.variants).toHaveLength(4);
    expect(enumDecl.variants[0].fields).toHaveLength(0);  // Start
    expect(enumDecl.variants[2].fields).toEqual(['reason']);  // Pause
  });

  // ============ MATCH EXPRESSIONS ============

  it('should parse match expression with unit patterns', () => {
    const ast = parse(`
result = match state {
  Idle => 0,
  Walking => 1,
  Running => 2
}
`);

    const decl = ast.body[0] as VariableDeclaration;
    const match = decl.init as MatchExpression;
    expect(match.type).toBe('MatchExpression');
    expect(match.arms).toHaveLength(3);
  });

  it('should parse match with wildcard pattern', () => {
    const ast = parse(`
result = match x {
  1 => "one",
  _ => "other"
}
`);

    const decl = ast.body[0] as VariableDeclaration;
    const match = decl.init as MatchExpression;
    expect(match.type).toBe('MatchExpression');
    expect(match.arms).toHaveLength(2);
    expect(match.arms[1].pattern.type).toBe('WildcardPattern');
  });

  it('should parse match with destructuring pattern', () => {
    const ast = parse(`
result = match msg {
  Text(content) => content,
  Number(n) => n
}
`);

    const decl = ast.body[0] as VariableDeclaration;
    const match = decl.init as MatchExpression;
    expect(match.arms[0].pattern.type).toBe('VariantPattern');
  });

  it('should parse match with literal patterns', () => {
    const ast = parse(`
name = match code {
  200 => "ok",
  404 => "not found",
  _ => "error"
}
`);

    const decl = ast.body[0] as VariableDeclaration;
    const match = decl.init as MatchExpression;
    expect(match.arms[0].pattern.type).toBe('LiteralPattern');
    expect(match.arms[1].pattern.type).toBe('LiteralPattern');
    expect(match.arms[2].pattern.type).toBe('WildcardPattern');
  });

  // ============ MATCH WITH BLOCK BODIES ============

  it('should parse match arm with block body containing statements', () => {
    const ast = parse(`
match state {
  Active => {
    message = "Processing"
    counter = counter + 1
  },
  _ => {}
}
`);

    const stmt = ast.body[0] as ExpressionStatement;
    const match = stmt.expression as MatchExpression;
    expect(match.type).toBe('MatchExpression');
    expect(match.arms).toHaveLength(2);
    
    // First arm should have a BlockStatement body
    expect(match.arms[0].body.type).toBe('BlockStatement');
    const blockBody = match.arms[0].body as any;
    expect(blockBody.body).toHaveLength(2);
    
    // Second arm should also be a BlockStatement (empty)
    expect(match.arms[1].body.type).toBe('BlockStatement');
  });

  it('should parse match arm with expression body (object literal)', () => {
    const ast = parse(`
result = match state {
  Init => { x: 0, y: 0 },
  Active => { x: 100, y: 200 },
  _ => { x: -1, y: -1 }
}
`);

    const decl = ast.body[0] as VariableDeclaration;
    const match = decl.init as MatchExpression;
    expect(match.type).toBe('MatchExpression');
    
    // All arms should have ObjectLiteral bodies
    expect(match.arms[0].body.type).toBe('ObjectLiteral');
    expect(match.arms[1].body.type).toBe('ObjectLiteral');
    expect(match.arms[2].body.type).toBe('ObjectLiteral');
  });

  it('should distinguish block from object literal in match arms', () => {
    const ast = parse(`
match mode {
  A => { foo = bar },
  B => { key: value }
}
`);

    const stmt = ast.body[0] as ExpressionStatement;
    const match = stmt.expression as MatchExpression;
    
    // First arm: { foo = bar } is an assignment, so it's a block
    expect(match.arms[0].body.type).toBe('BlockStatement');
    
    // Second arm: { key: value } is an object literal
    expect(match.arms[1].body.type).toBe('ObjectLiteral');
  });

  it('should parse match arm with block containing function calls', () => {
    const ast = parse(`
match menu_state {
  None => {
    message = "Height: " + height_cm + " cm"
    text(message, 20, 40, 24, "#FFFFFF")
  },
  _ => {}
}
`);

    const stmt = ast.body[0] as ExpressionStatement;
    const match = stmt.expression as MatchExpression;
    expect(match.arms[0].body.type).toBe('BlockStatement');
    
    const blockBody = match.arms[0].body as any;
    expect(blockBody.body).toHaveLength(2);
    expect(blockBody.body[0].type).toBe('VariableDeclaration'); // message = ...
    expect(blockBody.body[1].type).toBe('ExpressionStatement'); // text(...)
  });

  it('should parse match arm with block containing if statements', () => {
    const ast = parse(`
match state {
  Processing => {
    if (count > 0) {
      result = "has items"
    }
  },
  _ => {}
}
`);

    const stmt = ast.body[0] as ExpressionStatement;
    const match = stmt.expression as MatchExpression;
    expect(match.arms[0].body.type).toBe('BlockStatement');
    
    const blockBody = match.arms[0].body as any;
    expect(blockBody.body[0].type).toBe('IfStatement');
  });

  // ============ KEYWORD ARGUMENTS ============

  it('should parse function calls with keyword arguments', () => {
    const ast = parse('result = func(1, b=2, c=3)');

    const decl = ast.body[0] as VariableDeclaration;
    const call = decl.init as CallExpression;
    expect(call.type).toBe('CallExpression');
    expect(call.arguments).toHaveLength(3);
    // First arg is positional (name is null)
    expect(call.arguments[0].name).toBeNull();
    // Second and third are keyword args
    expect(call.arguments[1].name).toBe('b');
    expect(call.arguments[2].name).toBe('c');
  });

  it('should parse function calls with only keyword arguments', () => {
    const ast = parse('result = make(x=10, y=20)');

    const decl = ast.body[0] as VariableDeclaration;
    const call = decl.init as CallExpression;
    expect(call.arguments).toHaveLength(2);
    expect(call.arguments[0].name).toBe('x');
    expect(call.arguments[1].name).toBe('y');
  });

  // ============ OPERATORS ============

  it('should parse power operator with correct precedence', () => {
    const ast = parse('result = 2 ** 3 ** 2');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    // ** is right-associative
    expect(expr.operator).toBe('**');
  });

  it('should parse bitwise operators', () => {
    const ast = parse('result = a & b | c ^ d');

    const decl = ast.body[0] as VariableDeclaration;
    // Check that it parsed without error
    expect(decl.init.type).toBe('BinaryExpression');
  });

  it('should parse shift operators', () => {
    const ast = parse('result = x << 2 >> 1');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    expect(expr.operator).toBe('>>');
  });

  it('should parse C-style logical operators', () => {
    const ast = parse('result = x && y || z');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    expect(expr.operator).toBe('||');  // || has lower precedence than &&
  });

  // ============ COMPLETE PROGRAMS ============

  it('should parse a state machine program', () => {
    const source = `
enum PlayerState {
  Idle,
  Walking(speed),
  Jumping(velocity),
  Falling
}

state = PlayerState.Idle

update(dt) {
  result = match state {
    Idle => 0,
    Walking(s) => s,
    Jumping(v) => v,
    Falling => -10
  }
}
`;
    const ast = parse(source);
    expect(ast.body.length).toBeGreaterThanOrEqual(3);
  });

  it('should parse a function with arrays and objects', () => {
    const source = `
fun create_player(x, y) {
  return {
    pos: {x: x, y: y},
    inventory: [],
    health: 100
  }
}

players = []
`;
    const ast = parse(source);
    expect(ast.body).toHaveLength(2);
    expect((ast.body[0] as FunctionDeclaration).type).toBe('FunctionDeclaration');
  });

  // ============ NULL LITERAL ============

  it('should parse null literal', () => {
    const ast = parse('x = null');

    const decl = ast.body[0] as VariableDeclaration;
    expect(decl.type).toBe('VariableDeclaration');
    expect(decl.init.type).toBe('NullLiteral');
  });

  it('should parse null in comparison', () => {
    const ast = parse('result = x == null');

    const decl = ast.body[0] as VariableDeclaration;
    const expr = decl.init as BinaryExpression;
    expect(expr.type).toBe('BinaryExpression');
    expect(expr.operator).toBe('==');
    expect(expr.right.type).toBe('NullLiteral');
  });

  it('should parse null in match pattern', () => {
    const ast = parse(`
result = match value {
  null => "no value",
  _ => "has value"
}
`);

    const decl = ast.body[0] as VariableDeclaration;
    const match = decl.init as MatchExpression;
    expect(match.type).toBe('MatchExpression');
    expect(match.arms[0].pattern.type).toBe('LiteralPattern');
    expect((match.arms[0].pattern as any).value).toBe(null);
  });

  it('should parse null as function argument', () => {
    const ast = parse('foo(null, 42, null)');

    const stmt = ast.body[0] as ExpressionStatement;
    const call = stmt.expression as CallExpression;
    expect(call.arguments).toHaveLength(3);
    expect(call.arguments[0].value.type).toBe('NullLiteral');
    expect(call.arguments[2].value.type).toBe('NullLiteral');
  });

  it('should parse null in array literal', () => {
    const ast = parse('arr = [1, null, 3]');

    const decl = ast.body[0] as VariableDeclaration;
    const arr = decl.init as ArrayLiteral;
    expect(arr.type).toBe('ArrayLiteral');
    expect(arr.elements[1].type).toBe('NullLiteral');
  });

  it('should parse null in object literal', () => {
    const ast = parse('obj = {value: null}');

    const decl = ast.body[0] as VariableDeclaration;
    const obj = decl.init as ObjectLiteral;
    expect(obj.type).toBe('ObjectLiteral');
    expect(obj.properties[0].value.type).toBe('NullLiteral');
  });
});

