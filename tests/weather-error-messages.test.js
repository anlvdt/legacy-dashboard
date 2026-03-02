/**
 * Property test: Thông báo lỗi API bằng tiếng Việt
 * Feature: legacy-frame-upgrade, Property 5: Thông báo lỗi API bằng tiếng Việt
 *
 * Validates: Requirements 4.7
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module source
const weatherCode = readFileSync(
  resolve(__dirname, '../public/js/weather.js'),
  'utf-8'
);

const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);

/**
 * Load utils.js and weather.js into the global scope.
 */
function loadModulesGlobal() {
  const wrappedCode = utilsCode + '\n' + weatherCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

/**
 * Regex to detect Vietnamese diacritics (characters with combining marks or
 * precomposed Vietnamese characters).
 * Vietnamese uses: ă, â, đ, ê, ô, ơ, ư and tone marks (à, á, ả, ã, ạ, etc.)
 */
const VIETNAMESE_DIACRITIC_RE = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/;

/** All widget types that the error handler supports */
const WIDGET_TYPES = ['weather', 'forecast', 'aqi', 'location', 'network', 'timeout', 'parse', 'unknown'];

describe('Feature: legacy-frame-upgrade, Property 5: Thông báo lỗi API bằng tiếng Việt', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModulesGlobal();
  });

  /**
   * Property 5a: For any known widget error type, getErrorMessage returns a
   * non-empty Vietnamese string with diacritics and does NOT contain English
   * defaults like "Error" or "Failed".
   *
   * **Validates: Requirements 4.7**
   */
  it('getErrorMessage returns Vietnamese string with diacritics for all known widget types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...WIDGET_TYPES),
        (widgetType) => {
          const msg = globalThis.LF.weather.getErrorMessage(widgetType);

          // Must be a non-empty string
          expect(typeof msg).toBe('string');
          expect(msg.length).toBeGreaterThan(0);

          // Must contain Vietnamese diacritics
          expect(VIETNAMESE_DIACRITIC_RE.test(msg)).toBe(true);

          // Must NOT contain English error defaults
          expect(msg).not.toMatch(/Error/i);
          expect(msg).not.toMatch(/Failed/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5b: For any arbitrary string (including unknown widget types),
   * getErrorMessage always returns a non-empty Vietnamese string — never an
   * English fallback or empty string.
   *
   * **Validates: Requirements 4.7**
   */
  it('getErrorMessage returns Vietnamese string for arbitrary widget type strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (widgetType) => {
          const msg = globalThis.LF.weather.getErrorMessage(widgetType);

          // Must be a non-empty string
          expect(typeof msg).toBe('string');
          expect(msg.length).toBeGreaterThan(0);

          // Must contain Vietnamese diacritics
          expect(VIETNAMESE_DIACRITIC_RE.test(msg)).toBe(true);

          // Must NOT contain English error defaults
          expect(msg).not.toMatch(/Error/i);
          expect(msg).not.toMatch(/Failed/i);
        }
      ),
      { numRuns: 100 }
    );
  });
});
