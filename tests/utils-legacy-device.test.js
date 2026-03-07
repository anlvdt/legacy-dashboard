/**
 * Property test: Phát hiện thiết bị cũ kích hoạt chế độ tương thích
 * Feature: legacy-frame-upgrade, Property 2: Phát hiện thiết bị cũ kích hoạt chế độ tương thích
 *
 * Validates: Requirements 2.3, 11.5
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module source
const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);

function loadUtilsGlobal() {
  const wrappedCode = utilsCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

/**
 * Helper: set navigator.userAgent to a custom string.
 * jsdom makes navigator.userAgent writable via Object.defineProperty.
 */
function mockUserAgent(ua) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    writable: true,
    configurable: true,
  });
}

describe('Feature: legacy-frame-upgrade, Property 2: Phát hiện thiết bị cũ kích hoạt chế độ tương thích', () => {
  let originalUA;

  beforeEach(() => {
    delete globalThis.LF;
    originalUA = navigator.userAgent;
    loadUtilsGlobal();
  });

  afterEach(() => {
    mockUserAgent(originalUA);
    delete globalThis.LF;
  });

  /**
   * Property 2a: Legacy iOS devices (version 1–9) → isLegacyDevice() returns true
   *
   * **Validates: Requirements 2.3, 11.5**
   */
  it('returns true for legacy iOS UA strings (iOS < 10)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        (major, minor) => {
          const ua =
            'Mozilla/5.0 (iPhone; CPU iPhone OS ' +
            major + '_' + minor +
            ' like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B411 Safari/600.1.4';
          mockUserAgent(ua);
          expect(globalThis.LF.utils.isLegacyDevice()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2b: Modern iOS devices (version 10+) → isLegacyDevice() returns false
   *
   * **Validates: Requirements 2.3, 11.5**
   */
  it('returns false for modern iOS UA strings (iOS >= 10)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 20 }),
        fc.integer({ min: 0, max: 9 }),
        (major, minor) => {
          const ua =
            'Mozilla/5.0 (iPhone; CPU iPhone OS ' +
            major + '_' + minor +
            ' like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
          mockUserAgent(ua);
          expect(globalThis.LF.utils.isLegacyDevice()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2c: Legacy Android devices (version 1–4) → isLegacyDevice() returns true
   *
   * **Validates: Requirements 2.3, 11.5**
   */
  it('returns true for legacy Android UA strings (Android < 5)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 0, max: 9 }),
        (major, minor) => {
          const ua =
            'Mozilla/5.0 (Linux; Android ' +
            major + '.' + minor +
            '; Nexus 5 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.141 Mobile Safari/537.36';
          mockUserAgent(ua);
          expect(globalThis.LF.utils.isLegacyDevice()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2d: Modern Android devices (version 5+) → isLegacyDevice() returns false
   *
   * **Validates: Requirements 2.3, 11.5**
   */
  it('returns false for modern Android UA strings (Android >= 5)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 15 }),
        fc.integer({ min: 0, max: 9 }),
        (major, minor) => {
          const ua =
            'Mozilla/5.0 (Linux; Android ' +
            major + '.' + minor +
            '; Pixel 3 Build/QQ3A.200805.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36';
          mockUserAgent(ua);
          expect(globalThis.LF.utils.isLegacyDevice()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2e: Legacy Chrome (version 1–39) → isLegacyDevice() returns true
   *
   * **Validates: Requirements 2.3, 11.5**
   */
  it('returns true for legacy Chrome UA strings (Chrome < 40)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 39 }),
        (chromeVersion) => {
          const ua =
            'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' +
            chromeVersion +
            '.0.2171.95 Safari/537.36';
          mockUserAgent(ua);
          expect(globalThis.LF.utils.isLegacyDevice()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2f: Modern Chrome (version 40+) → isLegacyDevice() returns false
   *
   * **Validates: Requirements 2.3, 11.5**
   */
  it('returns false for modern Chrome UA strings (Chrome >= 40)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: 130 }),
        (chromeVersion) => {
          const ua =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' +
            chromeVersion +
            '.0.4044.138 Safari/537.36';
          mockUserAgent(ua);
          expect(globalThis.LF.utils.isLegacyDevice()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
