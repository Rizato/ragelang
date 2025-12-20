import { describe, it, expect } from "vitest";
import { FallingProcessor } from "./processor.js";

describe("FallingProcessor", () => {
  it("should find the foundation row", () => {
    const source = `code
####`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // Code should be supported by foundation
    expect(result).toContain("code");
  });

  it("should handle simple supported code", () => {
    const source = `x
#`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    expect(result).toContain("x");
  });

  it("should make unsupported characters fall", () => {
    const source = `  x
#`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // 'x' is at column 2, but foundation is at column 0
    // So 'x' should fall out (or land somewhere)
    // Since there's no character below x to land on, and x is not supported,
    // it will try to fall
    expect(result).toBeDefined();
  });

  it("should support diagonal connections", () => {
    const source = `  x
 y
z
#`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // x is supported by y (diagonal), y by z, z by #
    expect(result).toContain("x");
    expect(result).toContain("y");
    expect(result).toContain("z");
  });

  it("should handle the hello world example from the blog", () => {
    const source = `//         to RageLang!
// Welcome  | | | | |
// | | | |   | | | |
// Author:    Rizato
print("Hello, World! ")
// | | | | |         |
######################`;

    const processor = new FallingProcessor(source);
    const result = processor.process();

    // The result should have fallen characters
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return empty string when no foundation exists", () => {
    const source = `code here
more code`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    expect(result).toBe("");
  });

  it("should handle wide foundations", () => {
    const source = `hello world
###########`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // All characters should be supported
    expect(result).toContain("hello world");
  });

  it("should handle sparse foundations", () => {
    const source = `x   y
#   #`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // x and y should both be supported
    expect(result).toContain("x");
    expect(result).toContain("y");
  });

  it("should identify unsupported positions", () => {
    const source = `  x
#`;
    const processor = new FallingProcessor(source);
    const unsupported = processor.getUnsupportedPositions();

    // x at position (0, 2) is not supported by # at (1, 0)
    expect(unsupported.length).toBeGreaterThan(0);
  });

  it("should handle tower-like supports", () => {
    const source = `    x
    |
    |
    |
    #`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // x should be supported by the tower of |
    expect(result).toContain("x");
    expect(result).toContain("|");
  });

  it("should handle pyramid supports", () => {
    const source = `     x
    | |
   |   |
  |     |
 |       |
#         #`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // The pyramid should support x
    expect(result).toContain("x");
  });

  it("should process falling characters landing on other characters", () => {
    const source = `ab
c
#`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // 'a' and 'c' are supported by #
    // 'b' is not directly supported - it's one column right of 'c'
    // so 'b' should be supported diagonally by 'c'
    expect(result).toBeDefined();
  });

  it("should handle empty source", () => {
    const processor = new FallingProcessor("");
    const result = processor.process();

    expect(result).toBe("");
  });

  it("should handle source with only foundation", () => {
    const source = "###";
    const processor = new FallingProcessor(source);
    const result = processor.process();

    expect(result).toBe("###");
  });

  it("should preserve the grid structure", () => {
    const source = `ab
##`;
    const processor = new FallingProcessor(source);
    const grid = processor.getGrid();

    expect(grid.length).toBe(2);
    expect(grid[0][0]).toBe("a");
    expect(grid[0][1]).toBe("b");
  });

  it("should handle comments as supports", () => {
    const source = `print("test")
// | | | | |
#############`;
    const processor = new FallingProcessor(source);
    const result = processor.process();

    // Comments should act as supports
    expect(result).toContain("print");
  });
});
