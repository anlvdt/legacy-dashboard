/**
 * Property test: Tính toán xu hướng tài chính
 * Feature: legacy-frame-upgrade, Property 7: Tính toán xu hướng tài chính
 *
 * Validates: Requirements 5.5
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module source
const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);

const financeCode = readFileSync(
  resolve(__dirname, '../public/js/finance.js'),
  'utf-8'
);

/**
 * Load utils.js and finance.js into the global scope.
 */
function loadModulesGlobal() {
  const wrappedCode = utilsCode + '\n' + financeCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

describe('Feature: legacy-frame-upgrade, Property 7: Tính toán xu hướng tài chính', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModulesGlobal();
  });

  /**
   * Property 7a: For any pair (current, previous) where current > previous > 0,
   * getTrend returns { trend: "up", symbol: "▲" }.
   *
   * **Validates: Requirements 5.5**
   */
  it('returns trend "up" with symbol "▲" when current > previous', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        (base, delta) => {
          const previous = base;
          const current = base + delta; // current > previous guaranteed when delta > 0

          // Only test when current is strictly greater
          if (current <= previous) return;

          const result = globalThis.LF.finance.getTrend(current, previous);
          expect(result.trend).toBe('up');
          expect(result.symbol).toBe('▲');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7b: For any pair (current, previous) where current < previous and previous > 0,
   * getTrend returns { trend: "down", symbol: "▼" }.
   *
   * **Validates: Requirements 5.5**
   */
  it('returns trend "down" with symbol "▼" when current < previous', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        (base, delta) => {
          const previous = base + delta; // previous > current guaranteed when delta > 0
          const current = base;

          // Only test when current is strictly less
          if (current >= previous) return;

          const result = globalThis.LF.finance.getTrend(current, previous);
          expect(result.trend).toBe('down');
          expect(result.symbol).toBe('▼');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7c: For any value v > 0, getTrend(v, v) returns
   * { trend: "stable", symbol: "" }.
   *
   * **Validates: Requirements 5.5**
   */
  it('returns trend "stable" with empty symbol when current === previous', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const result = globalThis.LF.finance.getTrend(value, value);
          expect(result.trend).toBe('stable');
          expect(result.symbol).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7d: For any current value, getTrend always returns an object
   * with valid trend and symbol fields — never undefined or null.
   *
   * **Validates: Requirements 5.5**
   */
  it('always returns a valid trend object with trend and symbol fields', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        fc.oneof(
          fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (current, previous) => {
          const result = globalThis.LF.finance.getTrend(current, previous);

          expect(result).toBeDefined();
          expect(result).not.toBeNull();
          expect(typeof result.trend).toBe('string');
          expect(['up', 'down', 'stable']).toContain(result.trend);
          expect(typeof result.symbol).toBe('string');
          expect(['▲', '▼', '']).toContain(result.symbol);
        }
      ),
      { numRuns: 100 }
    );
  });
});
