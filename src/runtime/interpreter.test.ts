import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lexer } from '../lexer/lexer.js';
import { Parser } from '../parser/parser.js';
import { Interpreter } from './interpreter.js';
import { CanvasRenderer } from '../renderer/canvas.js';

function createInterpreter() {
  const renderer = new CanvasRenderer(null, { width: 800, height: 600 });
  return new Interpreter(renderer);
}

function runProgram(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const interpreter = createInterpreter();
  interpreter.run(ast);
  return interpreter;
}

describe('Interpreter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute variable declarations', () => {
    const interpreter = runProgram('x = 42');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(42);
  });

  it('should execute string variable declarations', () => {
    const interpreter = runProgram('message = "Hello"');
    const env = interpreter.getEnvironment();
    expect(env.get('message')).toBe('Hello');
  });

  it('should evaluate arithmetic expressions', () => {
    const interpreter = runProgram('result = 2 + 3 * 4');
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(14);
  });

  it('should handle operator precedence', () => {
    const interpreter = runProgram('result = (2 + 3) * 4');
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(20);
  });

  it('should execute prototype creation', () => {
    const interpreter = runProgram('player = prototype()');
    const env = interpreter.getEnvironment();
    const player = env.get('player');
    expect(player).toHaveProperty('__type', 'prototype');
  });

  it('should set and get prototype properties', () => {
    const interpreter = runProgram(`
player = prototype()
player.x = 100
player.y = 200
`);
    const env = interpreter.getEnvironment();
    const player = env.get('player') as Record<string, unknown>;
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
  });

  it('should evaluate comparison expressions', () => {
    const interpreter = runProgram(`
a = 5 > 3
b = 5 < 3
c = 5 == 5
d = 5 != 5
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(true);
    expect(env.get('b')).toBe(false);
    expect(env.get('c')).toBe(true);
    expect(env.get('d')).toBe(false);
  });

  it('should evaluate logical expressions', () => {
    const interpreter = runProgram(`
a = true and true
b = true and false
c = true or false
d = false or false
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(true);
    expect(env.get('b')).toBe(false);
    expect(env.get('c')).toBe(true);
    expect(env.get('d')).toBe(false);
  });

  it('should execute if statements', () => {
    const interpreter = runProgram(`
x = 10
if (x > 5) {
  result = 1
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(1);
  });

  it('should execute else branches', () => {
    const interpreter = runProgram(`
x = 3
if (x > 5) {
  result = 1
} else {
  result = 0
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(0);
  });

  it('should execute else-if chains', () => {
    const interpreter = runProgram(`
x = 7
if (x > 10) {
  result = 2
} else if (x > 5) {
  result = 1
} else {
  result = 0
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(1);
  });

  it('should call builtin math functions', () => {
    const interpreter = runProgram(`
a = abs(-5)
b = floor(3.7)
c = ceil(3.2)
d = round(3.5)
e = min(3, 5)
f = max(3, 5)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(5);
    expect(env.get('b')).toBe(3);
    expect(env.get('c')).toBe(4);
    expect(env.get('d')).toBe(4);
    expect(env.get('e')).toBe(3);
    expect(env.get('f')).toBe(5);
  });

  it('should call trigonometric functions', () => {
    const interpreter = runProgram(`
a = sin(0)
b = cos(0)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(0);
    expect(env.get('b')).toBe(1);
  });

  it('should call utility functions', () => {
    const interpreter = runProgram(`
a = lerp(0, 10, 0.5)
b = clamp(15, 0, 10)
c = sign(-5)
d = distance(0, 0, 3, 4)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(5);
    expect(env.get('b')).toBe(10);
    expect(env.get('c')).toBe(-1);
    expect(env.get('d')).toBe(5);
  });

  it('should handle unary operators', () => {
    const interpreter = runProgram(`
a = -5
b = !true
c = !false
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(-5);
    expect(env.get('b')).toBe(false);
    expect(env.get('c')).toBe(true);
  });

  it('should handle string concatenation', () => {
    const interpreter = runProgram(`
a = "Hello" + " " + "World"
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe('Hello World');
  });

  it('should handle modulo operator', () => {
    const interpreter = runProgram(`
a = 10 % 3
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(1);
  });

  it('should execute print function', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    runProgram('print("Hello", 42)');
    expect(consoleSpy).toHaveBeenCalledWith('Hello', '42');
  });

  it('should handle draw blocks', () => {
    const interpreter = runProgram(`
draw {
  x = 1
}
`);
    // Draw block should be registered but not immediately executed
    expect(interpreter).toBeDefined();
  });

  it('should handle update blocks', () => {
    const interpreter = runProgram(`
update(dt) {
  x = dt
}
`);
    // Update block should be registered but not immediately executed
    expect(interpreter).toBeDefined();
  });

  it('should reset interpreter state', () => {
    const interpreter = runProgram('x = 42');
    interpreter.reset();
    // After reset, custom variables should be gone
    expect(() => interpreter.getEnvironment().get('x')).toThrow();
  });

  it('should handle rect_overlap collision detection', () => {
    const interpreter = runProgram(`
// Overlapping rectangles
a = rect_overlap(0, 0, 10, 10, 5, 5, 10, 10)
// Non-overlapping rectangles
b = rect_overlap(0, 0, 10, 10, 20, 20, 10, 10)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(true);
    expect(env.get('b')).toBe(false);
  });

  it('should handle sqrt and pow', () => {
    const interpreter = runProgram(`
a = sqrt(16)
b = pow(2, 3)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(4);
    expect(env.get('b')).toBe(8);
  });

  it('should handle random function', () => {
    const interpreter = runProgram(`
a = random()
`);
    const env = interpreter.getEnvironment();
    const value = env.get('a') as number;
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('should handle boolean literals', () => {
    const interpreter = runProgram(`
a = true
b = false
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(true);
    expect(env.get('b')).toBe(false);
  });

  it('should handle nested member expressions', () => {
    const interpreter = runProgram(`
obj = prototype()
obj.nested = prototype()
obj.nested.value = 42
result = obj.nested.value
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(42);
  });
});

