import { CanvasRenderer } from '../renderer/canvas.js';

/**
 * Built-in functions for Ragelang
 */

export type BuiltinFunction = (...args: RageValue[]) => RageValue;

export type RageValue = 
  | number 
  | string 
  | boolean 
  | null 
  | RagePrototype 
  | BuiltinFunction
  | RageValue[];

export interface RagePrototype {
  __type: 'prototype';
  [key: string]: RageValue;
}

export function createBuiltins(renderer: CanvasRenderer): Map<string, BuiltinFunction> {
  const builtins = new Map<string, BuiltinFunction>();

  // Drawing functions
  builtins.set('text', (text: RageValue, x: RageValue, y: RageValue, color: RageValue = '#ffffff') => {
    renderer.text(String(text), Number(x), Number(y), String(color));
    return null;
  });

  builtins.set('sprite', (
    path: RageValue,
    x: RageValue,
    y: RageValue,
    color: RageValue = '#ffffff',
    outline: RageValue = false
  ) => {
    renderer.sprite(String(path), Number(x), Number(y), String(color), Boolean(outline));
    return null;
  });

  builtins.set('clear', (color: RageValue = '#000000') => {
    renderer.clear(String(color));
    return null;
  });

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
  builtins.set('sin', (x: RageValue) => Math.sin(Number(x)));
  builtins.set('cos', (x: RageValue) => Math.cos(Number(x)));
  builtins.set('sqrt', (x: RageValue) => Math.sqrt(Number(x)));
  builtins.set('pow', (base: RageValue, exp: RageValue) => Math.pow(Number(base), Number(exp)));
  builtins.set('random', () => Math.random());

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

