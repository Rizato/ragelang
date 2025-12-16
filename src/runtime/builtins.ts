import { CanvasRenderer } from '../renderer/canvas.js';
import { AudioManager } from '../audio/audio.js';
import { InputManager } from '../input/input.js';

/**
 * Built-in functions for Ragelang
 */

export type BuiltinFunction = (...args: RageValue[]) => RageValue;

export interface RageFunction {
  __type: 'function';
  name: string;
  parameters: string[];
  body: unknown; // BlockStatement - avoid circular import
  closure: unknown; // Environment - avoid circular import
}

// Enum type definition (created by enum declaration)
export interface RageEnum {
  __type: 'enum';
  name: string;
  variants: Map<string, RageEnumVariantDef>;
}

// Enum variant definition (the "constructor" for a variant)
export interface RageEnumVariantDef {
  __type: 'enum_variant_def';
  enumName: string;
  variantName: string;
  fields: string[];  // Field names for data variants
}

// Enum variant instance (an actual value of an enum type)
export interface RageEnumVariant {
  __type: 'enum_variant';
  enumName: string;
  variantName: string;
  data: Map<string, RageValue>;  // Field name -> value
}

export type RageValue = 
  | number 
  | string 
  | boolean 
  | null 
  | RagePrototype 
  | RageFunction
  | RageEnum
  | RageEnumVariantDef
  | RageEnumVariant
  | BuiltinFunction
  | RageValue[];

export interface RagePrototype {
  __type: 'prototype';
  [key: string]: RageValue;
}

