# Ragelang

A rage-inducing programming language where unsupported characters fall. Built for [Langjam Gamejam 2025](https://langjamgamejam.com).

## What is Ragelang?

Ragelang is a unique programming language designed to give developers the frustration and rage that players experience in rage games. In Ragelang:

- **Every character must be supported** by characters beneath it, or it will fall
- **Unsupported characters fall** like in a physics simulation until they land or fall out of the program
- **A foundation row** (marked with `#`) acts as the ground
- **Characters can be supported** by characters directly below or diagonally adjacent below

### Example

```rage
print("Hello, World!")
// | | | | | | | | | |
//  | | | |   | | | |
//   | | |     | | |
//    | |       | |
//     |         |
##     #         #
```

## Installation

Install via npm:

```bash
npm install ragelang
```

Or use the bundled version in the browser:

```html
<script src="https://unpkg.com/ragelang/dist/ragelang.bundle.min.js"></script>
```

## Usage

### Node.js / TypeScript

```typescript
import { Ragelang } from 'ragelang';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ragelang = new Ragelang({ canvas, width: 800, height: 600 });

const code = `
draw {
  clear("#1a1a2e")
  circle(400, 300, 50, "#ff3366")
}
####################
`;

ragelang.run(code);
ragelang.start();
```

### Browser (IIFE Bundle)

```html
<script src="https://unpkg.com/ragelang/dist/ragelang.bundle.min.js"></script>
<script>
  const { Ragelang } = window.RagelangLib;
  const canvas = document.getElementById('canvas');
  const ragelang = new Ragelang({ canvas, width: 800, height: 600 });
  
  ragelang.run(code);
  ragelang.start();
</script>
```

## Features

- **Game-focused DSL**: Built-in support for 2D game development
- **Drawing functions**: `clear()`, `rect()`, `circle()`, `line()`, `text()`, `sprite()`
- **Input handling**: Keyboard, mouse, gamepad, and touch support
- **Audio**: `music()`, `sound()` with volume control
- **Pattern matching**: Rust-style enums and pattern matching
- **Scene management**: `load_scene()` for switching between game states

## Resources

- **Website**: [https://ragelang.com/](https://ragelang.com/)
- **Playground**: [https://ragelang.com/playground/](https://ragelang.com/playground/)
- **Documentation**: [https://ragelang.com/docs/](https://ragelang.com/docs/)
- **NPM Package**: [https://www.npmjs.com/package/ragelang](https://www.npmjs.com/package/ragelang)
- **GitHub**: [https://github.com/Rizato/ragelang](https://github.com/Rizato/ragelang)

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Build bundle
npm run bundle

# Run tests
npm test


## License
MIT
