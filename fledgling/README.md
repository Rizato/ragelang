# Fledgling

A Ragelang game where you play as a fledgling bird trying to return to its nest at the top of a tree.

## Features

- Full physics system with momentum
- Coyote time and jump buffering for responsive controls
- Glide mechanics with buffering
- Multi-environment level progression
- In-game pause menu and settings
- Code editor for live editing

## Controls

- **Jump**: Space / Controller A (PS X)
- **Left**: A / Left Stick Left
- **Right**: D / Left Stick Right
- **Menu**: ESC / Controller Start
- **Glide**: Hold Space while falling
- **Interact**: E / Controller X (PS Square)

## Running

### Development Mode

From the `ragelang` directory:

1. **Quick start** (builds once and serves):
   ```bash
   npm run fledgling:dev
   ```

2. **With watch mode** (rebuilds on TypeScript changes):
   ```bash
   # Terminal 1: Watch TypeScript
   npm run dev
   
   # Terminal 2: Serve Fledgling
   npm run fledgling:serve
   ```

3. Open `http://localhost:8080` in your browser

### Production Build

```bash
npm run fledgling:build
npm run fledgling:serve
```

### Manual Setup

If you prefer to run commands manually:

1. Build the Ragelang library:
   ```bash
   npm run build:all
   ```

2. Serve the fledgling directory:
   ```bash
   npm run fledgling:serve
   ```

## Structure

```
fledgling/
├── index.html          # Main game page
├── fledgling.rage      # Game code in Ragelang
├── src/
│   └── game.js        # JavaScript wrapper
├── assets/
│   ├── css/
│   │   └── style.css  # Styles
│   ├── sprites/       # Sprite assets (empty for now)
│   └── sounds/        # Sound assets (empty for now)
└── README.md
```

## Editing Code

Click the "Edit Code" button in the bottom right to open the code editor. Make changes and click "Save & Restart" to apply them.

