/**
 * Property test: Banner cảnh báo mức Red có styling đỏ
 * Feature: legacy-frame-upgrade, Property 11: Banner cảnh báo mức Red có styling đỏ
 *
 * Validates: Requirements 6.4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module sources
const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);

const disasterCode = readFileSync(
  resolve(__dirname, '../public/js/disaster.js'),
  'utf-8'
);

/**
 * Load utils.js and disaster.js into the global scope.
 */
function loadModulesGlobal() {
  const wrappedCode = utilsCode + '\n' + disasterCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

/** Arbitrary for a non-empty event title */
const titleArb = fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0);

/** Arbitrary for a Red alert event within SEA bounds */
const redEventArb = fc.record({
  title: titleArb,
  alertlevel: fc.constant('Red'),
  lat: fc.double({ min: -11, max: 28.5, noNaN: true }),
  lon: fc.double({ min: 92, max: 142, noNaN: true })
});

/** Arbitrary for a list containing at least one Red event */
const redEventsArb = fc.tuple(
  fc.array(redEventArb, { minLength: 1, maxLength: 3 }),
  fc.array(
    fc.record({
      title: titleArb,
      alertlevel: fc.constantFrom('Orange', 'Green'),
      lat: fc.double({ min: -11, max: 28.5, noNaN: true }),
      lon: fc.double({ min: 92, max: 142, noNaN: true })
    }),
    { minLength: 0, maxLength: 2 }
  )
).map(([reds, others]) => [...reds, ...others]);

describe('Feature: legacy-frame-upgrade, Property 11: Banner cảnh báo mức Red có styling đỏ', () => {
  beforeEach(() => {
    delete globalThis.LF;
    // Clean up any existing banner
    const existing = document.getElementById('disaster-banner');
    if (existing) {
      existing.parentNode.removeChild(existing);
    }
    loadModulesGlobal();
  });

  /**
   * Property 11: For any event with alertlevel === "Red", when rendered
   * via renderBanner(), the banner element must contain the red color
   * (#ff4444 or equivalent) in its style or class.
   *
   * **Validates: Requirements 6.4**
   */
  it('renderBanner() for Red events applies red styling (#ff4444)', () => {
    fc.assert(
      fc.property(
        redEventsArb,
        (events) => {
          // Clean up previous banner
          const old = document.getElementById('disaster-banner');
          if (old) {
            old.parentNode.removeChild(old);
          }

          globalThis.LF.disaster.renderBanner(events);

          const banner = document.getElementById('disaster-banner');
          expect(banner).not.toBeNull();

          // Check that the banner has red styling
          // It should have alert-red class or #ff4444 in backgroundColor
          const hasRedClass = banner.className.indexOf('alert-red') !== -1;
          const bgColor = banner.style.backgroundColor || '';
          const hasRedBg = bgColor.indexOf('#ff4444') !== -1 ||
                           bgColor.indexOf('rgb(255, 68, 68)') !== -1 ||
                           bgColor === '#ff4444';

          expect(hasRedClass || hasRedBg).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11b: The banner for Red events must contain a warning icon
   * and the event title text.
   *
   * **Validates: Requirements 6.4**
   */
  it('renderBanner() for Red events contains warning icon and title', () => {
    fc.assert(
      fc.property(
        redEventArb,
        (event) => {
          const old = document.getElementById('disaster-banner');
          if (old) {
            old.parentNode.removeChild(old);
          }

          globalThis.LF.disaster.renderBanner([event]);

          const banner = document.getElementById('disaster-banner');
          expect(banner).not.toBeNull();

          // Check for warning icon
          const icon = banner.querySelector('.disaster-icon');
          expect(icon).not.toBeNull();
          expect(icon.textContent).toBe('⚠');

          // Check for event title text
          const textEl = banner.querySelector('.disaster-text');
          expect(textEl).not.toBeNull();
          expect(textEl.textContent).toContain(event.title);
        }
      ),
      { numRuns: 100 }
    );
  });
});
