import { CanvasRenderer } from '../renderer/canvas.js';

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

export function createBuiltins(renderer: CanvasRenderer): Map<string, BuiltinFunction> {
  const builtins = new Map<string, BuiltinFunction>();

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

  // sprite(path, x, y, width, height, color)
  // If path is empty/null, draws a colored rectangle
  builtins.set('sprite', (
    path: RageValue,
    x: RageValue,
    y: RageValue,
    width: RageValue = 32,
    height: RageValue = 32,
    color: RageValue = '#ffffff'
  ) => {
    renderer.sprite(
      path ? String(path) : null, 
      Number(x), 
      Number(y), 
      Number(width),
      Number(height),
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
  builtins.set('sin', (x: RageValue) => Math.sin(Number(x)));
  builtins.set('cos', (x: RageValue) => Math.cos(Number(x)));
  builtins.set('tan', (x: RageValue) => Math.tan(Number(x)));
  builtins.set('atan2', (y: RageValue, x: RageValue) => Math.atan2(Number(y), Number(x)));
  builtins.set('sqrt', (x: RageValue) => Math.sqrt(Number(x)));
  builtins.set('pow', (base: RageValue, exp: RageValue) => Math.pow(Number(base), Number(exp)));
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

  // Time helpers (for animations)
  builtins.set('time', () => performance.now() / 1000);

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
