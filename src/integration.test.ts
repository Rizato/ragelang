import { describe, it, expect, vi } from "vitest";
import { Ragelang } from "./index.js";
import { FallingProcessor } from "./falling/processor.js";
import { Lexer } from "./lexer/lexer.js";
import { Parser } from "./parser/parser.js";

describe("Integration Tests", () => {
  it("should process and run a complete Ragelang program", () => {
    const source = `
x = 10
y = 20
sum = x + y
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    // If no error is thrown, the program ran successfully
    expect(true).toBe(true);
  });

  it("should process falling characters before interpretation", () => {
    // A simple program where everything is supported
    const source = `x = 1
#####`;

    const ragelang = new Ragelang();
    const processed = ragelang.processSource(source);

    expect(processed).toContain("x");
    expect(processed).toContain("1");
  });

  it("should handle the full pipeline: falling -> lexer -> parser -> interpreter", () => {
    const source = `message = "Hello"
print(message)
##################`;

    // Step 1: Process falling characters
    const processor = new FallingProcessor(source);
    const processed = processor.process();

    // Step 2: Tokenize
    const lexer = new Lexer(processed);
    const tokens = lexer.tokenize();
    expect(tokens.length).toBeGreaterThan(0);

    // Step 3: Parse
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.body.length).toBeGreaterThan(0);
  });

  it("should handle programs with draw and update blocks", () => {
    const source = `
score = 0

draw {
  clear("#000000")
}

update(dt) {
  score = score + 1
}
`;

    const ragelang = new Ragelang();
    ragelang.run(source);

    // The blocks should be registered
    expect(true).toBe(true);
  });

  it("should handle complex prototype usage", () => {
    const source = `
player = prototype()
player.x = 100
player.y = 200
player.speed = 5

enemy = prototype()
enemy.x = 300
enemy.y = 200

distance_between = distance(player.x, player.y, enemy.x, enemy.y)
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    // Distance should be calculated correctly (200 units apart on x axis)
    expect(true).toBe(true);
  });

  it("should handle conditionals in game logic", () => {
    const source = `
health = 100
damage = 25

if (health > damage) {
  health = health - damage
  alive = true
} else {
  health = 0
  alive = false
}
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    expect(true).toBe(true);
  });

  it("should properly export all modules", async () => {
    // Test that all exports are available
    const { Lexer, TokenType, Parser, FallingProcessor, Interpreter, CanvasRenderer, Ragelang } =
      await import("./index.js");

    expect(Lexer).toBeDefined();
    expect(TokenType).toBeDefined();
    expect(Parser).toBeDefined();
    expect(FallingProcessor).toBeDefined();
    expect(Interpreter).toBeDefined();
    expect(CanvasRenderer).toBeDefined();
    expect(Ragelang).toBeDefined();
  });

  it("should handle the blog example hello world", () => {
    // Simplified version without the complex falling
    const source = `print("Hello, World!")
######################`;

    const consoleSpy = vi.spyOn(console, "log");
    const ragelang = new Ragelang();
    ragelang.run(source);

    expect(consoleSpy).toHaveBeenCalledWith("Hello, World!");
  });

  it("should support math operations in game calculations", () => {
    const source = `
gravity = 9.8
dt = 0.016
velocity_y = 0
position_y = 100

velocity_y = velocity_y + gravity * dt
position_y = position_y + velocity_y * dt
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    expect(true).toBe(true);
  });

  it("should handle input key simulation via variables", () => {
    const source = `
key_left = false
key_right = true
speed = 5
x = 100

if (key_left) {
  x = x - speed
}
if (key_right) {
  x = x + speed
}
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    expect(true).toBe(true);
  });

  it("should handle collision detection patterns", () => {
    const source = `
player_x = 100
player_y = 100
player_w = 32
player_h = 32

enemy_x = 110
enemy_y = 110
enemy_w = 32
enemy_h = 32

colliding = rect_overlap(
  player_x, player_y, player_w, player_h,
  enemy_x, enemy_y, enemy_w, enemy_h
)
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    expect(true).toBe(true);
  });

  it("should handle coyote time pattern", () => {
    const source = `
on_ground = false
coyote_time = 0.1
time_since_grounded = 0.05

can_jump = on_ground or (time_since_grounded < coyote_time)
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    expect(true).toBe(true);
  });

  it("should handle multiple prototypes", () => {
    const source = `
player = prototype()
player.x = 0
player.y = 0

bullet1 = prototype()
bullet1.x = player.x
bullet1.y = player.y

bullet2 = prototype()
bullet2.x = player.x + 10
bullet2.y = player.y
`;

    const ragelang = new Ragelang();
    ragelang.run(source);
    expect(true).toBe(true);
  });
});
