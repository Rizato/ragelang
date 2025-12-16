/**
 * Falling Characters Processor for Ragelang
 * 
 * In Ragelang, characters must be supported by characters beneath them.
 * A character is supported if there is a non-space character:
 * - Directly below it (same column)
 * - One column to the left below
 * - One column to the right below
 * 
 * The foundation (# characters) never falls.
 * Unsupported characters fall until they land on another character or fall out.
 */

export interface Position {
  row: number;
  col: number;
}

export class FallingProcessor {
  private grid: string[][];
  private foundationRow: number = -1;
  private height: number;
  private width: number;

  constructor(source: string) {
    // Convert source to a 2D grid of characters
    const lines = source.split('\n');
    this.height = lines.length;
    this.width = Math.max(...lines.map(l => l.length), 0);
    
    // Initialize grid with spaces
    this.grid = [];
    for (let row = 0; row < this.height; row++) {
      this.grid[row] = [];
      const line = lines[row] || '';
      for (let col = 0; col < this.width; col++) {
        this.grid[row][col] = col < line.length ? line[col] : ' ';
      }
    }

    // Find the foundation row (the row containing # characters)
    this.findFoundation();
  }

  private findFoundation(): void {
    for (let row = this.height - 1; row >= 0; row--) {
      let inString = false;
      for (let col = 0; col < this.width; col++) {
        const char = this.grid[row][col];
        
        // Track string boundaries (simple: just double quotes)
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        // Only treat # as foundation if not inside a string
        if (char === '#' && !inString) {
          this.foundationRow = row;
          return;
        }
      }
    }
  }

  /**
   * Check if a character at (row, col) is supported
   */
  private isSupported(row: number, col: number): boolean {
    // Foundation characters are always supported
    if (this.grid[row][col] === '#' && row === this.foundationRow) {
      return true;
    }

    // Characters on or below the foundation row are not supported (they fall out)
    if (row >= this.foundationRow && this.foundationRow !== -1) {
      // Unless they ARE the foundation
      if (row === this.foundationRow && this.grid[row][col] === '#') {
        return true;
      }
      // Check if there's support from foundation
      if (row === this.foundationRow) {
        return false; // Non-foundation chars on foundation row fall out
      }
    }

    // If no foundation exists, everything falls out
    if (this.foundationRow === -1) {
      return false;
    }

    // Check the row below
    const belowRow = row + 1;
    if (belowRow >= this.height) {
      return false;
    }

    // Check directly below and diagonally below
    const positions = [col - 1, col, col + 1];
    for (const checkCol of positions) {
      if (checkCol >= 0 && checkCol < this.width) {
        const below = this.grid[belowRow][checkCol];
        if (below !== ' ' && below !== undefined) {
          // Check if that supporting character is itself supported
          // (recursively, but we process bottom-up so it should already be stable)
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find where a character would land if it falls
   * Returns the new row, or -1 if it falls out of the program
   */
  private findLandingRow(startRow: number, col: number): number {
    // Characters fall until they hit another character
    for (let row = startRow + 1; row < this.height; row++) {
      // Check if there's something to land on at the current position
      // A character lands when the row below has a non-space character
      // in the column directly below or diagonally adjacent
      const positions = [col - 1, col, col + 1];
      for (const checkCol of positions) {
        if (checkCol >= 0 && checkCol < this.width) {
          if (this.grid[row][checkCol] !== ' ') {
            // We land at row - 1 (one row above where we hit something)
            // But wait - in Ragelang, falling chars land ON other chars
            // Let me re-read the spec...
            // "Falling characters fall until they hit another character"
            // So we return the row just BEFORE hitting
            return row - 1;
          }
        }
      }
    }

    // Fell out of the program
    return -1;
  }

  /**
   * Process the source code - make all unsupported characters fall
   */
  process(): string {
    if (this.foundationRow === -1) {
      // No foundation - everything falls out, return empty
      return '';
    }

    let changed = true;
    let iterations = 0;
    const maxIterations = this.height * this.width; // Safety limit

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Process from top to bottom, finding unsupported characters
      for (let row = 0; row < this.foundationRow; row++) {
        for (let col = 0; col < this.width; col++) {
          const char = this.grid[row][col];
          if (char !== ' ' && !this.isSupported(row, col)) {
            // This character needs to fall
            const landingRow = this.findLandingRow(row, col);
            
            // Remove from current position
            this.grid[row][col] = ' ';
            
            if (landingRow >= 0 && landingRow < this.height) {
              // Place at landing position
              this.grid[landingRow][col] = char;
            }
            // If landingRow is -1, the character fell out
            
            changed = true;
          }
        }
      }
    }

    // Convert grid back to string
    return this.gridToString();
  }

  /**
   * Get the current grid state as a string
   */
  private gridToString(): string {
    return this.grid
      .map(row => row.join('').replace(/\s+$/, '')) // Trim trailing spaces
      .join('\n');
  }

  /**
   * Get the grid for debugging/visualization
   */
  getGrid(): string[][] {
    return this.grid.map(row => [...row]);
  }

  /**
   * Get characters that will fall (for editor highlighting)
   */
  getUnsupportedPositions(): Position[] {
    const unsupported: Position[] = [];
    
    for (let row = 0; row < this.foundationRow; row++) {
      for (let col = 0; col < this.width; col++) {
        if (this.grid[row][col] !== ' ' && !this.isSupported(row, col)) {
          unsupported.push({ row, col });
        }
      }
    }

    return unsupported;
  }
}

