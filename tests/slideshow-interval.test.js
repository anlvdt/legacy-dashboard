/**
 * Property test: Validation thời gian chuyển ảnh slideshow
 * Feature: legacy-frame-upgrade, Property 15: Validation thời gian chuyển ảnh slideshow
 *
 * Validates: Requirements 8.5
 */
import { describe, it, expect, beforeEach } from 'vitest';
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

const VALID_INTERVALS = [10000, 15000, 30000, 60000];
const DEFAULT_INTERVAL = 12000;

describe('Feature: legacy-frame-upgrade, Property 15: Validation thời gian chuyển ảnh slideshow', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModules();
  });

  /**
   * Property 15a: Valid intervals are accepted as-is.
   * For any value in {10000, 15000, 30000, 60000}, validateInterval returns that value.
   *
   * **Validates: Requirements 8.5**
   */
  it('accepts only valid intervals {10000, 15000, 30000, 60000}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_INTERVALS),
        (interval) => {
          const result = globalThis.LF.slideshow.validateInterval(interval);
          expect(result).toBe(interval);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15b: Any value NOT in {10000, 15000, 30000, 60000} falls back to 12000.
   *
   * **Validates: Requirements 8.5**
   */
  it('returns default 12000 for any value outside valid set', () => {
    fc.assert(
      fc.property(
        fc.anything().filter(
          (v) => !VALID_INTERVALS.includes(v)
        ),
        (interval) => {
          const result = globalThis.LF.slideshow.validateInterval(interval);
          expect(result).toBe(DEFAULT_INTERVAL);
        }
      ),
      { numRuns: 100 }
    );
  });
});
