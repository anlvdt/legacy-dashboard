/**
 * Property test: Cache API round-trip với TTL
 * Feature: legacy-frame-upgrade, Property 4: Cache API round-trip với TTL
 *
 * Validates: Requirements 2.7
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module source
const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);

/**
 * Load utils.js into the global scope.
 * The ES5 code uses `var LF = LF || {};` which creates a local var inside
 * Function(). We work around this by wrapping the code so that LF is
 * explicitly assigned to globalThis.
 */
function loadUtilsGlobal() {
  // Execute the code, then copy LF to globalThis
  const wrappedCode = utilsCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

describe('Feature: legacy-frame-upgrade, Property 4: Cache API round-trip với TTL', () => {
  beforeEach(() => {
    delete globalThis.LF;
    localStorage.clear();
    loadUtilsGlobal();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 4a: cacheSet(key, data, ttl) then immediately cacheGet(key)
   * returns deep-equal data for any valid key, JSON-serializable data, and positive TTL.
   *
   * **Validates: Requirements 2.7**
   */
  it('cacheSet then cacheGet returns identical data for arbitrary keys, data, and TTL', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.jsonValue(),
        fc.integer({ min: 1, max: 3_600_000 }),
        (key, data, ttl) => {
          localStorage.clear();
          globalThis.LF.utils.cacheSet(key, data, ttl);
          const retrieved = globalThis.LF.utils.cacheGet(key);
          // Compare via JSON to account for JSON serialization semantics
          // (e.g., -0 becomes 0 through JSON.stringify/parse round-trip)
          expect(JSON.stringify(retrieved)).toBe(JSON.stringify(data));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4b: cacheGet returns null for expired entries.
   * We simulate expiry by advancing Date.now() past ts + ttl.
   *
   * **Validates: Requirements 2.7**
   */
  it('cacheGet returns null for expired cache entries', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.jsonValue(),
        fc.integer({ min: 1, max: 10_000 }),
        (key, data, ttl) => {
          localStorage.clear();
          globalThis.LF.utils.cacheSet(key, data, ttl);

          // Manually read the stored entry to get the exact ts
          var raw = localStorage.getItem('lf_cache_' + key);
          var entry = JSON.parse(raw);
          var storedTs = entry.ts;

          // Mock Date.now() to return a time past expiry
          const dateNowSpy = vi
            .spyOn(Date, 'now')
            .mockReturnValue(storedTs + ttl + 1);

          const retrieved = globalThis.LF.utils.cacheGet(key);
          expect(retrieved).toBeNull();

          dateNowSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});
