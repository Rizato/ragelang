# Ragelang VS Code Extension

Language support for Ragelang - a programming language where unsupported characters fall.

## Features

### Syntax Highlighting

Full syntax highlighting for:

- **Keywords**: `fun`, `enum`, `if`, `else`, `loop`, `break`, `return`, `match`, `draw`, `update`, `prototype`, `and`, `or`
- **Constants**: `true`, `false`, `PI`, `TAU`, `E`
- **Built-in Functions**:
  - Drawing: `text`, `sprite`, `clear`, `rect`, `circle`, `line`
  - Math: `abs`, `floor`, `ceil`, `round`, `min`, `max`, `sqrt`, `pow`, `sign`
  - Trigonometry: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`
  - Angle conversion: `deg`, `rad`
  - Logarithms: `log`, `log10`, `exp`
  - Random: `random`, `randomInt`
  - Utility: `print`, `lerp`, `clamp`, `distance`, `rect_overlap`, `time`
  - Arrays: `array`, `len`, `push`, `pop`, `sort`, `sorted`, `reverse`, `reversed`, `slice`, `index`, `contains`, `insert`, `remove`, `extend`, `count`, `join`
  - Audio: `music`, `stop_music`, `music_volume`, `sound`, `stop_sounds`, `master_volume`
  - Input: `pressed`, `held`, `released`, `key_pressed`, `key_held`, `key_released`, `mouse_x`, `mouse_y`, `mouse_pressed`, `mouse_held`, `mouse_released`, `touch_count`, `touch_x`, `touch_y`
  - Input Buffer: `buffer_input`, `check_buffer`, `peek_buffer`, `clear_buffer`, `clear_all_buffers`, `buffer_time`
- **Operators**: Arithmetic, comparison, logical, bitwise
- **Foundation markers**: `###` (ground for falling characters)
- **Comments**: `// single line comments`

### Falling Character Detection

The extension analyzes your code in real-time to detect unsupported characters that will "fall" when the code is processed.

- **Visual Highlighting**: Unsupported characters are highlighted with a configurable background color
- **Diagnostics**: Warnings appear in the Problems panel for each falling character
- **Hover Information**: Hover over a falling character to see an explanation
- **Falling Preview**: Use the command palette to see what your code will look like after processing

## Commands

- **Ragelang: Show Falling Preview** - Opens a preview showing what your code looks like after characters fall

## Settings

- `ragelang.enableFallingHighlight`: Enable/disable highlighting of unsupported characters (default: `true`)
- `ragelang.fallingHighlightColor`: Background color for falling characters (default: `rgba(255, 100, 100, 0.3)`)

## What is Ragelang?

Ragelang is a unique programming language where:

1. Characters must be "supported" by characters beneath them
2. Unsupported characters fall like in a physics simulation
3. A foundation row (marked with `#`) acts as the ground
4. Characters can be supported by characters directly below or diagonally adjacent below

Example:
```ragelang
    x = 5

y = 10
###########
```

In this example, `x = 5` will fall because there's nothing supporting it, while `y = 10` is supported by the foundation.

## Installation

1. Download the `.vsix` file
2. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded file

Or install from source:
```bash
cd vscode-ragelang
npm install
npm run compile
```

Then press F5 in VS Code to launch an Extension Development Host.

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
npm run package
```

## License

MIT

