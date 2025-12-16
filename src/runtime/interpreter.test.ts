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
});

