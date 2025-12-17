import { Ragelang } from '../dist/index.js';

let ragelang = null;
let gameCode = '';
let isEditorOpen = false;

// Load game code
async function loadGameCode() {
  try {
    const response = await fetch('fledgling.rage');
    gameCode = await response.text();
    return gameCode;
  } catch (error) {
    console.error('Failed to load game code:', error);
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

  // Load game code
  const code = await loadGameCode();
  if (!code) {
    alert('Failed to load game code. Please ensure fledgling.rage exists.');
    return;
  }

  // Initialize Ragelang
  ragelang = new Ragelang({
    canvas: canvas,
    width: canvas.width,
    height: canvas.height
  });

  // Inject screen dimensions into game code
  const modifiedCode = code.replace(
    /screen_w = \d+/,
    `screen_w = ${canvas.width}`
  ).replace(
    /screen_h = \d+/,
    `screen_h = ${canvas.height}`
  );

  // Run the game
  ragelang.run(modifiedCode);
  ragelang.start();
}

// Restart game
function restartGame() {
  if (ragelang) {
    ragelang.stop();
    ragelang = null;
  }

  isEditorOpen = false;
  document.getElementById('code-editor-overlay').classList.remove('active');

  const canvas = document.getElementById('game-canvas');
  
  // Initialize Ragelang again
  ragelang = new Ragelang({
    canvas: canvas,
    width: canvas.width,
    height: canvas.height
  });

  // Inject screen dimensions
  const modifiedCode = gameCode.replace(
    /screen_w = \d+/,
    `screen_w = ${canvas.width}`
  ).replace(
    /screen_h = \d+/,
    `screen_h = ${canvas.height}`
  );

  ragelang.run(modifiedCode);
  ragelang.start();
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
