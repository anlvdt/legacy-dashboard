/**
 * Property test: Thông tin vạn niên đầy đủ cho mọi ngày
 * Feature: legacy-frame-upgrade, Property 6: Thông tin vạn niên đầy đủ cho mọi ngày
 *
 * Validates: Requirements 5.1, 5.2, 5.8
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module sources
const amlicCode = readFileSync(
  resolve(__dirname, '../public/amlich.js'),
  'utf-8'
);
const calendarCode = readFileSync(
  resolve(__dirname, '../public/js/calendar.js'),
  'utf-8'
);

/**
 * Load amlich.js and calendar.js into the global scope.
 */
function loadModules() {
  // amlich.js uses UMD — in Node/test env it writes to exports,
  // but calendar.js expects global _calendar. We set up both.
  const amlicFn = new Function('exports', 'module', amlicCode);
  const amlicExports = {};
  amlicFn(amlicExports, { exports: amlicExports });
  globalThis._calendar = amlicExports;

  // calendar.js uses var LF = LF || {};
  const wrappedCalendar = calendarCode + '\n; globalThis.LF = LF;';
  const calFn = new Function(wrappedCalendar);
  calFn();
}

/**
 * Valid 12 Chi values used in lucky hours
 */
const VALID_CHI = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ',
  'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'
];

/**
 * Valid 24 solar terms
 */
const VALID_SOLAR_TERMS = [
  'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng',
  'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
  'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết',
  'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ Thủy', 'Kinh trập'
];

/**
 * Valid directions for good direction
 */
const VALID_DIRECTIONS = [
  'Đông Nam', 'Đông', 'Nam', 'Tây Nam', 'Bắc', 'Tây Bắc'
];

/**
 * Generator for valid solar dates in range 1900-2100.
 * Uses a Date object to ensure the day is valid for the given month/year.
 */
const validSolarDate = fc.record({
  year: fc.integer({ min: 1900, max: 2100 }),
  month: fc.integer({ min: 1, max: 12 })
}).chain(({ year, month }) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return fc.record({
    day: fc.integer({ min: 1, max: daysInMonth }),
    month: fc.constant(month),
    year: fc.constant(year)
  });
});

describe('Feature: legacy-frame-upgrade, Property 6: Thông tin vạn niên đầy đủ cho mọi ngày', () => {
  beforeEach(() => {
    delete globalThis.LF;
    delete globalThis._calendar;
    loadModules();
  });

  /**
   * Property 6: getDaySummary() returns complete almanac info for any valid date 1900-2100.
   * All fields must be present and valid.
   *
   * **Validates: Requirements 5.1, 5.2, 5.8**
   */
  it('getDaySummary() returns complete dayCanChi, monthCanChi, yearCanChi, solarTerm, luckyHours, goodDirection for random dates 1900-2100', () => {
    fc.assert(
      fc.property(
        validSolarDate,
        ({ day, month, year }) => {
          const summary = globalThis.LF.calendar.getDaySummary(day, month, year);

          // dayCanChi must be a non-empty string
          expect(summary.dayCanChi).toBeDefined();
          expect(typeof summary.dayCanChi).toBe('string');
          expect(summary.dayCanChi.length).toBeGreaterThan(0);

          // monthCanChi must be a non-empty string
          expect(summary.monthCanChi).toBeDefined();
          expect(typeof summary.monthCanChi).toBe('string');
          expect(summary.monthCanChi.length).toBeGreaterThan(0);

          // yearCanChi must be a non-empty string
          expect(summary.yearCanChi).toBeDefined();
          expect(typeof summary.yearCanChi).toBe('string');
          expect(summary.yearCanChi.length).toBeGreaterThan(0);

          // solarTerm must be one of 24 valid terms or empty string
          expect(summary.solarTerm).toBeDefined();
          expect(typeof summary.solarTerm).toBe('string');
          if (summary.solarTerm !== '') {
            expect(VALID_SOLAR_TERMS).toContain(summary.solarTerm);
          }

          // luckyHours must be a non-empty array of valid Chi
          expect(Array.isArray(summary.luckyHours)).toBe(true);
          expect(summary.luckyHours.length).toBeGreaterThan(0);
          for (const hour of summary.luckyHours) {
            expect(VALID_CHI).toContain(hour);
          }

          // goodDirection must be a non-empty string from valid directions
          expect(summary.goodDirection).toBeDefined();
          expect(typeof summary.goodDirection).toBe('string');
          expect(summary.goodDirection.length).toBeGreaterThan(0);
          expect(VALID_DIRECTIONS).toContain(summary.goodDirection);
        }
      ),
      { numRuns: 100 }
    );
  });
});
