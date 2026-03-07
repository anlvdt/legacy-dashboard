/**
 * Property test: Fallback khi localStorage không khả dụng
 * Feature: legacy-frame-upgrade, Property 12: Fallback khi localStorage không khả dụng
 *
 * Validates: Requirements 7.3
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module source
const settingsCode = readFileSync(
  resolve(__dirname, '../public/js/settings.js'),
  'utf-8'
);

/**
 * Load settings.js into the global scope.
 * We need LF namespace to exist first.
 */
function loadSettingsGlobal() {
  const wrappedCode = settingsCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

/**
 * Make localStorage throw on every operation to simulate private browsing.
 */
function breakLocalStorage() {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function () {
    throw new DOMException('QuotaExceededError');
  });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function () {
    throw new DOMException('SecurityError');
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function () {
    throw new DOMException('SecurityError');
  });
}

describe('Feature: legacy-frame-upgrade, Property 12: Fallback khi localStorage không khả dụng', () => {
  beforeEach(() => {
    delete globalThis.LF;
    localStorage.clear();
    loadSettingsGlobal();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 12a: load() trả defaults khi localStorage ném exception
   * For any state, when localStorage throws, load() must return an object
   * deep-equal to LF.settings.defaults.
   *
   * **Validates: Requirements 7.3**
   */
  it('load() returns defaults when localStorage throws exceptions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (_seed) => {
          // Break localStorage before calling load
          breakLocalStorage();

          const result = globalThis.LF.settings.load();
          expect(result).toEqual(globalThis.LF.settings.defaults);
          expect(globalThis.LF.settings.current).toEqual(globalThis.LF.settings.defaults);

          vi.restoreAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12b: isStorageAvailable() returns false when localStorage throws
   *
   * **Validates: Requirements 7.3**
   */
  it('isStorageAvailable() returns false when localStorage throws', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (_seed) => {
          breakLocalStorage();

          const available = globalThis.LF.settings.isStorageAvailable();
          expect(available).toBe(false);

          vi.restoreAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
