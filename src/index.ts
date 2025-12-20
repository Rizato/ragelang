/**
 * Ragelang - A rage-inducing programming language
 *
 * In Ragelang, all characters must be supported by characters beneath them,
 * or they will fall until they land on another character or fall out entirely.
 */

export { Lexer } from "./lexer/lexer.js";
export { TokenType, type Token } from "./lexer/tokens.js";
export { Parser } from "./parser/parser.js";
export * from "./parser/ast.js";
export { FallingProcessor } from "./falling/processor.js";
export { Interpreter } from "./runtime/interpreter.js";
export { CanvasRenderer } from "./renderer/canvas.js";
export { AudioManager } from "./audio/audio.js";
export { InputManager } from "./input/input.js";

import { FallingProcessor } from "./falling/processor.js";
import { Lexer } from "./lexer/lexer.js";
import { Parser } from "./parser/parser.js";
import { Interpreter } from "./runtime/interpreter.js";
import { CanvasRenderer, type RenderContext } from "./renderer/canvas.js";

export interface RagelangOptions {
  canvas?: HTMLCanvasElement | null;
  width?: number;
  height?: number;
  /** Base path for resolving scene paths in load_scene() */
  basePath?: string;
}

/**
 * Main Ragelang class that orchestrates the entire interpretation pipeline
 */
export class Ragelang {
  private interpreter: Interpreter;
  private renderer: CanvasRenderer;
  private canvas: HTMLCanvasElement | null;
  private basePath: string;
  private isRunning: boolean = false;

  constructor(options: RagelangOptions = {}) {
    this.canvas = options.canvas ?? null;
    this.basePath = options.basePath ?? "";
    this.renderer = new CanvasRenderer(this.canvas, {
      width: options.width ?? 800,
      height: options.height ?? 600,
    });
    this.interpreter = new Interpreter(this.renderer);

    // Set up internal scene change handling
    this.interpreter.setOnSceneChange((path: string) => {
      this.handleSceneChange(path);
    });
  }

  /**
   * Internal handler for scene changes triggered by load_scene()
   */
  private async handleSceneChange(path: string): Promise<void> {
    // Resolve path relative to basePath
    const fullPath = this.resolvePath(path);

    try {
      // Fetch the new scene code
      const response = await fetch(fullPath);
      if (!response.ok) {
        throw new Error(`Failed to load scene: ${response.status} ${response.statusText}`);
      }
      const code = await response.text();

      // Stop current game
      this.stop();

      // Reset the interpreter for the new scene
      this.interpreter.reset();

      // Run the new scene
      this.run(code);
      this.start();
    } catch (error) {
      console.error(`Failed to load scene "${path}":`, error);
    }
  }

  /**
   * Resolve a path relative to basePath
   */
  private resolvePath(path: string): string {
    // If path is absolute (starts with / or http), use as-is
    if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    // Otherwise resolve relative to basePath
    if (this.basePath && !this.basePath.endsWith("/")) {
      return `${this.basePath}/${path}`;
    }
    return `${this.basePath}${path}`;
  }

  /**
   * Run a Ragelang program
   */
  run(source: string): void {
    // Step 1: Process falling characters
    const processor = new FallingProcessor(source);
    const processedSource = processor.process();

    // Step 2: Tokenize
    const lexer = new Lexer(processedSource);
    const tokens = lexer.tokenize();

    // Step 3: Parse
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Step 4: Interpret
    this.interpreter.run(ast);
  }

  /**
   * Get the processed source after falling characters
   */
  processSource(source: string): string {
    const processor = new FallingProcessor(source);
    return processor.process();
  }

  /**
   * Start the game loop
   */
  start(): void {
    this.isRunning = true;
    this.interpreter.startGameLoop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false;
    this.interpreter.stopGameLoop();
  }

  /**
   * Get the render context for external use
   */
  getRenderContext(): RenderContext | null {
    return this.renderer.getContext();
  }

  /**
   * Check if game loop is running
   */
  isGameRunning(): boolean {
    return this.isRunning;
  }
}
