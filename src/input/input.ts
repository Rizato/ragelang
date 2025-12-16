/**
 * Unified Input Manager for Ragelang
 * Handles keyboard, mouse, touch, and gamepad input
 */

export interface InputOptions {
  canvas?: HTMLCanvasElement | null;
}

// Action mappings for unified input
const ACTION_KEYS: Record<string, string[]> = {
  'left': ['ArrowLeft', 'KeyA'],
  'right': ['ArrowRight', 'KeyD'],
  'up': ['ArrowUp', 'KeyW'],
  'down': ['ArrowDown', 'KeyS'],
  'jump': ['Space', 'KeyZ'],
  'action': ['Enter', 'KeyX'],
  'start': ['Escape'],
  'select': ['Tab'],
  'a': ['Space', 'KeyZ'],
  'b': ['Enter', 'KeyX'],
};

// Gamepad button indices (standard mapping)
const GAMEPAD_ACTIONS: Record<string, number[]> = {
  'jump': [0],     // A/Cross
  'action': [1],   // B/Circle
  'a': [0],
  'b': [1],
  'start': [9],
  'select': [8],
};

// Gamepad axes for directions
const GAMEPAD_AXIS_THRESHOLD = 0.5;

export class InputManager {
  private canvas: HTMLCanvasElement | null = null;
  
  // Keyboard state
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();  // Just pressed this frame
  private keysReleased: Set<string> = new Set(); // Just released this frame
  
  // Mouse/Touch state
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseButtons: Set<number> = new Set();
  private mouseJustPressed: Set<number> = new Set();
  private mouseJustReleased: Set<number> = new Set();
  
  // Touch state (for mobile)
  private touches: Map<number, { x: number; y: number }> = new Map();
  private touchJustStarted: boolean = false;
  private touchJustEnded: boolean = false;
  
  // Gamepad state
  private gamepadIndex: number | null = null;
  private prevGamepadButtons: boolean[] = [];
  
  // Input buffer for platformer mechanics (action -> expiry timestamp)
  private inputBuffer: Map<string, number> = new Map();
  
  // Frame tracking
  private initialized: boolean = false;

  constructor(options: InputOptions = {}) {
    if (options.canvas) {
      this.setCanvas(options.canvas);
    }
  }

  /**
   * Set the canvas element for mouse/touch input
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.init();
  }

  /**
   * Initialize input listeners
   */
  private init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    
    // Mouse events (on canvas or window)
    const target = this.canvas || window;
    target.addEventListener('mousedown', this.onMouseDown as EventListener);
    target.addEventListener('mouseup', this.onMouseUp as EventListener);
    target.addEventListener('mousemove', this.onMouseMove as EventListener);
    
    // Touch events
    target.addEventListener('touchstart', this.onTouchStart as EventListener);
    target.addEventListener('touchend', this.onTouchEnd as EventListener);
    target.addEventListener('touchmove', this.onTouchMove as EventListener);
    
    // Gamepad events
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    
    // Prevent context menu on right-click
    if (this.canvas) {
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    this.initialized = true;
  }

  /**
   * Update input state - call this at the START of each frame
   */
  update(): void {
    // Clear per-frame state
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mouseJustPressed.clear();
    this.mouseJustReleased.clear();
    this.touchJustStarted = false;
    this.touchJustEnded = false;
    
    // Poll gamepad
    this.pollGamepad();
  }

  /**
   * Clean up at end of frame - call this at the END of each frame
   */
  endFrame(): void {
    // This is where we'd clear "just pressed" state if we tracked it differently
  }

  // ============ Unified Action Input ============

  /**
   * Check if an action was just pressed this frame
   */
  pressed(action: string): boolean {
    // Check keyboard
    const keys = ACTION_KEYS[action.toLowerCase()];
    if (keys) {
      for (const key of keys) {
        if (this.keysPressed.has(key)) return true;
      }
    }
    
    // Check gamepad
    if (this.isGamepadActionPressed(action)) return true;
    
    return false;
  }

  /**
   * Check if an action is currently held
   */
  held(action: string): boolean {
    // Check keyboard
    const keys = ACTION_KEYS[action.toLowerCase()];
    if (keys) {
      for (const key of keys) {
        if (this.keysDown.has(key)) return true;
      }
    }
    
    // Check gamepad buttons
    if (this.isGamepadActionHeld(action)) return true;
    
    // Check gamepad axes for directional actions
    if (this.isGamepadDirectionHeld(action)) return true;
    
    return false;
  }

  /**
   * Check if an action was just released this frame
   */
  released(action: string): boolean {
    const keys = ACTION_KEYS[action.toLowerCase()];
    if (keys) {
      for (const key of keys) {
        if (this.keysReleased.has(key)) return true;
      }
    }
    
    // Check gamepad
    if (this.isGamepadActionReleased(action)) return true;
    
    return false;
  }

  // ============ Raw Keyboard Input ============

  /**
   * Check if a specific key was just pressed
   */
  keyPressed(key: string): boolean {
    return this.keysPressed.has(this.normalizeKey(key));
  }

