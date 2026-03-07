/**
 * Property test: Giới hạn kích thước ảnh trên thiết bị cũ
 * Feature: legacy-frame-upgrade, Property 3: Giới hạn kích thước ảnh trên thiết bị cũ
 *
 * Validates: Requirements 2.5
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

describe('Feature: legacy-frame-upgrade, Property 3: Giới hạn kích thước ảnh trên thiết bị cũ', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModules();
  });

  /**
   * Property 3: For any viewport width, when the device is a legacy device,
   * getPicsumSize() must always return "640/480" regardless of screen width.
   *
   * **Validates: Requirements 2.5**
   */
  it('returns "640/480" for any viewport width when device is legacy', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7680 }),
        (w) => {
          // Force isLegacyDevice to return true
          globalThis.LF.utils.isLegacyDevice = function () { return true; };

          const result = globalThis.LF.slideshow.getPicsumSize(w);
          expect(result).toBe('640/480');
        }
      ),
      { numRuns: 100 }
    );
  });
});
