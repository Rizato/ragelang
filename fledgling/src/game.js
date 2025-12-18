const { Ragelang } = window.RagelangLib;

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

// Initialize and run game
async function initGame() {
  const canvas = document.getElementById('game-canvas');

  // Set canvas to full screen
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Reinitialize ragelang if canvas size changes and we have a running game
    if (ragelang && ragelang.isGameRunning()) {
      loadInitialScene();
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Load the initial scene
  await loadInitialScene();
}

// Load the initial scene (menu)
async function loadInitialScene() {
  const canvas = document.getElementById('game-canvas');
  
  // Stop and clean up existing instance
  if (ragelang) {
    ragelang.stop();
  }
  
  // Load initial scene code
  const code = await loadRageCode(currentScenePath);
  if (!code) {
    console.error(`Failed to load initial scene: ${currentScenePath}`);
    return;
  }
  
  gameCode = code;

  // Initialize Ragelang - scene loading is now handled internally
  // Just provide basePath for resolving relative paths in load_scene()
  ragelang = new Ragelang({
    canvas: canvas,
    width: canvas.width,
    height: canvas.height,
    basePath: '' // Paths are relative to index.html location
  });

  // Make canvas focusable and focus it to capture keyboard input
  canvas.setAttribute('tabindex', '0');
  canvas.focus();
  
  // Re-focus canvas when it loses focus (e.g., after clicking elsewhere)
  canvas.addEventListener('blur', () => {
    // Only refocus if editor is not open
    if (!isEditorOpen) {
      canvas.focus();
    }
  });

  // Make canvas focusable and focus it to capture keyboard input
  canvas.setAttribute('tabindex', '0');
  canvas.focus();
  
  // Re-focus canvas when it loses focus (e.g., after clicking elsewhere)
  canvas.addEventListener('blur', () => {
    // Only refocus if editor is not open
    if (!isEditorOpen) {
      canvas.focus();
    }
  });

  // Run the scene
  // Note: ragelang.run() automatically runs the FallingProcessor preprocessor
  // before tokenizing, parsing, and interpreting the code
  ragelang.run(code);
  ragelang.start();
}

// Restart game (reloads current scene from editor)
function restartGame() {
  isEditorOpen = false;
  document.getElementById('code-editor-overlay').classList.remove('active');
  
  const canvas = document.getElementById('game-canvas');
  
  if (ragelang) {
    ragelang.stop();
  }
  
  // Reinitialize with edited code
  ragelang = new Ragelang({
    canvas: canvas,
    width: canvas.width,
    height: canvas.height,
    basePath: ''
  });
  
  // Ensure canvas is focusable and focused
  canvas.setAttribute('tabindex', '0');
  canvas.focus();
  
  ragelang.run(gameCode);
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
    const canvas = document.getElementById('game-canvas');
    editorOverlay.classList.remove('active');
    isEditorOpen = false;
    if (ragelang) {
      ragelang.start();
    }
    // Refocus canvas when canceling editor
    canvas.focus();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isEditorOpen) {
      const canvas = document.getElementById('game-canvas');
      editorOverlay.classList.remove('active');
      isEditorOpen = false;
      if (ragelang) {
        ragelang.start();
      }
      // Refocus canvas when closing editor with Escape
      canvas.focus();
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
