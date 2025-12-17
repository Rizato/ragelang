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

1. Build the Ragelang library:
   ```bash
   cd ragelang
   npm run build:all
   ```

2. Serve the fledgling directory:
   ```bash
   cd fledgling
   npx serve@latest -l 8080
   ```

3. Open `http://localhost:8080` in your browser

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