  /**
   * Check if a specific key is held
   */
  keyHeld(key: string): boolean {
    return this.keysDown.has(this.normalizeKey(key));
  }

  /**
   * Check if a specific key was just released
   */
  keyReleased(key: string): boolean {
    return this.keysReleased.has(this.normalizeKey(key));
  }

  private normalizeKey(key: string): string {
    // Handle common key names
    const keyMap: Record<string, string> = {
      'space': 'Space',
      'enter': 'Enter',
      'escape': 'Escape',
      'tab': 'Tab',
      'shift': 'ShiftLeft',
      'ctrl': 'ControlLeft',
      'alt': 'AltLeft',
      'left': 'ArrowLeft',
      'right': 'ArrowRight',
      'up': 'ArrowUp',
      'down': 'ArrowDown',
    };
    
    const lower = key.toLowerCase();
    if (keyMap[lower]) return keyMap[lower];
    
    // Single letter keys
    if (key.length === 1) return `Key${key.toUpperCase()}`;
    
    return key;
  }

  // ============ Input Buffer (Platformer Mechanic) ============

  /**
   * Buffer an input for a given duration.
   * Useful for jump buffering - if player presses jump slightly before landing,
   * the jump will still happen when they land.
   * @param action - The action to buffer (e.g., "jump")
   * @param duration - How long to buffer in seconds (e.g., 0.1 for 100ms)
   */
  bufferInput(action: string, duration: number): void {
    const expiryTime = performance.now() + (duration * 1000);
    this.inputBuffer.set(action.toLowerCase(), expiryTime);
  }

  /**
   * Check if an action is buffered and consume it.
   * Returns true if the action was buffered and hasn't expired.
   * Clears the buffer after checking (consume on use).
   * @param action - The action to check
   */
  checkBuffer(action: string): boolean {
    const key = action.toLowerCase();
    const expiry = this.inputBuffer.get(key);
    
    if (expiry === undefined) return false;
    
    // Check if buffer has expired
    if (performance.now() > expiry) {
      this.inputBuffer.delete(key);
      return false;
    }
    
    // Consume the buffer
    this.inputBuffer.delete(key);
    return true;
  }

  /**
   * Check if an action is buffered WITHOUT consuming it.
   * @param action - The action to check
   */
  peekBuffer(action: string): boolean {
    const key = action.toLowerCase();
    const expiry = this.inputBuffer.get(key);
    
    if (expiry === undefined) return false;
    
    // Check if buffer has expired
    if (performance.now() > expiry) {
      this.inputBuffer.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear a specific buffered action.
   * @param action - The action to clear
   */
  clearBuffer(action: string): void {
    this.inputBuffer.delete(action.toLowerCase());
  }

  /**
   * Clear all buffered inputs.
   */
  clearAllBuffers(): void {
    this.inputBuffer.clear();
  }

  /**
   * Get remaining buffer time for an action in seconds.
   * Returns 0 if not buffered or expired.
   * @param action - The action to check
   */
  getBufferTime(action: string): number {
    const key = action.toLowerCase();
    const expiry = this.inputBuffer.get(key);
    
    if (expiry === undefined) return 0;
    
    const remaining = (expiry - performance.now()) / 1000;
    if (remaining <= 0) {
      this.inputBuffer.delete(key);
      return 0;
    }
    
    return remaining;
  }

  // ============ Mouse Input ============

  /**
   * Get mouse X position relative to canvas
   */
  getMouseX(): number {
    return this.mouseX;
  }

  /**
   * Get mouse Y position relative to canvas
   */
  getMouseY(): number {
    return this.mouseY;
  }

  /**
   * Check if mouse button was just pressed (0=left, 1=middle, 2=right)
   */
  mousePressed(button: number = 0): boolean {
    return this.mouseJustPressed.has(button) || (button === 0 && this.touchJustStarted);
  }

  /**
   * Check if mouse button is held
   */
  mouseHeld(button: number = 0): boolean {
    return this.mouseButtons.has(button) || (button === 0 && this.touches.size > 0);
  }

  /**
   * Check if mouse button was just released
   */
  mouseReleased(button: number = 0): boolean {
    return this.mouseJustReleased.has(button) || (button === 0 && this.touchJustEnded);
  }

  // ============ Touch Input ============

  /**
   * Get number of active touches
   */
  getTouchCount(): number {
    return this.touches.size;
  }

  /**
   * Get touch position by index
   */
  getTouchPosition(index: number): { x: number; y: number } | null {
    const touches = Array.from(this.touches.values());
    return touches[index] || null;
  }

  // ============ Gamepad Input ============

  private pollGamepad(): void {
    if (this.gamepadIndex === null) return;
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];
    
    if (!gamepad) return;
    
    // Update button state for press/release detection
    const currentButtons = gamepad.buttons.map(b => b.pressed);
    this.prevGamepadButtons = currentButtons;
  }

  private getGamepad(): Gamepad | null {
    if (this.gamepadIndex === null) return null;
    const gamepads = navigator.getGamepads();
    return gamepads[this.gamepadIndex] || null;
  }

  private isGamepadActionPressed(action: string): boolean {
    const gamepad = this.getGamepad();
    if (!gamepad) return false;
    
    const buttons = GAMEPAD_ACTIONS[action.toLowerCase()];
    if (!buttons) return false;
    
    for (const btnIndex of buttons) {
      const current = gamepad.buttons[btnIndex]?.pressed ?? false;
      const prev = this.prevGamepadButtons[btnIndex] ?? false;
      if (current && !prev) return true;
    }
    
    return false;
  }

  private isGamepadActionHeld(action: string): boolean {
    const gamepad = this.getGamepad();
    if (!gamepad) return false;
    
    const buttons = GAMEPAD_ACTIONS[action.toLowerCase()];
    if (!buttons) return false;
    
    for (const btnIndex of buttons) {
      if (gamepad.buttons[btnIndex]?.pressed) return true;
    }
    
    return false;
  }

  private isGamepadActionReleased(action: string): boolean {
    const gamepad = this.getGamepad();
    if (!gamepad) return false;
    
    const buttons = GAMEPAD_ACTIONS[action.toLowerCase()];
    if (!buttons) return false;
    
    for (const btnIndex of buttons) {
      const current = gamepad.buttons[btnIndex]?.pressed ?? false;
      const prev = this.prevGamepadButtons[btnIndex] ?? false;
      if (!current && prev) return true;
    }
    
    return false;
  }

  private isGamepadDirectionHeld(action: string): boolean {
    const gamepad = this.getGamepad();
    if (!gamepad) return false;
    
    const axes = gamepad.axes;
    const lowerAction = action.toLowerCase();
    
    // Left stick (axes 0, 1) and D-pad (buttons 12-15)
    switch (lowerAction) {
      case 'left':
        return axes[0] < -GAMEPAD_AXIS_THRESHOLD || gamepad.buttons[14]?.pressed;
      case 'right':
        return axes[0] > GAMEPAD_AXIS_THRESHOLD || gamepad.buttons[15]?.pressed;
      case 'up':
        return axes[1] < -GAMEPAD_AXIS_THRESHOLD || gamepad.buttons[12]?.pressed;
      case 'down':
        return axes[1] > GAMEPAD_AXIS_THRESHOLD || gamepad.buttons[13]?.pressed;
    }
    
    return false;
  }

  // ============ Event Handlers ============

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keysDown.has(e.code)) {
      this.keysPressed.add(e.code);
    }
    this.keysDown.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
    this.keysReleased.add(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.mouseButtons.add(e.button);
    this.mouseJustPressed.add(e.button);
    this.updateMousePosition(e);
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.mouseButtons.delete(e.button);
    this.mouseJustReleased.add(e.button);
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMousePosition(e);
  };

