/**
 * Property test: Lọc cảnh báo thiên tai theo khu vực Đông Nam Á
 * Feature: legacy-frame-upgrade, Property 10: Lọc cảnh báo thiên tai theo khu vực Đông Nam Á
 *
 * Validates: Requirements 6.3
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

// SEA bounding box constants
const SEA_LAT_MIN = -11;
const SEA_LAT_MAX = 28.5;
const SEA_LON_MIN = 92;
const SEA_LON_MAX = 142;

/** Arbitrary for alert level */
const alertLevelArb = fc.constantFrom('Red', 'Orange', 'Green');

/** Arbitrary for an event title */
const titleArb = fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0);

/** Arbitrary for an event inside the SEA bounding box */
const seaEventArb = fc.record({
  title: titleArb,
  alertlevel: alertLevelArb,
  lat: fc.double({ min: SEA_LAT_MIN, max: SEA_LAT_MAX, noNaN: true }),
  lon: fc.double({ min: SEA_LON_MIN, max: SEA_LON_MAX, noNaN: true })
});

/** Arbitrary for an event outside the SEA bounding box */
const outsideEventArb = fc.oneof(
  // North of SEA (lat > 28.5)
  fc.record({
    title: titleArb,
    alertlevel: alertLevelArb,
    lat: fc.double({ min: 28.6, max: 90, noNaN: true }),
    lon: fc.double({ min: -180, max: 180, noNaN: true })
  }),
  // South of SEA (lat < -11)
  fc.record({
    title: titleArb,
    alertlevel: alertLevelArb,
    lat: fc.double({ min: -90, max: -11.1, noNaN: true }),
    lon: fc.double({ min: -180, max: 180, noNaN: true })
  }),
  // West of SEA (lon < 92, but lat in range)
  fc.record({
    title: titleArb,
    alertlevel: alertLevelArb,
    lat: fc.double({ min: SEA_LAT_MIN, max: SEA_LAT_MAX, noNaN: true }),
    lon: fc.double({ min: -180, max: 91.9, noNaN: true })
  }),
  // East of SEA (lon > 142, but lat in range)
  fc.record({
    title: titleArb,
    alertlevel: alertLevelArb,
    lat: fc.double({ min: SEA_LAT_MIN, max: SEA_LAT_MAX, noNaN: true }),
    lon: fc.double({ min: 142.1, max: 180, noNaN: true })
  })
);

/** Arbitrary for a mixed list of inside and outside events */
const mixedEventsArb = fc.tuple(
  fc.array(seaEventArb, { minLength: 0, maxLength: 5 }),
  fc.array(outsideEventArb, { minLength: 0, maxLength: 5 })
).filter(([inside, outside]) => inside.length + outside.length > 0)
  .map(([inside, outside]) => ({
    insideEvents: inside,
    outsideEvents: outside,
    allEvents: [...inside, ...outside]
  }));

describe('Feature: legacy-frame-upgrade, Property 10: Lọc cảnh báo thiên tai theo khu vực Đông Nam Á', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModulesGlobal();
  });

  /**
   * Property 10a: All events returned by filterSEAsia() must have coordinates
   * within the SEA bounding box (lat: -11 to 28.5, lon: 92 to 142).
   *
   * **Validates: Requirements 6.3**
   */
  it('filterSEAsia() only returns events within SEA bounding box', () => {
    fc.assert(
      fc.property(
        mixedEventsArb,
        ({ allEvents }) => {
          const result = globalThis.LF.disaster.filterSEAsia(allEvents);

          for (const ev of result) {
            const lat = parseFloat(ev.lat);
            const lon = parseFloat(ev.lon);
            expect(lat).toBeGreaterThanOrEqual(SEA_LAT_MIN);
            expect(lat).toBeLessThanOrEqual(SEA_LAT_MAX);
            expect(lon).toBeGreaterThanOrEqual(SEA_LON_MIN);
            expect(lon).toBeLessThanOrEqual(SEA_LON_MAX);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10b: Events outside the SEA bounding box must NOT appear
   * in the filterSEAsia() results.
   *
   * **Validates: Requirements 6.3**
   */
  it('events outside SEA bounding box are excluded from results', () => {
    fc.assert(
      fc.property(
        fc.array(outsideEventArb, { minLength: 1, maxLength: 10 }),
        (outsideEvents) => {
          const result = globalThis.LF.disaster.filterSEAsia(outsideEvents);
          expect(result.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10c: All events inside the SEA bounding box must appear
   * in the filterSEAsia() results (no false negatives).
   *
   * **Validates: Requirements 6.3**
   */
  it('all events inside SEA bounding box are included in results', () => {
    fc.assert(
      fc.property(
        fc.array(seaEventArb, { minLength: 1, maxLength: 10 }),
        (insideEvents) => {
          const result = globalThis.LF.disaster.filterSEAsia(insideEvents);
          expect(result.length).toBe(insideEvents.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