export function createBuiltins(
  renderer: CanvasRenderer, 
  audio?: AudioManager,
  input?: InputManager
): Map<string, BuiltinFunction> {
  const builtins = new Map<string, BuiltinFunction>();
  
  // Audio manager (created lazily if not provided)
  const audioManager = audio ?? new AudioManager();
  
  // Input manager (created lazily if not provided)
  const inputManager = input ?? new InputManager();

  // Drawing functions
  // text(text, x, y, size, color)
  builtins.set('text', (
    text: RageValue, 
    x: RageValue, 
    y: RageValue, 
    size: RageValue = 16, 
    color: RageValue = '#ffffff'
  ) => {
    renderer.text(String(text), Number(x), Number(y), Number(size), String(color));
    return null;
  });

  // sprite(path, x, y, width, height, sx, sy, sw, sh, color)
  // path: image path (null for colored rectangle)
  // x, y: destination position on canvas
  // width, height: destination size on canvas
  // sx, sy, sw, sh: source rectangle from sprite sheet (optional)
  // color: placeholder/fallback color
  builtins.set('sprite', (
    path: RageValue,
    x: RageValue,
    y: RageValue,
    width: RageValue = 32,
    height: RageValue = 32,
    sx: RageValue = null,
    sy: RageValue = null,
    sw: RageValue = null,
    sh: RageValue = null,
    color: RageValue = '#ffffff'
  ) => {
    renderer.sprite(
      path ? String(path) : null, 
      Number(x), 
      Number(y), 
      Number(width),
      Number(height),
      sx !== null ? Number(sx) : null,
      sy !== null ? Number(sy) : null,
      sw !== null ? Number(sw) : null,
      sh !== null ? Number(sh) : null,
      String(color)
    );
    return null;
  });

  builtins.set('clear', (color: RageValue = '#000000') => {
    renderer.clear(String(color));
    return null;
  });

  // rect(x, y, width, height, color) - draw filled rectangle
  builtins.set('rect', (
    x: RageValue,
    y: RageValue,
    width: RageValue,
    height: RageValue,
    color: RageValue
  ) => {
    renderer.rect(Number(x), Number(y), Number(width), Number(height), String(color));
    return null;
  });

  builtins.set('circle', (x: RageValue, y: RageValue, radius: RageValue, color: RageValue) => {
    renderer.circle(Number(x), Number(y), Number(radius), String(color));
    return null;
  });

  builtins.set('line', (
    x1: RageValue,
    y1: RageValue,
    x2: RageValue,
    y2: RageValue,
    color: RageValue,
    width: RageValue = 1
  ) => {
    renderer.line(Number(x1), Number(y1), Number(x2), Number(y2), String(color), Number(width));
    return null;
  });

  // Math functions
  builtins.set('abs', (x: RageValue) => Math.abs(Number(x)));
  builtins.set('floor', (x: RageValue) => Math.floor(Number(x)));
  builtins.set('ceil', (x: RageValue) => Math.ceil(Number(x)));
  builtins.set('round', (x: RageValue) => Math.round(Number(x)));
  builtins.set('min', (a: RageValue, b: RageValue) => Math.min(Number(a), Number(b)));
  builtins.set('max', (a: RageValue, b: RageValue) => Math.max(Number(a), Number(b)));
  
  // Trigonometry
  builtins.set('sin', (x: RageValue) => Math.sin(Number(x)));
  builtins.set('cos', (x: RageValue) => Math.cos(Number(x)));
  builtins.set('tan', (x: RageValue) => Math.tan(Number(x)));
  builtins.set('asin', (x: RageValue) => Math.asin(Number(x)));
  builtins.set('acos', (x: RageValue) => Math.acos(Number(x)));
  builtins.set('atan', (x: RageValue) => Math.atan(Number(x)));
  builtins.set('atan2', (y: RageValue, x: RageValue) => Math.atan2(Number(y), Number(x)));
  builtins.set('sinh', (x: RageValue) => Math.sinh(Number(x)));
  builtins.set('cosh', (x: RageValue) => Math.cosh(Number(x)));
  builtins.set('tanh', (x: RageValue) => Math.tanh(Number(x)));
  
  // Constants
  builtins.set('PI', () => Math.PI);
  builtins.set('TAU', () => Math.PI * 2);  // Full circle
  builtins.set('E', () => Math.E);
  
  // Angle conversion
  builtins.set('deg', (radians: RageValue) => Number(radians) * (180 / Math.PI));
  builtins.set('rad', (degrees: RageValue) => Number(degrees) * (Math.PI / 180));
  
  // More math
  builtins.set('sqrt', (x: RageValue) => Math.sqrt(Number(x)));
  builtins.set('pow', (base: RageValue, exp: RageValue) => Math.pow(Number(base), Number(exp)));
  builtins.set('log', (x: RageValue) => Math.log(Number(x)));
  builtins.set('log10', (x: RageValue) => Math.log10(Number(x)));
  builtins.set('exp', (x: RageValue) => Math.exp(Number(x)));
  
  // Random
  builtins.set('random', () => Math.random());
  builtins.set('randomInt', (min: RageValue, max: RageValue) => {
    const nmin = Math.floor(Number(min));
    const nmax = Math.floor(Number(max));
    return Math.floor(Math.random() * (nmax - nmin + 1)) + nmin;
  });

  // Utility functions
  builtins.set('print', (...args: RageValue[]) => {
    console.log(...args.map(a => String(a)));
    return null;
  });

  // Platformer helpers
  builtins.set('lerp', (a: RageValue, b: RageValue, t: RageValue) => {
    const na = Number(a);
    const nb = Number(b);
    const nt = Number(t);
    return na + (nb - na) * nt;
  });

  builtins.set('clamp', (value: RageValue, min: RageValue, max: RageValue) => {
    return Math.max(Number(min), Math.min(Number(max), Number(value)));
  });

  // Sign function for direction
  builtins.set('sign', (x: RageValue) => Math.sign(Number(x)));

  // Distance calculation
  builtins.set('distance', (x1: RageValue, y1: RageValue, x2: RageValue, y2: RageValue) => {
    const dx = Number(x2) - Number(x1);
    const dy = Number(y2) - Number(y1);
    return Math.sqrt(dx * dx + dy * dy);
  });

  // Collision detection helper
  builtins.set('rect_overlap', (
    x1: RageValue, y1: RageValue, w1: RageValue, h1: RageValue,
    x2: RageValue, y2: RageValue, w2: RageValue, h2: RageValue
  ) => {
    const nx1 = Number(x1), ny1 = Number(y1), nw1 = Number(w1), nh1 = Number(h1);
    const nx2 = Number(x2), ny2 = Number(y2), nw2 = Number(w2), nh2 = Number(h2);
    
    return nx1 < nx2 + nw2 && nx1 + nw1 > nx2 &&
           ny1 < ny2 + nh2 && ny1 + nh1 > ny2;
  });

  // Array helpers
  builtins.set('array', (size: RageValue = 0) => {
    const n = Math.max(0, Math.floor(Number(size)));
    return new Array(n).fill(null);
  });

  builtins.set('len', (arr: RageValue) => {
    if (Array.isArray(arr)) return arr.length;
    if (typeof arr === 'string') return arr.length;
    return 0;
  });

  builtins.set('push', (arr: RageValue, value: RageValue) => {
    if (Array.isArray(arr)) {
      arr.push(value);
      return arr.length;
    }
    return null;
  });

  builtins.set('pop', (arr: RageValue) => {
    if (Array.isArray(arr)) {
      return arr.pop() ?? null;
    }
    return null;
  });

  // sort(arr) - sorts array in place, returns the array
  builtins.set('sort', (arr: RageValue) => {
    if (Array.isArray(arr)) {
      arr.sort((a, b) => {
        // Handle different types
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        }
        return String(a).localeCompare(String(b));
      });
      return arr;
    }
    return null;
  });

  // sorted(arr) - returns a new sorted array (doesn't modify original)
  builtins.set('sorted', (arr: RageValue) => {
    if (Array.isArray(arr)) {
      const copy = [...arr];
      copy.sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        }
        return String(a).localeCompare(String(b));
      });
      return copy;
    }
    return null;
  });

  // reverse(arr) - reverses array in place, returns the array
  builtins.set('reverse', (arr: RageValue) => {
    if (Array.isArray(arr)) {
      arr.reverse();
      return arr;
    }
    return null;
  });

  // reversed(arr) - returns a new reversed array
  builtins.set('reversed', (arr: RageValue) => {
    if (Array.isArray(arr)) {
      return [...arr].reverse();
    }
    return null;
  });

  // slice(arr, start, end) - returns a slice of the array
  builtins.set('slice', (arr: RageValue, start: RageValue = 0, end: RageValue = null) => {
    if (Array.isArray(arr)) {
      const s = Number(start) | 0;
      const e = end === null ? arr.length : Number(end) | 0;
      return arr.slice(s, e);
    }
    if (typeof arr === 'string') {
      const s = Number(start) | 0;
      const e = end === null ? arr.length : Number(end) | 0;
      return arr.slice(s, e);
    }
    return null;
  });

  // index(arr, value) - returns index of value, or -1 if not found
  builtins.set('index', (arr: RageValue, value: RageValue) => {
    if (Array.isArray(arr)) {
      return arr.indexOf(value);
    }
    if (typeof arr === 'string' && typeof value === 'string') {
      return arr.indexOf(value);
    }
    return -1;
  });

  // contains(arr, value) - returns true if value is in arr
  builtins.set('contains', (arr: RageValue, value: RageValue) => {
    if (Array.isArray(arr)) {
      return arr.includes(value);
    }
    if (typeof arr === 'string' && typeof value === 'string') {
      return arr.includes(value);
    }
    return false;
  });

  // insert(arr, index, value) - inserts value at index
  builtins.set('insert', (arr: RageValue, idx: RageValue, value: RageValue) => {
    if (Array.isArray(arr)) {
      const i = Number(idx) | 0;
      arr.splice(i, 0, value);
      return arr.length;
    }
    return null;
  });

  // remove(arr, value) - removes first occurrence of value
  builtins.set('remove', (arr: RageValue, value: RageValue) => {
    if (Array.isArray(arr)) {
      const idx = arr.indexOf(value);
      if (idx !== -1) {
        arr.splice(idx, 1);
        return true;
      }
      return false;
    }
    return false;
  });

  // extend(arr, other) - adds all elements from other to arr
  builtins.set('extend', (arr: RageValue, other: RageValue) => {
    if (Array.isArray(arr) && Array.isArray(other)) {
      arr.push(...other);
      return arr.length;
    }
    return null;
  });

  // count(arr, value) - counts occurrences of value
  builtins.set('count', (arr: RageValue, value: RageValue) => {
    if (Array.isArray(arr)) {
      return arr.filter(x => x === value).length;
    }
    if (typeof arr === 'string' && typeof value === 'string') {
      return arr.split(value).length - 1;
    }
    return 0;
  });

  // join(arr, separator) - joins array elements into a string
  builtins.set('join', (arr: RageValue, sep: RageValue = ',') => {
    if (Array.isArray(arr)) {
      return arr.map(x => String(x)).join(String(sep));
    }
    return '';
  });

  // Time helpers (for animations)
  builtins.set('time', () => performance.now() / 1000);

  // Audio functions
  // music(path, volume) - plays looping background music
  // path: audio file path (null to stop)
  // volume: 0-10 (default 5)
  builtins.set('music', (path: RageValue = null, volume: RageValue = 5) => {
    audioManager.music(path ? String(path) : null, Number(volume));
    return null;
  });

  // stop_music() - stops the current music
  builtins.set('stop_music', () => {
    audioManager.stopMusic();
    return null;
  });

  // music_volume(volume) - sets music volume
  builtins.set('music_volume', (volume: RageValue) => {
    audioManager.setMusicVolume(Number(volume));
    return null;
  });

  // sound(path, gain) - plays a one-shot sound effect
  // path: audio file path
  // gain: 0-10 (default 5)
  builtins.set('sound', (path: RageValue, gain: RageValue = 5) => {
    if (path) {
      audioManager.sound(String(path), Number(gain));
    }
    return null;
  });

  // stop_sounds() - stops all currently playing sounds
  builtins.set('stop_sounds', () => {
    audioManager.stopAllSounds();
    return null;
  });

  // master_volume(volume) - sets master volume for all audio
  builtins.set('master_volume', (volume: RageValue) => {
    audioManager.setMasterVolume(Number(volume));
    return null;
  });

  // ============ Input Functions ============
  
  // pressed(action) - returns true on the frame an action starts
  // Actions: "left", "right", "up", "down", "jump", "action", "a", "b", "start", "select"
  builtins.set('pressed', (action: RageValue) => {
    return inputManager.pressed(String(action));
  });

  // held(action) - returns true while an action is held
  builtins.set('held', (action: RageValue) => {
    return inputManager.held(String(action));
  });

  // released(action) - returns true on the frame an action ends
  builtins.set('released', (action: RageValue) => {
    return inputManager.released(String(action));
  });

  // key_pressed(key) - returns true if specific key was just pressed
  builtins.set('key_pressed', (key: RageValue) => {
    return inputManager.keyPressed(String(key));
  });

  // key_held(key) - returns true while specific key is held
  builtins.set('key_held', (key: RageValue) => {
    return inputManager.keyHeld(String(key));
  });

  // key_released(key) - returns true if specific key was just released
  builtins.set('key_released', (key: RageValue) => {
    return inputManager.keyReleased(String(key));
  });

  // mouse_x() - returns mouse/touch X position
  builtins.set('mouse_x', () => {
    return inputManager.getMouseX();
  });

  // mouse_y() - returns mouse/touch Y position
  builtins.set('mouse_y', () => {
    return inputManager.getMouseY();
  });

  // mouse_pressed(button) - returns true if mouse button just pressed (0=left, 1=middle, 2=right)
  builtins.set('mouse_pressed', (button: RageValue = 0) => {
    return inputManager.mousePressed(Number(button) | 0);
  });

  // mouse_held(button) - returns true while mouse button is held
  builtins.set('mouse_held', (button: RageValue = 0) => {
    return inputManager.mouseHeld(Number(button) | 0);
  });

  // mouse_released(button) - returns true if mouse button just released
  builtins.set('mouse_released', (button: RageValue = 0) => {
    return inputManager.mouseReleased(Number(button) | 0);
  });

  // touch_count() - returns number of active touches
  builtins.set('touch_count', () => {
    return inputManager.getTouchCount();
  });

  // touch_x(index) - returns X position of touch at index
  builtins.set('touch_x', (index: RageValue = 0) => {
    const pos = inputManager.getTouchPosition(Number(index) | 0);
    return pos ? pos.x : 0;
  });

  // touch_y(index) - returns Y position of touch at index
  builtins.set('touch_y', (index: RageValue = 0) => {
    const pos = inputManager.getTouchPosition(Number(index) | 0);
    return pos ? pos.y : 0;
  });

  // ============ Input Buffer (Platformer Mechanics) ============
  
  // buffer_input(action, duration) - buffers an input for duration seconds
  // Use this for jump buffering: if player presses jump before landing,
  // the jump will still happen when they land
  builtins.set('buffer_input', (action: RageValue, duration: RageValue = 0.1) => {
    inputManager.bufferInput(String(action), Number(duration));
    return null;
  });

  // check_buffer(action) - checks if action is buffered and consumes it
  // Returns true if buffered, false otherwise
  builtins.set('check_buffer', (action: RageValue) => {
    return inputManager.checkBuffer(String(action));
  });

  // peek_buffer(action) - checks if action is buffered WITHOUT consuming it
  builtins.set('peek_buffer', (action: RageValue) => {
    return inputManager.peekBuffer(String(action));
  });

  // clear_buffer(action) - clears a specific buffered action
  builtins.set('clear_buffer', (action: RageValue) => {
    inputManager.clearBuffer(String(action));
    return null;
  });

  // clear_all_buffers() - clears all buffered inputs
  builtins.set('clear_all_buffers', () => {
    inputManager.clearAllBuffers();
    return null;
  });

  // buffer_time(action) - returns remaining buffer time in seconds
  builtins.set('buffer_time', (action: RageValue) => {
    return inputManager.getBufferTime(String(action));
  });

  return builtins;
}

/**
 * Create a new prototype object
 */
export function createPrototype(): RagePrototype {
  return { __type: 'prototype' };
}

/**
 * Check if a value is a prototype
 */
export function isPrototype(value: RageValue): value is RagePrototype {
  return typeof value === 'object' && 
         value !== null && 
         !Array.isArray(value) &&
         (value as RagePrototype).__type === 'prototype';
}

/**
 * Check if a value is an enum variant definition
 */
export function isEnumVariantDef(value: RageValue): value is RageEnumVariantDef {
  return typeof value === 'object' && 
         value !== null && 
         !Array.isArray(value) &&
         (value as RageEnumVariantDef).__type === 'enum_variant_def';
}

/**
 * Check if a value is an enum variant instance
 */
export function isEnumVariant(value: RageValue): value is RageEnumVariant {
  return typeof value === 'object' && 
         value !== null && 
         !Array.isArray(value) &&
         (value as RageEnumVariant).__type === 'enum_variant';
}

/**
 * Create an enum variant instance
 */
export function createEnumVariant(
  enumName: string,
  variantName: string,
  data: Map<string, RageValue> = new Map()
): RageEnumVariant {
  return {
    __type: 'enum_variant',
    enumName,
    variantName,
    data,
  };
}
