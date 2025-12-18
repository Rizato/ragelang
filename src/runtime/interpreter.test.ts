import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lexer } from '../lexer/lexer.js';
import { Parser } from '../parser/parser.js';
import { Interpreter } from './interpreter.js';
import { CanvasRenderer } from '../renderer/canvas.js';
import { RagePrototype } from './builtins.js';

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

  // ============ COMPOUND ASSIGNMENT ============

  it('should execute += compound assignment', () => {
    const interpreter = runProgram('x = 5\nx += 3');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(8);
  });

  it('should execute -= compound assignment', () => {
    const interpreter = runProgram('x = 10\nx -= 3');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(7);
  });

  it('should execute *= compound assignment', () => {
    const interpreter = runProgram('x = 5\nx *= 4');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(20);
  });

  it('should execute /= compound assignment', () => {
    const interpreter = runProgram('x = 20\nx /= 4');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(5);
  });

  it('should execute %= compound assignment', () => {
    const interpreter = runProgram('x = 17\nx %= 5');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(2);
  });

  it('should execute &= compound assignment', () => {
    const interpreter = runProgram('x = 7\nx &= 3');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(3); // 0111 & 0011 = 0011
  });

  it('should execute |= compound assignment', () => {
    const interpreter = runProgram('x = 4\nx |= 2');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(6); // 0100 | 0010 = 0110
  });

  it('should execute ^= compound assignment', () => {
    const interpreter = runProgram('x = 5\nx ^= 3');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(6); // 0101 ^ 0011 = 0110
  });

  it('should execute += for string concatenation', () => {
    const interpreter = runProgram('s = "Hello"\ns += " World"');
    const env = interpreter.getEnvironment();
    expect(env.get('s')).toBe('Hello World');
  });

  it('should execute compound assignment on member expressions', () => {
    const interpreter = runProgram(`
      obj = prototype()
      obj.x = 5
      obj.x += 3
    `);
    const env = interpreter.getEnvironment();
    const obj = env.get('obj') as any;
    expect(obj.x).toBe(8);
  });

  it('should execute compound assignment on index expressions', () => {
    const interpreter = runProgram(`
      arr = [1, 2, 3]
      arr[1] += 10
    `);
    const env = interpreter.getEnvironment();
    const arr = env.get('arr') as number[];
    expect(arr[1]).toBe(12);
  });

  // ============ INCREMENT/DECREMENT ============

  it('should execute prefix increment', () => {
    const interpreter = runProgram('x = 5\ny = ++x');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(6);
    expect(env.get('y')).toBe(6);
  });

  it('should execute postfix increment', () => {
    const interpreter = runProgram('x = 5\ny = x++');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(6);
    expect(env.get('y')).toBe(5);
  });

  it('should execute prefix decrement', () => {
    const interpreter = runProgram('x = 5\ny = --x');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(4);
    expect(env.get('y')).toBe(4);
  });

  it('should execute postfix decrement', () => {
    const interpreter = runProgram('x = 5\ny = x--');
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(4);
    expect(env.get('y')).toBe(5);
  });

  it('should execute increment on member expressions', () => {
    const interpreter = runProgram(`
      obj = prototype()
      obj.count = 10
      obj.count++
    `);
    const env = interpreter.getEnvironment();
    const obj = env.get('obj') as any;
    expect(obj.count).toBe(11);
  });

  it('should execute increment on array elements', () => {
    const interpreter = runProgram(`
      arr = [1, 2, 3]
      arr[0]++
    `);
    const env = interpreter.getEnvironment();
    const arr = env.get('arr') as number[];
    expect(arr[0]).toBe(2);
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

  // New operator tests
  it('should handle exponentiation operator **', () => {
    const interpreter = runProgram(`
a = 2 ** 3
b = 2 ** 10
c = 3 ** 0
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(8);
    expect(env.get('b')).toBe(1024);
    expect(env.get('c')).toBe(1);
  });

  it('should handle ** right associativity', () => {
    const interpreter = runProgram(`
a = 2 ** 3 ** 2
`);
    const env = interpreter.getEnvironment();
    // 2 ** (3 ** 2) = 2 ** 9 = 512
    expect(env.get('a')).toBe(512);
  });

  it('should handle && and || operators', () => {
    const interpreter = runProgram(`
a = true && true
b = true && false
c = false || true
d = false || false
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(true);
    expect(env.get('b')).toBe(false);
    expect(env.get('c')).toBe(true);
    expect(env.get('d')).toBe(false);
  });

  it('should handle bitwise AND operator &', () => {
    const interpreter = runProgram(`
a = 5 & 3
b = 12 & 10
c = 0xFF & 0x0F
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(1);  // 101 & 011 = 001
    expect(env.get('b')).toBe(8);  // 1100 & 1010 = 1000
    expect(env.get('c')).toBe(15); // 0x0F
  });

  it('should handle bitwise OR operator |', () => {
    const interpreter = runProgram(`
a = 5 | 3
b = 12 | 10
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(7);  // 101 | 011 = 111
    expect(env.get('b')).toBe(14); // 1100 | 1010 = 1110
  });

  it('should handle bitwise XOR operator ^', () => {
    const interpreter = runProgram(`
a = 5 ^ 3
b = 12 ^ 10
c = 7 ^ 7
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(6);  // 101 ^ 011 = 110
    expect(env.get('b')).toBe(6);  // 1100 ^ 1010 = 0110
    expect(env.get('c')).toBe(0);  // x ^ x = 0
  });

  it('should handle bitwise NOT operator ~', () => {
    const interpreter = runProgram(`
a = ~0
b = ~1
c = ~(-1)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(-1);
    expect(env.get('b')).toBe(-2);
    expect(env.get('c')).toBe(0);
  });

  it('should handle left shift operator <<', () => {
    const interpreter = runProgram(`
a = 1 << 4
b = 5 << 2
c = 1 << 0
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(16);
    expect(env.get('b')).toBe(20);
    expect(env.get('c')).toBe(1);
  });

  it('should handle right shift operator >>', () => {
    const interpreter = runProgram(`
a = 16 >> 4
b = 20 >> 2
c = 8 >> 3
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(1);
    expect(env.get('b')).toBe(5);
    expect(env.get('c')).toBe(1);
  });

  it('should handle array literals', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3]
`);
    const env = interpreter.getEnvironment();
    const arr = env.get('arr') as number[];
    expect(arr).toEqual([1, 2, 3]);
  });

  it('should handle array indexing', () => {
    const interpreter = runProgram(`
arr = [10, 20, 30]
a = arr[0]
b = arr[1]
c = arr[2]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(10);
    expect(env.get('b')).toBe(20);
    expect(env.get('c')).toBe(30);
  });

  it('should handle array index assignment', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3]
arr[1] = 99
result = arr[1]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(99);
  });

  it('should handle array length property', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3, 4, 5]
len = arr.length
`);
    const env = interpreter.getEnvironment();
    expect(env.get('len')).toBe(5);
  });

  it('should handle string indexing', () => {
    const interpreter = runProgram(`
s = "hello"
a = s[0]
b = s[4]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe('h');
    expect(env.get('b')).toBe('o');
  });

  it('should handle operator precedence correctly', () => {
    const interpreter = runProgram(`
// ** has higher precedence than *
a = 2 * 3 ** 2
// Bitwise has lower precedence than comparison
b = 1 | 2 == 2
// && has lower precedence than bitwise
c = 1 & 2 && 3
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(18); // 2 * (3 ** 2) = 2 * 9 = 18
  });

  it('should handle mixed logical operators', () => {
    const interpreter = runProgram(`
a = true && false || true
b = false || true && true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(true);  // (true && false) || true = true
    expect(env.get('b')).toBe(true);  // false || (true && true) = true
  });

  // User-defined functions tests
  it('should define and call a simple function', () => {
    const interpreter = runProgram(`
fun add(a, b) {
  return a + b
}
result = add(3, 5)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(8);
  });

  it('should handle functions with no parameters', () => {
    const interpreter = runProgram(`
fun getFortyTwo() {
  return 42
}
result = getFortyTwo()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(42);
  });

  it('should handle functions with no return value', () => {
    const interpreter = runProgram(`
x = 0
fun increment() {
  x = x + 1
}
increment()
increment()
increment()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(3);
  });

  it('should handle recursive functions', () => {
    const interpreter = runProgram(`
fun factorial(n) {
  if (n <= 1) {
    return 1
  }
  return n * factorial(n - 1)
}
result = factorial(5)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(120);
  });

  it('should handle closures', () => {
    const interpreter = runProgram(`
fun makeCounter() {
  count = 0
  fun increment() {
    count = count + 1
    return count
  }
  return increment
}
counter = makeCounter()
a = counter()
b = counter()
c = counter()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(1);
    expect(env.get('b')).toBe(2);
    expect(env.get('c')).toBe(3);
  });

  it('should handle loop with break', () => {
    const interpreter = runProgram(`
i = 0
sum = 0
loop {
  if (i >= 5) {
    break
  }
  sum = sum + i
  i = i + 1
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('sum')).toBe(10);  // 0+1+2+3+4 = 10
    expect(env.get('i')).toBe(5);
  });

  it('should handle nested loops', () => {
    const interpreter = runProgram(`
result = 0
i = 0
loop {
  if (i >= 3) { break }
  j = 0
  loop {
    if (j >= 3) { break }
    result = result + 1
    j = j + 1
  }
  i = i + 1
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(9);  // 3 * 3 = 9
  });

  it('should handle early return in functions', () => {
    const interpreter = runProgram(`
fun findFirst(arr, target) {
  i = 0
  loop {
    if (i >= arr.length) {
      return -1
    }
    if (arr[i] == target) {
      return i
    }
    i = i + 1
  }
}
arr = [10, 20, 30, 40, 50]
idx = findFirst(arr, 30)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('idx')).toBe(2);
  });

  it('should handle functions as first-class values', () => {
    const interpreter = runProgram(`
fun double(x) {
  return x * 2
}
fun triple(x) {
  return x * 3
}
fun apply(f, x) {
  return f(x)
}
a = apply(double, 5)
b = apply(triple, 5)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBe(10);
    expect(env.get('b')).toBe(15);
  });

  // Array builtin tests
  it('should create array with array(size) builtin', () => {
    const interpreter = runProgram(`
arr = array(5)
result = arr.length
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(5);
  });

  it('should create array with null values', () => {
    const interpreter = runProgram(`
arr = array(3)
first = arr[0]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('first')).toBe(null);
  });

  // Object literal tests
  it('should create object literals', () => {
    const interpreter = runProgram(`
obj = {name: "Alice", age: 30}
n = obj.name
a = obj.age
`);
    const env = interpreter.getEnvironment();
    expect(env.get('n')).toBe('Alice');
    expect(env.get('a')).toBe(30);
  });

  it('should create nested object literals', () => {
    const interpreter = runProgram(`
person = {
  name: "Bob",
  address: {city: "NYC", zip: 10001}
}
city = person.address.city
`);
    const env = interpreter.getEnvironment();
    expect(env.get('city')).toBe('NYC');
  });

  it('should create object literals with expressions', () => {
    const interpreter = runProgram(`
x = 10
obj = {value: x * 2, doubled: true}
v = obj.value
`);
    const env = interpreter.getEnvironment();
    expect(env.get('v')).toBe(20);
  });

  // Enum tests
  it('should define unit enum variants', () => {
    const interpreter = runProgram(`
enum Status { Idle, Running, Stopped }
s = Idle
`);
    const env = interpreter.getEnvironment();
    const s = env.get('s');
    expect(s).toHaveProperty('__type', 'enum_variant');
    expect(s).toHaveProperty('variantName', 'Idle');
  });

  it('should define data enum variants', () => {
    const interpreter = runProgram(`
enum Message { Text(content), Number(value) }
msg = Text("hello")
`);
    const env = interpreter.getEnvironment();
    const msg = env.get('msg');
    expect(msg).toHaveProperty('__type', 'enum_variant');
    expect(msg).toHaveProperty('variantName', 'Text');
  });

  it('should handle enum variants with multiple fields', () => {
    const interpreter = runProgram(`
enum Point { XY(x, y), XYZ(x, y, z) }
p = XY(10, 20)
`);
    const env = interpreter.getEnvironment();
    const p = env.get('p');
    expect(p).toHaveProperty('variantName', 'XY');
  });

  // Match expression tests
  it('should match literal patterns', () => {
    const interpreter = runProgram(`
x = 2
result = match x {
  1 => "one",
  2 => "two",
  _ => "other"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('two');
  });

  it('should match wildcard pattern', () => {
    const interpreter = runProgram(`
x = 999
result = match x {
  1 => "one",
  2 => "two",
  _ => "other"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('other');
  });

  it('should match and bind identifier pattern', () => {
    const interpreter = runProgram(`
x = 42
result = match x {
  n => n * 2
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(84);
  });

  it('should match unit enum variants', () => {
    const interpreter = runProgram(`
enum State { Idle, Active, Done }
s = Active
result = match s {
  Idle => "idle",
  Active => "active",
  Done => "done"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('active');
  });

  it('should match data enum variants with destructuring', () => {
    const interpreter = runProgram(`
enum Expr { Num(value), Add(left, right) }
e = Num(42)
result = match e {
  Num(v) => v,
  _ => 0
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(42);
  });

  it('should match string patterns', () => {
    const interpreter = runProgram(`
cmd = "quit"
result = match cmd {
  "start" => 1,
  "stop" => 2,
  "quit" => 3,
  _ => 0
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(3);
  });

  it('should match boolean patterns', () => {
    const interpreter = runProgram(`
flag = true
result = match flag {
  true => "yes",
  false => "no"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('yes');
  });

  it('should use match for state machine pattern', () => {
    const interpreter = runProgram(`
enum State { Idle, Running(speed), GameOver(score) }

fun get_message(state) {
  return match state {
    Idle => "Waiting to start",
    Running(s) => "Running at speed",
    GameOver(sc) => "Game over!"
  }
}

msg1 = get_message(Idle)
msg2 = get_message(Running(5))
msg3 = get_message(GameOver(100))
`);
    const env = interpreter.getEnvironment();
    expect(env.get('msg1')).toBe('Waiting to start');
    expect(env.get('msg2')).toBe('Running at speed');
    expect(env.get('msg3')).toBe('Game over!');
  });

  // ============ MATCH WITH BLOCK BODIES ============

  it('should execute match arm with block body', () => {
    const interpreter = runProgram(`
state = "active"
result = 0
message = ""

match state {
  "active" => {
    result = 42
    message = "is active"
  },
  _ => {
    result = -1
    message = "unknown"
  }
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(42);
    expect(env.get('message')).toBe('is active');
  });

  it('should execute match arm block with string concatenation', () => {
    const interpreter = runProgram(`
height_cm = 175
menu_state = "None"
message = ""

match menu_state {
  "None" => {
    message = "Height: " + height_cm + " cm"
  },
  _ => {}
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('message')).toBe('Height: 175 cm');
  });

  it('should execute match arm block with function calls', () => {
    const interpreter = runProgram(`
counter = 0
state = "increment"

fun add_one() {
  counter = counter + 1
}

match state {
  "increment" => {
    add_one()
    add_one()
    add_one()
  },
  _ => {}
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('counter')).toBe(3);
  });

  it('should execute match arm block with if statements', () => {
    const interpreter = runProgram(`
value = 15
result = ""

match true {
  true => {
    if (value > 10) {
      result = "big"
    } else {
      result = "small"
    }
  },
  _ => {}
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('big');
  });

  it('should execute match arm block with loops', () => {
    const interpreter = runProgram(`
mode = "loop"
sum = 0

match mode {
  "loop" => {
    i = 0
    loop {
      if (i >= 5) {
        break
      }
      sum = sum + i
      i = i + 1
    }
  },
  _ => {}
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('sum')).toBe(10); // 0+1+2+3+4
  });

  it('should handle empty block body in match arm', () => {
    const interpreter = runProgram(`
state = "other"
result = "unchanged"

match state {
  "active" => {
    result = "active"
  },
  _ => {}
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('unchanged');
  });

  it('should match enum with block body', () => {
    const interpreter = runProgram(`
enum Status { Loading, Ready, Error(code) }

status = Error(404)
message = ""
code_value = 0

match status {
  Loading => {
    message = "Please wait"
  },
  Ready => {
    message = "All set"
  },
  Error(c) => {
    message = "Error occurred"
    code_value = c
  }
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('message')).toBe('Error occurred');
    expect(env.get('code_value')).toBe(404);
  });

  // ============ TIME AND FRAMES BUILTINS ============

  it('should have time() function that returns a number', () => {
    const interpreter = runProgram(`
t = time()
is_positive = t > 0
`);
    const env = interpreter.getEnvironment();
    expect(typeof env.get('t')).toBe('number');
    expect(env.get('is_positive')).toBe(true);
  });

  it('should return time in seconds (reasonable range)', () => {
    const interpreter = runProgram(`
t = time()
`);
    const env = interpreter.getEnvironment();
    const t = env.get('t') as number;
    // Should be a Unix timestamp in seconds (around 1.7 billion for 2024)
    expect(t).toBeGreaterThan(1700000000);
    expect(t).toBeLessThan(2000000000);
  });

  it('should have frames() function that returns initial frame count', () => {
    const interpreter = runProgram(`
f = frames()
`);
    const env = interpreter.getEnvironment();
    // Before game loop starts, frame count should be 0
    expect(env.get('f')).toBe(0);
  });

  it('should use time() for calculations', () => {
    const interpreter = runProgram(`
t1 = time()
t2 = time()
diff = t2 - t1
is_small = diff < 1
`);
    const env = interpreter.getEnvironment();
    // Time difference between consecutive calls should be tiny
    expect(env.get('is_small')).toBe(true);
  });

  it('should use time() in expressions', () => {
    const interpreter = runProgram(`
base_time = time()
offset = base_time + 3600
one_hour_later = offset
`);
    const env = interpreter.getEnvironment();
    const base = env.get('base_time') as number;
    const later = env.get('one_hour_later') as number;
    expect(later - base).toBeCloseTo(3600, 5);
  });

  it('should use frames() in expressions', () => {
    const interpreter = runProgram(`
f = frames()
next_frame = f + 1
doubled = f * 2
`);
    const env = interpreter.getEnvironment();
    expect(env.get('f')).toBe(0);
    expect(env.get('next_frame')).toBe(1);
    expect(env.get('doubled')).toBe(0);
  });

  // Python-like array builtin tests
  it('should sort array in place', () => {
    const interpreter = runProgram(`
arr = [3, 1, 4, 1, 5, 9, 2, 6]
sort(arr)
first = arr[0]
last = arr[7]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('first')).toBe(1);
    expect(env.get('last')).toBe(9);
  });

  it('should return sorted copy with sorted()', () => {
    const interpreter = runProgram(`
arr = [3, 1, 2]
sorted_arr = sorted(arr)
original_first = arr[0]
sorted_first = sorted_arr[0]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('original_first')).toBe(3);  // Original unchanged
    expect(env.get('sorted_first')).toBe(1);    // Sorted copy
  });

  it('should reverse array in place', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3]
reverse(arr)
first = arr[0]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('first')).toBe(3);
  });

  it('should return reversed copy with reversed()', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3]
rev = reversed(arr)
original = arr[0]
reversed_first = rev[0]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('original')).toBe(1);
    expect(env.get('reversed_first')).toBe(3);
  });

  it('should slice arrays', () => {
    const interpreter = runProgram(`
arr = [0, 1, 2, 3, 4]
sliced = slice(arr, 1, 4)
result = len(sliced)
first = sliced[0]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(3);
    expect(env.get('first')).toBe(1);
  });

  it('should find index of element', () => {
    const interpreter = runProgram(`
arr = ["a", "b", "c", "d"]
idx = index(arr, "c")
missing = index(arr, "z")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('idx')).toBe(2);
    expect(env.get('missing')).toBe(-1);
  });

  it('should check if array contains element', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3]
has2 = contains(arr, 2)
has9 = contains(arr, 9)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('has2')).toBe(true);
    expect(env.get('has9')).toBe(false);
  });

  it('should insert element at index', () => {
    const interpreter = runProgram(`
arr = [1, 2, 4]
insert(arr, 2, 3)
third = arr[2]
length = len(arr)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('third')).toBe(3);
    expect(env.get('length')).toBe(4);
  });

  it('should remove first occurrence', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3, 2]
removed = remove(arr, 2)
length = len(arr)
second = arr[1]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('removed')).toBe(true);
    expect(env.get('length')).toBe(3);
    expect(env.get('second')).toBe(3);  // 2 was removed, so 3 shifted
  });

  it('should extend array with another', () => {
    const interpreter = runProgram(`
arr = [1, 2]
extend(arr, [3, 4, 5])
length = len(arr)
last = arr[4]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('length')).toBe(5);
    expect(env.get('last')).toBe(5);
  });

  it('should count occurrences', () => {
    const interpreter = runProgram(`
arr = [1, 2, 2, 3, 2, 4]
twos = count(arr, 2)
fives = count(arr, 5)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('twos')).toBe(3);
    expect(env.get('fives')).toBe(0);
  });

  it('should join array elements', () => {
    const interpreter = runProgram(`
arr = ["a", "b", "c"]
result = join(arr, "-")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('a-b-c');
  });

  // Python-like slice notation tests
  it('should slice array with start:end', () => {
    const interpreter = runProgram(`
arr = [0, 1, 2, 3, 4, 5]
result = arr[1:4]
len_result = len(result)
first = result[0]
last = result[2]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('len_result')).toBe(3);
    expect(env.get('first')).toBe(1);
    expect(env.get('last')).toBe(3);
  });

  it('should slice array with start:', () => {
    const interpreter = runProgram(`
arr = [0, 1, 2, 3, 4]
result = arr[2:]
first = result[0]
length = len(result)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('first')).toBe(2);
    expect(env.get('length')).toBe(3);
  });

  it('should slice array with :end', () => {
    const interpreter = runProgram(`
arr = [0, 1, 2, 3, 4]
result = arr[:3]
length = len(result)
last = result[2]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('length')).toBe(3);
    expect(env.get('last')).toBe(2);
  });

  it('should slice array with [:]', () => {
    const interpreter = runProgram(`
arr = [1, 2, 3]
result = arr[:]
length = len(result)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('length')).toBe(3);
  });

  it('should handle negative indices in slice', () => {
    const interpreter = runProgram(`
arr = [0, 1, 2, 3, 4]
result = arr[1:-1]
length = len(result)
first = result[0]
last = result[2]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('length')).toBe(3);
    expect(env.get('first')).toBe(1);
    expect(env.get('last')).toBe(3);
  });

  it('should handle negative index for regular access', () => {
    const interpreter = runProgram(`
arr = [0, 1, 2, 3, 4]
last = arr[-1]
second_last = arr[-2]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('last')).toBe(4);
    expect(env.get('second_last')).toBe(3);
  });

  it('should slice strings', () => {
    const interpreter = runProgram(`
s = "hello world"
result = s[0:5]
from_middle = s[6:]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('hello');
    expect(env.get('from_middle')).toBe('world');
  });

  it('should handle negative string indices', () => {
    const interpreter = runProgram(`
s = "hello"
last = s[-1]
slice_neg = s[-3:]
`);
    const env = interpreter.getEnvironment();
    expect(env.get('last')).toBe('o');
    expect(env.get('slice_neg')).toBe('llo');
  });

  // Keyword argument tests
  it('should support keyword arguments in user functions', () => {
    const interpreter = runProgram(`
fun greet(name, greeting) {
  return greeting + ", " + name
}
result = greet(greeting="Hello", name="World")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('Hello, World');
  });

  it('should support mixed positional and keyword arguments', () => {
    const interpreter = runProgram(`
fun add(a, b, c) {
  return a + b + c
}
result = add(1, c=3, b=2)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(6);
  });

  it('should support keyword arguments with defaults', () => {
    const interpreter = runProgram(`
fun make_point(x, y, z) {
  return {x: x, y: y, z: z}
}
p = make_point(10, z=30, y=20)
px = p.x
py = p.y
pz = p.z
`);
    const env = interpreter.getEnvironment();
    expect(env.get('px')).toBe(10);
    expect(env.get('py')).toBe(20);
    expect(env.get('pz')).toBe(30);
  });

  it('should support keyword arguments in builtin functions', () => {
    const interpreter = runProgram(`
arr = [3, 1, 2]
result = slice(arr, end=2)
length = len(result)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('length')).toBe(2);
  });

  it('should support passing prototypes to functions', () => {
    const interpreter = runProgram(`
fun draw_entity(entity) {
  return entity.x + entity.y
}
player = {x: 100, y: 200}
result = draw_entity(player)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(300);
  });

  it('should support prototype properties as keyword args', () => {
    const interpreter = runProgram(`
config = {width: 64, height: 32}
arr = array(size=config.width)
result = len(arr)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(64);
  });

  // ============ NEW TRIG FUNCTIONS ============

  it('should compute inverse trig functions', () => {
    const interpreter = runProgram(`
a = asin(0.5)
b = acos(0.5)
c = atan(1)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBeCloseTo(Math.asin(0.5), 10);
    expect(env.get('b')).toBeCloseTo(Math.acos(0.5), 10);
    expect(env.get('c')).toBeCloseTo(Math.atan(1), 10);
  });

  it('should compute hyperbolic trig functions', () => {
    const interpreter = runProgram(`
a = sinh(1)
b = cosh(1)
c = tanh(1)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('a')).toBeCloseTo(Math.sinh(1), 10);
    expect(env.get('b')).toBeCloseTo(Math.cosh(1), 10);
    expect(env.get('c')).toBeCloseTo(Math.tanh(1), 10);
  });

  it('should provide math constants', () => {
    const interpreter = runProgram(`
pi = PI()
tau = TAU()
e = E()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('pi')).toBeCloseTo(Math.PI, 10);
    expect(env.get('tau')).toBeCloseTo(Math.PI * 2, 10);
    expect(env.get('e')).toBeCloseTo(Math.E, 10);
  });

  it('should convert between degrees and radians', () => {
    const interpreter = runProgram(`
r = rad(180)
d = deg(r)
quarter = rad(90)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('r')).toBeCloseTo(Math.PI, 10);
    expect(env.get('d')).toBeCloseTo(180, 10);
    expect(env.get('quarter')).toBeCloseTo(Math.PI / 2, 10);
  });

  it('should compute logarithms', () => {
    const interpreter = runProgram(`
ln_e = log(E())
log10_100 = log10(100)
exp_1 = exp(1)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('ln_e')).toBeCloseTo(1, 10);
    expect(env.get('log10_100')).toBeCloseTo(2, 10);
    expect(env.get('exp_1')).toBeCloseTo(Math.E, 10);
  });

  it('should use trig for circular motion', () => {
    const interpreter = runProgram(`
angle = rad(45)
radius = 100
x = cos(angle) * radius
y = sin(angle) * radius
`);
    const env = interpreter.getEnvironment();
    const expected = 100 * Math.cos(Math.PI / 4);
    expect(env.get('x')).toBeCloseTo(expected, 10);
    expect(env.get('y')).toBeCloseTo(expected, 10);
  });

  // ============ INPUT BUFFER TESTS ============
  // Note: These test the buffer logic, not actual input events

  it('should have buffer_input function available', () => {
    // This tests that the function exists and doesn't throw
    const interpreter = runProgram(`
buffer_input("jump", 0.1)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have check_buffer function available', () => {
    const interpreter = runProgram(`
result = check_buffer("jump")
`);
    const env = interpreter.getEnvironment();
    // Should return false since nothing was buffered in same frame
    expect(env.get('result')).toBe(false);
  });

  it('should have peek_buffer function available', () => {
    const interpreter = runProgram(`
result = peek_buffer("action")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
  });

  it('should have clear_buffer function available', () => {
    const interpreter = runProgram(`
clear_buffer("jump")
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have clear_all_buffers function available', () => {
    const interpreter = runProgram(`
clear_all_buffers()
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have buffer_time function available', () => {
    const interpreter = runProgram(`
result = buffer_time("jump")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(0);
  });

  // ============ INPUT FUNCTIONS ============
  // Note: These test that functions exist, not actual input

  it('should have pressed function available', () => {
    const interpreter = runProgram(`
result = pressed("jump")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
  });

  it('should have held function available', () => {
    const interpreter = runProgram(`
result = held("left")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
  });

  it('should have released function available', () => {
    const interpreter = runProgram(`
result = released("action")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
  });

  it('should have key input functions available', () => {
    const interpreter = runProgram(`
p = key_pressed("space")
h = key_held("a")
r = key_released("enter")
`);
    const env = interpreter.getEnvironment();
    expect(env.get('p')).toBe(false);
    expect(env.get('h')).toBe(false);
    expect(env.get('r')).toBe(false);
  });

  it('should have mouse position functions available', () => {
    const interpreter = runProgram(`
x = mouse_x()
y = mouse_y()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(0);
    expect(env.get('y')).toBe(0);
  });

  it('should have mouse button functions available', () => {
    const interpreter = runProgram(`
p = mouse_pressed(0)
h = mouse_held(0)
r = mouse_released(0)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('p')).toBe(false);
    expect(env.get('h')).toBe(false);
    expect(env.get('r')).toBe(false);
  });

  it('should have touch functions available', () => {
    const interpreter = runProgram(`
count = touch_count()
x = touch_x(0)
y = touch_y(0)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('count')).toBe(0);
    expect(env.get('x')).toBe(0);
    expect(env.get('y')).toBe(0);
  });

  // ============ AUDIO FUNCTIONS ============
  // Note: These test that functions exist and don't throw

  it('should have music function available', () => {
    const interpreter = runProgram(`
music("")
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have stop_music function available', () => {
    const interpreter = runProgram(`
stop_music()
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have music_volume function available', () => {
    const interpreter = runProgram(`
music_volume(5)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have sound function available', () => {
    const interpreter = runProgram(`
sound("", 5)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have stop_sounds function available', () => {
    const interpreter = runProgram(`
stop_sounds()
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should have master_volume function available', () => {
    const interpreter = runProgram(`
master_volume(7)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  // ============ SPRITE SHEET FUNCTION ============

  it('should have sprite function with all parameters', () => {
    // Test that sprite accepts all parameters without error
    const interpreter = runProgram(`
// sprite(path, x, y, width, height, sx, sy, sw, sh, color)
// Using empty path draws a colored rectangle
sprite("", 100, 100, 32, 32, 0, 0, 32, 32, "#ff0000")
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should support sprite with keyword arguments', () => {
    const interpreter = runProgram(`
sprite("", 50, 50, width=64, height=64, color="#00ff00")
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  // ============ COMPREHENSIVE PLATFORMER EXAMPLE ============

  it('should support a complete platformer pattern', () => {
    const interpreter = runProgram(`
// Simulate a platformer state
player = {
  x: 100,
  y: 300,
  vel_y: 0,
  grounded: false
}

// Gravity constant
gravity = 800
jump_force = -400

// Simulate physics update (dt = 0.016 for 60fps)
dt = 0.016

// Run physics until we hit ground (simulate multiple frames)
loop {
  // Apply gravity
  player.vel_y = player.vel_y + gravity * dt
  player.y = player.y + player.vel_y * dt

  // Ground collision at y=350
  if (player.y >= 350) {
    player.y = 350
    player.vel_y = 0
    player.grounded = true
    break
  }
}

// Calculate angle for projectile
angle = rad(45)
speed = 200
proj_vx = cos(angle) * speed
proj_vy = sin(angle) * speed

// Use lerp for smooth movement
start_pos = 0
end_pos = 100
t = 0.5
smooth_pos = lerp(start_pos, end_pos, t)

// Clamp a value
raw_value = 150
clamped = clamp(raw_value, 0, 100)
`);
    const env = interpreter.getEnvironment();
    
    // Physics worked - player landed on ground
    const player = env.get('player') as RagePrototype;
    expect(player.y).toBe(350);
    expect(player.grounded).toBe(true);
    expect(player.vel_y).toBe(0);
    
    // Trig worked
    const expectedV = Math.cos(Math.PI / 4) * 200;
    expect(env.get('proj_vx')).toBeCloseTo(expectedV, 5);
    expect(env.get('proj_vy')).toBeCloseTo(expectedV, 5);
    
    // Lerp worked
    expect(env.get('smooth_pos')).toBe(50);
    
    // Clamp worked
    expect(env.get('clamped')).toBe(100);
  });

  // ============ COLOR HELPER TESTS ============

  it('should create rgba color strings', () => {
    const interpreter = runProgram(`
color1 = rgba(255, 0, 0, 1)
color2 = rgba(0, 128, 255, 0.5)
color3 = rgba(100, 100, 100, 0)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('color1')).toBe('rgba(255, 0, 0, 1)');
    expect(env.get('color2')).toBe('rgba(0, 128, 255, 0.5)');
    expect(env.get('color3')).toBe('rgba(100, 100, 100, 0)');
  });

  it('should create rgb color strings', () => {
    const interpreter = runProgram(`
color1 = rgb(255, 0, 0)
color2 = rgb(0, 128, 255)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('color1')).toBe('rgb(255, 0, 0)');
    expect(env.get('color2')).toBe('rgb(0, 128, 255)');
  });

  it('should create hsla color strings', () => {
    const interpreter = runProgram(`
color1 = hsla(0, 100, 50, 1)
color2 = hsla(180, 50, 75, 0.5)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('color1')).toBe('hsla(0, 100%, 50%, 1)');
    expect(env.get('color2')).toBe('hsla(180, 50%, 75%, 0.5)');
  });

  it('should create hsl color strings', () => {
    const interpreter = runProgram(`
color1 = hsl(0, 100, 50)
color2 = hsl(240, 75, 25)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('color1')).toBe('hsl(0, 100%, 50%)');
    expect(env.get('color2')).toBe('hsl(240, 75%, 25%)');
  });

  it('should default rgba alpha to 1', () => {
    const interpreter = runProgram(`
color = rgba(255, 0, 0)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('color')).toBe('rgba(255, 0, 0, 1)');
  });

  it('should floor rgb values', () => {
    const interpreter = runProgram(`
color = rgb(255.7, 128.3, 64.9)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('color')).toBe('rgb(255, 128, 64)');
  });

  // ============ DRAWING WITH ALPHA TESTS ============

  it('should call rect with alpha parameter', () => {
    const interpreter = runProgram(`
// rect(x, y, width, height, color, alpha)
rect(10, 20, 100, 50, "#ff0000", 0.5)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should call circle with alpha parameter', () => {
    const interpreter = runProgram(`
// circle(x, y, radius, color, alpha)
circle(100, 100, 50, "#00ff00", 0.75)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should call text with alpha parameter', () => {
    const interpreter = runProgram(`
// text(str, x, y, size, color, alpha)
text("Hello", 10, 30, 24, "#ffffff", 0.9)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should call line with alpha parameter', () => {
    const interpreter = runProgram(`
// line(x1, y1, x2, y2, color, width, alpha)
line(0, 0, 100, 100, "#0000ff", 2, 0.6)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should call sprite with alpha parameter', () => {
    const interpreter = runProgram(`
// sprite(path, x, y, w, h, sx, sy, sw, sh, color, alpha)
sprite("", 50, 50, 32, 32, 0, 0, 32, 32, "#ff00ff", 0.5)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should default alpha to 1 when not provided', () => {
    const interpreter = runProgram(`
// These should all work without alpha (defaults to 1)
rect(10, 20, 100, 50, "#ff0000")
circle(100, 100, 50, "#00ff00")
text("Test", 10, 30, 16, "#ffffff")
line(0, 0, 100, 100, "#0000ff")
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should use rgba colors with drawing functions', () => {
    const interpreter = runProgram(`
// Can also use rgba() for per-call alpha
color = rgba(255, 0, 0, 0.5)
rect(10, 20, 100, 50, color)
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  it('should create trail effect with alpha', () => {
    const interpreter = runProgram(`
// Simulate trail rendering with decreasing alpha
i = 0
loop {
  if (i >= 5) {
    break
  }
  alpha = 1 - (i / 5)
  rect(i * 20, 100, 16, 16, "#00cec9", alpha)
  i = i + 1
}
result = true
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
  });

  // ============ NULL LITERAL TESTS ============

  it('should evaluate null literal', () => {
    const interpreter = runProgram(`
x = null
`);
    const env = interpreter.getEnvironment();
    expect(env.get('x')).toBe(null);
  });

  it('should compare null with ==', () => {
    const interpreter = runProgram(`
x = null
is_null = x == null
not_null = 42 == null
`);
    const env = interpreter.getEnvironment();
    expect(env.get('is_null')).toBe(true);
    expect(env.get('not_null')).toBe(false);
  });

  it('should compare null with !=', () => {
    const interpreter = runProgram(`
x = null
y = 42
x_not_null = x != null
y_not_null = y != null
`);
    const env = interpreter.getEnvironment();
    expect(env.get('x_not_null')).toBe(false);
    expect(env.get('y_not_null')).toBe(true);
  });

  it('should use null in if condition', () => {
    const interpreter = runProgram(`
value = null
result = "unknown"
if (value == null) {
  result = "is null"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('is null');
  });

  it('should match null in pattern', () => {
    const interpreter = runProgram(`
value = null
result = match value {
  null => "matched null",
  _ => "not null"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('matched null');
  });

  it('should not match non-null as null', () => {
    const interpreter = runProgram(`
value = 42
result = match value {
  null => "matched null",
  _ => "not null"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('not null');
  });

  it('should store null in array', () => {
    const interpreter = runProgram(`
arr = [1, null, 3]
first = arr[0]
second = arr[1]
third = arr[2]
is_null = second == null
`);
    const env = interpreter.getEnvironment();
    expect(env.get('first')).toBe(1);
    expect(env.get('second')).toBe(null);
    expect(env.get('third')).toBe(3);
    expect(env.get('is_null')).toBe(true);
  });

  it('should store null in prototype', () => {
    const interpreter = runProgram(`
obj = {name: "test", value: null}
has_name = obj.name != null
has_value = obj.value != null
`);
    const env = interpreter.getEnvironment();
    expect(env.get('has_name')).toBe(true);
    expect(env.get('has_value')).toBe(false);
  });

  it('should treat null as falsy', () => {
    const interpreter = runProgram(`
value = null
result = "default"
if (!value) {
  result = "null is falsy"
}
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe('null is falsy');
  });

  it('should pass null as function argument', () => {
    const interpreter = runProgram(`
fun check_null(val) {
  if (val == null) {
    return "is null"
  }
  return "not null"
}
result1 = check_null(null)
result2 = check_null(42)
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result1')).toBe('is null');
    expect(env.get('result2')).toBe('not null');
  });

  it('should return null from function', () => {
    const interpreter = runProgram(`
fun get_nothing() {
  return null
}
result = get_nothing()
is_null = result == null
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(null);
    expect(env.get('is_null')).toBe(true);
  });

  it('should use null for optional values pattern', () => {
    const interpreter = runProgram(`
fun find_item(items, target) {
  i = 0
  loop {
    if (i >= len(items)) {
      break
    }
    if (items[i] == target) {
      return items[i]
    }
    i = i + 1
  }
  return null
}

items = ["apple", "banana", "cherry"]
found = find_item(items, "banana")
not_found = find_item(items, "grape")
has_banana = found != null
has_grape = not_found != null
`);
    const env = interpreter.getEnvironment();
    expect(env.get('found')).toBe('banana');
    expect(env.get('not_found')).toBe(null);
    expect(env.get('has_banana')).toBe(true);
    expect(env.get('has_grape')).toBe(false);
  });

  // ============ SHORT-CIRCUIT EVALUATION ============

  it('should short-circuit && when left is false', () => {
    const interpreter = runProgram(`
side_effect = false

fun set_side_effect() {
  side_effect = true
  return true
}

// Left is false, so right should NOT be evaluated
result = false && set_side_effect()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
    expect(env.get('side_effect')).toBe(false); // Should NOT have been called
  });

  it('should evaluate right side of && when left is true', () => {
    const interpreter = runProgram(`
side_effect = false

fun set_side_effect() {
  side_effect = true
  return true
}

// Left is true, so right SHOULD be evaluated
result = true && set_side_effect()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
    expect(env.get('side_effect')).toBe(true); // Should have been called
  });

  it('should short-circuit || when left is true', () => {
    const interpreter = runProgram(`
side_effect = false

fun set_side_effect() {
  side_effect = true
  return false
}

// Left is true, so right should NOT be evaluated
result = true || set_side_effect()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
    expect(env.get('side_effect')).toBe(false); // Should NOT have been called
  });

  it('should evaluate right side of || when left is false', () => {
    const interpreter = runProgram(`
side_effect = false

fun set_side_effect() {
  side_effect = true
  return true
}

// Left is false, so right SHOULD be evaluated
result = false || set_side_effect()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
    expect(env.get('side_effect')).toBe(true); // Should have been called
  });

  it('should short-circuit and keyword when left is false', () => {
    const interpreter = runProgram(`
side_effect = false

fun set_side_effect() {
  side_effect = true
  return true
}

// Left is false, so right should NOT be evaluated
result = false and set_side_effect()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
    expect(env.get('side_effect')).toBe(false);
  });

  it('should short-circuit or keyword when left is true', () => {
    const interpreter = runProgram(`
side_effect = false

fun set_side_effect() {
  side_effect = true
  return false
}

// Left is true, so right should NOT be evaluated
result = true or set_side_effect()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
    expect(env.get('side_effect')).toBe(false);
  });

  it('should short-circuit with null checks', () => {
    const interpreter = runProgram(`
obj = null
accessed = false

fun access_property() {
  accessed = true
  return obj.value
}

// Should short-circuit and not try to access obj.value
result = obj != null && access_property()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
    expect(env.get('accessed')).toBe(false);
  });

  it('should use short-circuit for safe property access pattern', () => {
    const interpreter = runProgram(`
player = null
can_jump = player != null && player.on_ground

player2 = {on_ground: true}
can_jump2 = player2 != null && player2.on_ground
`);
    const env = interpreter.getEnvironment();
    expect(env.get('can_jump')).toBe(false);
    expect(env.get('can_jump2')).toBe(true);
  });

  it('should chain short-circuit operators', () => {
    const interpreter = runProgram(`
a = false
b = true
c = true
call_count = 0

fun check() {
  call_count = call_count + 1
  return true
}

// a is false, so b and check() should not be evaluated
result = a && b && check()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(false);
    expect(env.get('call_count')).toBe(0);
  });

  it('should chain || with short-circuit', () => {
    const interpreter = runProgram(`
call_count = 0

fun increment() {
  call_count = call_count + 1
  return true
}

// First true should stop evaluation
result = true || increment() || increment()
`);
    const env = interpreter.getEnvironment();
    expect(env.get('result')).toBe(true);
    expect(env.get('call_count')).toBe(0);
  });
});

