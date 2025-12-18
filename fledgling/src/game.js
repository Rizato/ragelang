import { Ragelang } from 'assets/js/ragelange.bundle.js';

let ragelang = null;
let gameCode = '';
let currentScenePath = 'assets/rage/menu.rage'; // Start with menu
let isEditorOpen = false;

// Load rage code from a path
async function loadRageCode(path) {
  try {
    const response = await fetch(path);
    const code = await response.text();
    return code;
  } catch (error) {
    console.error(`Failed to load rage code from ${path}:`, error);
    return null;
  }
}

// Show confirmation dialog
function showConfirm(message, onConfirm) {
  const dialog = document.getElementById('confirm-dialog');
  const messageEl = document.getElementById('confirm-message');
  const yesBtn = document.getElementById('confirm-yes');
  const noBtn = document.getElementById('confirm-no');

  messageEl.textContent = message;
  dialog.classList.add('active');

  const cleanup = () => {
    dialog.classList.remove('active');
    yesBtn.removeEventListener('click', handleYes);
    noBtn.removeEventListener('click', handleNo);
  };

  const handleYes = () => {
    cleanup();
    onConfirm();
  };

  const handleNo = () => {
    cleanup();
  };

  yesBtn.addEventListener('click', handleYes);
  noBtn.addEventListener('click', handleNo);
}

// Load and run a scene
async function loadScene(path) {
  const canvas = document.getElementById('game-canvas');
  
  // Stop current game if running
  if (ragelang) {
    ragelang.stop();
    ragelang = null;
  }
  
  currentScenePath = path;
  
  // Load scene code
  const code = await loadRageCode(path);
  if (!code) {
    console.error(`Failed to load scene: ${path}`);
    return;
  }
  
  gameCode = code;

  // Initialize Ragelang with scene change callback
  ragelang = new Ragelang({
    canvas: canvas,
    width: canvas.width,
    height: canvas.height,
    onSceneChange: (newPath) => {
      console.log(`Loading scene: ${newPath}`);
      loadScene(newPath);
    }
  });

  // Inject screen dimensions into game code
  const modifiedCode = code.replace(
    /screen_w = \d+/,
    `screen_w = ${canvas.width}`
  ).replace(
    /screen_h = \d+/,
    `screen_h = ${canvas.height}`
  );

  // Run the scene
  ragelang.run(modifiedCode);
  ragelang.start();
}

// Initialize and run game
async function initGame() {
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  // Set canvas to full screen
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Load the initial scene (menu)
  await loadScene(currentScenePath);
}

// Restart game (reloads current scene)
function restartGame() {
  isEditorOpen = false;
  document.getElementById('code-editor-overlay').classList.remove('active');
  
  loadScene(currentScenePath);
}

// Setup editor
function setupEditor() {
  const editorToggle = document.getElementById('editor-toggle');
  const editorOverlay = document.getElementById('code-editor-overlay');
  const editor = document.getElementById('code-editor');
  const saveBtn = document.getElementById('code-save-btn');
  const cancelBtn = document.getElementById('code-cancel-btn');

  // Toggle editor
  editorToggle.addEventListener('click', () => {
    if (isEditorOpen) {
      editorOverlay.classList.remove('active');
      isEditorOpen = false;
      if (ragelang) {
        ragelang.start();
      }
    } else {
      editorOverlay.classList.add('active');
      isEditorOpen = true;
      editor.value = gameCode;
      if (ragelang) {
        ragelang.stop();
      }
    }
  });

  // Save and restart
  saveBtn.addEventListener('click', () => {
    showConfirm(
      'Restarting the game will reset your progress. Are you sure?',
      () => {
        gameCode = editor.value;
        restartGame();
      }
    );
  });

  // Cancel
  cancelBtn.addEventListener('click', () => {
    editorOverlay.classList.remove('active');
    isEditorOpen = false;
    if (ragelang) {
      ragelang.start();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isEditorOpen) {
      editorOverlay.classList.remove('active');
      isEditorOpen = false;
      if (ragelang) {
        ragelang.start();
      }
    }
  });
}

// Initialize everything
async function main() {
  setupEditor();
  await initGame();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