  private updateMousePosition(e: MouseEvent): void {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    } else {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }
  }

  private onTouchStart = (e: TouchEvent): void => {
    this.touchJustStarted = true;
    this.updateTouches(e);
    
    // Use first touch as mouse position
    if (e.touches.length > 0) {
      this.updateTouchPosition(e.touches[0]);
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length === 0) {
      this.touchJustEnded = true;
      this.touches.clear();
    } else {
      this.updateTouches(e);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    this.updateTouches(e);
    
    if (e.touches.length > 0) {
      this.updateTouchPosition(e.touches[0]);
    }
  };

  private updateTouches(e: TouchEvent): void {
    this.touches.clear();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      let x = touch.clientX;
      let y = touch.clientY;
      
      if (this.canvas) {
        const rect = this.canvas.getBoundingClientRect();
        x -= rect.left;
        y -= rect.top;
      }
      
      this.touches.set(touch.identifier, { x, y });
    }
  }

  private updateTouchPosition(touch: Touch): void {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
    } else {
      this.mouseX = touch.clientX;
      this.mouseY = touch.clientY;
    }
  }

  private onGamepadConnected = (e: GamepadEvent): void => {
    console.log('Gamepad connected:', e.gamepad.id);
    this.gamepadIndex = e.gamepad.index;
  };

  private onGamepadDisconnected = (e: GamepadEvent): void => {
    console.log('Gamepad disconnected:', e.gamepad.id);
    if (this.gamepadIndex === e.gamepad.index) {
      this.gamepadIndex = null;
      this.prevGamepadButtons = [];
    }
  };

  /**
   * Clean up event listeners
   */
  dispose(): void {
    if (typeof window === 'undefined') return;
    
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    
    const target = this.canvas || window;
    target.removeEventListener('mousedown', this.onMouseDown as EventListener);
    target.removeEventListener('mouseup', this.onMouseUp as EventListener);
    target.removeEventListener('mousemove', this.onMouseMove as EventListener);
    target.removeEventListener('touchstart', this.onTouchStart as EventListener);
    target.removeEventListener('touchend', this.onTouchEnd as EventListener);
    target.removeEventListener('touchmove', this.onTouchMove as EventListener);
    
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    
    this.initialized = false;
  }
}

