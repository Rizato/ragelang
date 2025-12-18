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
   * Get canvas width
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Get canvas height
   */
  getHeight(): number {
    return this.height;
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
   * text(text, x, y, size, color, alpha)
   */
  text(text: string, x: number, y: number, size: number = 16, color: string = '#ffffff', alpha: number = 1): void {
    if (!this.ctx) return;

    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.fillText(text, x, y);
    this.ctx.globalAlpha = prevAlpha;
  }

  /**
   * Draw a sprite on the canvas
   * sprite(path, x, y, width, height, sx, sy, sw, sh, color, alpha)
   * 
   * @param path - Image path (null for colored rectangle)
   * @param x - Destination X on canvas
   * @param y - Destination Y on canvas  
   * @param width - Destination width on canvas
   * @param height - Destination height on canvas
   * @param sx - Source X in sprite sheet (optional, for sprite sheets)
   * @param sy - Source Y in sprite sheet (optional)
   * @param sw - Source width in sprite sheet (optional)
   * @param sh - Source height in sprite sheet (optional)
   * @param color - Color for placeholder or tint (optional)
   * @param alpha - Transparency 0-1 (optional)
   * 
   * If path is null/empty, draws a colored rectangle.
   * If sx/sy/sw/sh are provided, extracts that region from the sprite sheet.
   */
  sprite(
    path: string | null,
    x: number,
    y: number,
    width: number = 32,
    height: number = 32,
    sx: number | null = null,
    sy: number | null = null,
    sw: number | null = null,
    sh: number | null = null,
    color: string = '#ffffff',
    alpha: number = 1
  ): void {
    if (!this.ctx) return;

    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // If no path, draw a colored rectangle
    if (!path) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
      this.ctx.globalAlpha = prevAlpha;
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
      // Check if we're extracting from a sprite sheet
      if (sx !== null && sy !== null && sw !== null && sh !== null) {
        // Draw from sprite sheet region
        this.ctx.drawImage(
          spriteData.image,
          sx, sy, sw, sh,  // Source rectangle
          x, y, width, height  // Destination rectangle
        );
      } else {
        // Draw the entire image, optionally scaled
        if (width && height) {
          this.ctx.drawImage(spriteData.image, x, y, width, height);
        } else {
          this.ctx.drawImage(spriteData.image, x, y);
        }
      }
    } else {
      // Draw placeholder while loading
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
    }

    this.ctx.globalAlpha = prevAlpha;
  }

  /**
   * Draw a filled rectangle
   */
  rect(x: number, y: number, width: number, height: number, color: string, alpha: number = 1): void {
    if (!this.ctx) return;
    
    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.globalAlpha = prevAlpha;
  }

  /**
   * Draw a stroked rectangle (outline only)
   */
  strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 1, alpha: number = 1): void {
    if (!this.ctx) return;
    
    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.globalAlpha = prevAlpha;
  }

  /**
   * Draw a circle
   */
  circle(x: number, y: number, radius: number, color: string, alpha: number = 1): void {
    if (!this.ctx) return;

    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = prevAlpha;
  }

  /**
   * Draw a stroked circle (outline only)
   */
  strokeCircle(x: number, y: number, radius: number, color: string, lineWidth: number = 1, alpha: number = 1): void {
    if (!this.ctx) return;

    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.globalAlpha = prevAlpha;
  }

  /**
   * Draw a line
   */
  line(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1, alpha: number = 1): void {
    if (!this.ctx) return;

    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.globalAlpha = prevAlpha;
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
