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
  // Memoization for support checking to avoid infinite recursion
  private supportCache: Map<string, boolean> = new Map();
  // Track positions being checked to detect cycles
  private checkingStack: Set<string> = new Set();

  constructor(source: string) {
    // Convert source to a 2D grid of characters
    const lines = source.split("\n");
    this.height = lines.length;
    this.width = Math.max(...lines.map((l) => l.length), 0);

    // Initialize grid with spaces
    this.grid = [];
    for (let row = 0; row < this.height; row++) {
      this.grid[row] = [];
      const line = lines[row] || "";
      for (let col = 0; col < this.width; col++) {
        this.grid[row][col] = col < line.length ? line[col] : " ";
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
        if (char === "#" && !inString) {
          this.foundationRow = row;
          return;
        }
      }
    }
  }

  private posKey(row: number, col: number): string {
    return `${row},${col}`;
  }

  /**
   * Check if a character at (row, col) is supported (recursively)
   */
  private isSupported(row: number, col: number): boolean {
    const key = this.posKey(row, col);

    // Check cache first
    if (this.supportCache.has(key)) {
      return this.supportCache.get(key)!;
    }

    // Detect cycles - if we're already checking this position, assume unsupported
    if (this.checkingStack.has(key)) {
      return false;
    }

    // Mark as being checked
    this.checkingStack.add(key);

    const result = this.isSupportedInternal(row, col);

    // Remove from checking stack and cache result
    this.checkingStack.delete(key);
    this.supportCache.set(key, result);

    return result;
  }

  private isSupportedInternal(row: number, col: number): boolean {
    // Space characters don't count
    if (this.grid[row][col] === " ") {
      return false;
    }

    // Foundation characters are always supported
    if (row === this.foundationRow && this.grid[row][col] === "#") {
      return true;
    }

    // Characters on or below the foundation row (but not foundation itself) fall out
    if (row >= this.foundationRow && this.foundationRow !== -1) {
      return false;
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
        if (below !== " " && below !== undefined) {
          // RECURSIVELY check if the supporting character is itself supported
          if (this.isSupported(belowRow, checkCol)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Find where a character would land if it falls
   * Returns the new row, or -1 if it falls out of the program
   *
   * Characters fall STRAIGHT DOWN in their column until they hit something
   */
  private findLandingRow(startRow: number, col: number): number {
    // Characters fall straight down in their own column
    for (let row = startRow + 1; row < this.height; row++) {
      const cell = this.grid[row][col];
      if (cell !== " ") {
        // Hit something, land one row above
        return row - 1;
      }
    }

    // Nothing below in this column - fell out of the program
    return -1;
  }

  /**
   * Process the source code - make all unsupported characters fall
   * Returns the processed source code
   *
   * Characters fall one LINE at a time, from bottom to top.
   */
  process(): string {
    if (this.foundationRow === -1) {
      // No foundation - everything falls out, return empty
      return "";
    }

    let changed = true;
    let iterations = 0;
    const maxIterations = this.height * this.width; // Safety limit

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Clear cache on each iteration since grid changed
      this.supportCache.clear();

      // Process from BOTTOM to TOP, one line at a time
      for (let row = this.foundationRow - 1; row >= 0; row--) {
        // Collect all unsupported characters on THIS line
        const toFall: Array<{ col: number; char: string }> = [];

        for (let col = 0; col < this.width; col++) {
          const char = this.grid[row][col];
          if (char !== " " && !this.isSupported(row, col)) {
            toFall.push({ col, char });
          }
        }

        if (toFall.length > 0) {
          // Remove all falling characters from this line at once
          for (const { col } of toFall) {
            this.grid[row][col] = " ";
          }

          // Then place them at their landing positions
          for (const { col, char } of toFall) {
            const landingRow = this.findLandingRow(row, col);

            if (landingRow >= 0 && landingRow < this.height) {
              this.grid[landingRow][col] = char;
            }
            // If landingRow is -1, the character fell out
          }

          changed = true;
          // Clear cache after each line processes since grid changed
          this.supportCache.clear();
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
      .map((row) => row.join("").replace(/\s+$/, "")) // Trim trailing spaces
      .join("\n");
  }

  /**
   * Get the grid for debugging/visualization
   */
  getGrid(): string[][] {
    return this.grid.map((row) => [...row]);
  }

  /**
   * Get characters that will fall (for editor highlighting)
   * This returns positions BEFORE processing - i.e., unsupported chars
   */
  getUnsupportedPositions(): Position[] {
    // Clear cache before checking
    this.supportCache.clear();

    const unsupported: Position[] = [];

    // No foundation means everything falls
    if (this.foundationRow === -1) {
      for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
          if (this.grid[row][col] !== " ") {
            unsupported.push({ row, col });
          }
        }
      }
      return unsupported;
    }

    for (let row = 0; row < this.foundationRow; row++) {
      for (let col = 0; col < this.width; col++) {
        if (this.grid[row][col] !== " " && !this.isSupported(row, col)) {
          unsupported.push({ row, col });
        }
      }
    }

    return unsupported;
  }

  /**
   * Get the foundation row index (-1 if no foundation)
   */
  getFoundationRow(): number {
    return this.foundationRow;
  }
}
