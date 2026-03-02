/**
 * Property test: Kích thước Picsum theo độ phân giải màn hình
 * Feature: legacy-frame-upgrade, Property 16: Kích thước Picsum theo độ phân giải màn hình
 *
 * Validates: Requirements 8.6
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);
const slideshowCode = readFileSync(
  resolve(__dirname, '../public/js/slideshow.js'),
  'utf-8'
);

function loadModules() {
  const code = utilsCode + '\n' + slideshowCode + '\n; globalThis.LF = LF;';
  const fn = new Function(code);
  fn();
}

describe('Feature: legacy-frame-upgrade, Property 16: Kích thước Picsum theo độ phân giải màn hình', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModules();
    // Ensure isLegacyDevice returns false for these tests (non-legacy)
    globalThis.LF.utils.isLegacyDevice = function () { return false; };
  });

  /**
   * Property 16a: w <= 640 → "640/480"
   *
   * **Validates: Requirements 8.6**
   */
  it('returns "640/480" for viewport width <= 640', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 640 }),
        (w) => {
          const result = globalThis.LF.slideshow.getPicsumSize(w);
          expect(result).toBe('640/480');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16b: 640 < w <= 768 → "1024/600"
   *
   * **Validates: Requirements 8.6**
   */
  it('returns "1024/600" for viewport width 641-768', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 641, max: 768 }),
        (w) => {
          const result = globalThis.LF.slideshow.getPicsumSize(w);
          expect(result).toBe('1024/600');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16c: 768 < w <= 1280 → "1280/720"
   *
   * **Validates: Requirements 8.6**
   */
  it('returns "1280/720" for viewport width 769-1280', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 769, max: 1280 }),
        (w) => {
          const result = globalThis.LF.slideshow.getPicsumSize(w);
          expect(result).toBe('1280/720');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16d: w > 1280 → "1920/1080"
   *
   * **Validates: Requirements 8.6**
   */
  it('returns "1920/1080" for viewport width > 1280', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1281, max: 7680 }),
        (w) => {
          const result = globalThis.LF.slideshow.getPicsumSize(w);
          expect(result).toBe('1920/1080');
        }
      ),
      { numRuns: 100 }
    );
  });
});
