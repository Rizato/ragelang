/**
 * Canvas Renderer for Ragelang
 * Provides drawing capabilities for 2D platformer games
 */

export interface RenderOptions {
  width: number;
  height: number;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface SpriteData {
  image: HTMLImageElement;
  loaded: boolean;
}

/**
 * Canvas-based renderer for Ragelang games
 */
export class CanvasRenderer {
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null;
  private width: number;
  private height: number;
  private sprites: Map<string, SpriteData> = new Map();

  constructor(canvas: HTMLCanvasElement | null, options: RenderOptions) {
    this.width = options.width;
    this.height = options.height;
    this.canvas = canvas;
    this.ctx = null;

    if (canvas) {
      canvas.width = this.width;
      canvas.height = this.height;
      this.ctx = canvas.getContext('2d');
    }
  }

  /**
   * Clear the canvas
   */
  clear(color: string = '#000000'): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw text on the canvas
   * text(text, x, y, size, color)
   */
  text(text: string, x: number, y: number, size: number = 16, color: string = '#ffffff'): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.fillText(text, x, y);
  }

  /**
   * Draw a sprite on the canvas
   * sprite(path, x, y, width, height, color)
   * If path is null/empty, draws a colored rectangle
   */
  sprite(
    path: string | null,
    x: number,
    y: number,
    width: number = 32,
    height: number = 32,
    color: string = '#ffffff'
  ): void {
    if (!this.ctx) return;

    // If no path, draw a colored rectangle
    if (!path) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
      return;
    }

    // Check if sprite is already loaded
    let spriteData = this.sprites.get(path);
    
    if (!spriteData) {
      // Load the sprite asynchronously
      const img = new Image();
      spriteData = { image: img, loaded: false };
      this.sprites.set(path, spriteData);
      
      img.onload = () => {
        spriteData!.loaded = true;
      };
      img.onerror = () => {
        // Draw a placeholder on error
        console.warn(`Failed to load sprite: ${path}`);
      };
      img.src = path;
    }

    if (spriteData.loaded) {
      // Draw the image, optionally scaled
      if (width && height) {
        this.ctx.drawImage(spriteData.image, x, y, width, height);
      } else {
        this.ctx.drawImage(spriteData.image, x, y);
      }
    } else {
      // Draw placeholder while loading
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
    }
  }

  /**
   * Draw a filled rectangle
   */
  rect(x: number, y: number, width: number, height: number, color: string): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw a stroked rectangle (outline only)
   */
  strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 1): void {
    if (!this.ctx) return;
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw a circle
   */
  circle(x: number, y: number, radius: number, color: string): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw a stroked circle (outline only)
   */
  strokeCircle(x: number, y: number, radius: number, color: string, lineWidth: number = 1): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Draw a line
   */
  line(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  /**
   * Get the render context
   */
  getContext(): RenderContext | null {
    if (!this.canvas || !this.ctx) return null;
    return { canvas: this.canvas, ctx: this.ctx };
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Set the font for text rendering
   */
  setFont(font: string): void {
    if (!this.ctx) return;
    this.ctx.font = font;
  }

  /**
   * Preload a sprite
   */
  preloadSprite(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const spriteData: SpriteData = { image: img, loaded: false };
      this.sprites.set(path, spriteData);

      img.onload = () => {
        spriteData.loaded = true;
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load sprite: ${path}`));
      };
      img.src = path;
    });
  }
}
