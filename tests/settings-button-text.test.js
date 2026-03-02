/**
 * Property test: Text nút phản ánh trạng thái cài đặt
 * Feature: legacy-frame-upgrade, Property 13: Text nút phản ánh trạng thái cài đặt
 *
 * Validates: Requirements 7.4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module source
const settingsCode = readFileSync(
  resolve(__dirname, '../public/js/settings.js'),
  'utf-8'
);

function loadSettingsGlobal() {
  const wrappedCode = settingsCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

/** Regex matching Vietnamese diacritics (common accented chars) */
const vietnameseCharRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe('Feature: legacy-frame-upgrade, Property 13: Text nút phản ánh trạng thái cài đặt', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadSettingsGlobal();
  });

  /**
   * Property 13a: For any boolean setting key, when the value is true,
   * the button text must contain "Tắt" or "Ẩn" (action to disable).
   * When the value is false, the text must contain "Bật" or "Hiện" (action to enable).
   * Text must not be empty and must be in Vietnamese.
   *
   * **Validates: Requirements 7.4**
   */
  it('button text contains "Tắt"/"Ẩn" when setting is on, "Bật"/"Hiện" when off', () => {
    const defaults = globalThis.LF.settings.defaults;
    // Collect all boolean setting keys
    const booleanKeys = Object.keys(defaults).filter(
      (k) => typeof defaults[k] === 'boolean'
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...booleanKeys),
        fc.boolean(),
        (settingKey, currentValue) => {
          const text = globalThis.LF.settings.getButtonText(settingKey, currentValue);

          // Text must not be empty
          expect(text.length).toBeGreaterThan(0);

          // Text must be in Vietnamese (contain at least one Vietnamese diacritic
          // or known Vietnamese words)
          const hasVietnamese =
            vietnameseCharRegex.test(text) ||
            text.indexOf('Bật') !== -1 ||
            text.indexOf('Tắt') !== -1 ||
            text.indexOf('Ẩn') !== -1 ||
            text.indexOf('Hiện') !== -1;
          expect(hasVietnamese).toBe(true);

          if (currentValue) {
            // Setting is ON → button should offer to turn OFF
            // "Tắt" for regular keys, "Ẩn" for *Hidden keys (when true = hidden, button says "Hiện")
            if (settingKey.indexOf('Hidden') !== -1) {
              // Hidden key: true means currently hidden → button says "Hiện" (show)
              expect(text.indexOf('Hiện')).not.toBe(-1);
            } else {
              // Regular key: true means currently on → button says "Tắt" (turn off)
              expect(text.indexOf('Tắt')).not.toBe(-1);
            }
          } else {
            // Setting is OFF → button should offer to turn ON
            if (settingKey.indexOf('Hidden') !== -1) {
              // Hidden key: false means currently shown → button says "Ẩn" (hide)
              expect(text.indexOf('Ẩn')).not.toBe(-1);
            } else {
              // Regular key: false means currently off → button says "Bật" (turn on)
              expect(text.indexOf('Bật')).not.toBe(-1);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
