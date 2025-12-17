import { Ragelang } from '../dist/index.js';

let ragelang = null;
let gameCode = '';
let isPaused = false;
let currentMenu = null;

// Settings
const settings = {
  sfxVolume: 50,
  musicVolume: 50
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('fledgling-settings');
  if (saved) {
    Object.assign(settings, JSON.parse(saved));
  }
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('fledgling-settings', JSON.stringify(settings));
}

// Initialize settings UI
function initSettings() {
  const sfxSlider = document.getElementById('sfx-slider');
  const musicSlider = document.getElementById('music-slider');
  const sfxValue = document.getElementById('sfx-value');
  const musicValue = document.getElementById('music-value');

  sfxSlider.value = settings.sfxVolume;
  musicSlider.value = settings.musicVolume;
  sfxValue.textContent = settings.sfxVolume + '%';
  musicValue.textContent = settings.musicVolume + '%';

  sfxSlider.addEventListener('input', (e) => {
    settings.sfxVolume = parseInt(e.target.value);
    sfxValue.textContent = settings.sfxVolume + '%';
    saveSettings();
    // Update audio manager if available
    if (ragelang) {
      const interpreter = ragelang.getInterpreter?.();
      if (interpreter) {
        // Set master volume for SFX (music is separate)
        // This would need to be exposed through the interpreter
      }
    }
  });

  musicSlider.addEventListener('input', (e) => {
    settings.musicVolume = parseInt(e.target.value);
    musicValue.textContent = settings.musicVolume + '%';
    saveSettings();
    // Update music volume
    if (ragelang) {
      const interpreter = ragelang.getInterpreter?.();
      if (interpreter) {
        // Set music volume
        // This would need to be exposed through the interpreter
      }
    }
  });
}

// Show menu
function showMenu(menuId) {
  hideAllMenus();
  const menu = document.getElementById(menuId);
  if (menu) {
    menu.classList.add('active');
    currentMenu = menuId;
    isPaused = true;
    if (ragelang) {
      ragelang.stop();
    }
  }
}

// Hide all menus
function hideAllMenus() {
  document.querySelectorAll('.menu-overlay').forEach(menu => {
    menu.classList.remove('active');
  });
  currentMenu = null;
}

// Resume game
function resumeGame() {
  hideAllMenus();
  isPaused = false;
  if (ragelang) {
    ragelang.start();
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

// Initialize and run game
async function initGame() {
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  // Set canvas to full screen
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (ragelang) {
      // Update screen dimensions in game
      const context = ragelang.getRenderContext();
      if (context) {
        // The renderer should handle this, but we might need to update game vars
      }
    }
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

  // Update height display periodically
  updateHeightDisplay();
}

// Update height display
function updateHeightDisplay() {
  if (!ragelang || isPaused) {
    requestAnimationFrame(updateHeightDisplay);
    return;
  }

  try {
    // Get render context to access canvas
    const context = ragelang.getRenderContext();
    if (context) {
      const canvas = context.canvas;
      // We can't directly access game variables, so we'll calculate from canvas
      // The game code should display height, but we can also try to read it
      // For now, we'll let the game handle the display
    }
  } catch (e) {
    // Ignore errors
  }

  requestAnimationFrame(updateHeightDisplay);
}

// Setup menu event listeners
function setupMenus() {
  // Pause menu
  document.getElementById('resume-btn').addEventListener('click', resumeGame);
  document.getElementById('settings-btn').addEventListener('click', () => {
    showMenu('settings-menu');
  });
  document.getElementById('edit-code-btn').addEventListener('click', () => {
    showMenu('code-editor-menu');
    const editor = document.getElementById('code-editor');
    editor.value = gameCode;
  });

  // Settings menu
  document.getElementById('settings-back-btn').addEventListener('click', () => {
    showMenu('pause-menu');
  });

  // Code editor
  document.getElementById('code-save-btn').addEventListener('click', () => {
    showConfirm(
      'Restarting the game will reset your progress. Are you sure?',
      () => {
        const editor = document.getElementById('code-editor');
        gameCode = editor.value;
        restartGame();
      }
    );
  });

  document.getElementById('code-cancel-btn').addEventListener('click', () => {
    showMenu('pause-menu');
  });

  // Handle ESC key for pause
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !isPaused) {
      showMenu('pause-menu');
    } else if (e.key === 'Escape' && currentMenu === 'pause-menu') {
      resumeGame();
    } else if (e.key === 'Escape' && currentMenu) {
      if (currentMenu === 'settings-menu' || currentMenu === 'code-editor-menu') {
        showMenu('pause-menu');
      }
    }
  });

  // Handle gamepad start button
  window.addEventListener('gamepadconnected', () => {
    // Gamepad input is handled by the InputManager in Ragelang
  });
}

// Restart game
function restartGame() {
  if (ragelang) {
    ragelang.stop();
    ragelang = null;
  }

  hideAllMenus();
  isPaused = false;

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

// Initialize everything
async function main() {
  loadSettings();
  initSettings();
  setupMenus();
  await initGame();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

