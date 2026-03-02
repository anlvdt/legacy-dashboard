/**
 * Property test: Tính năng offline hoạt động không cần mạng
 * Feature: legacy-frame-upgrade, Property 18: Tính năng offline hoạt động không cần mạng
 *
 * Validates: Requirements 10.1
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module sources
const amlicCode = readFileSync(
  resolve(__dirname, '../public/amlich.js'),
  'utf-8'
);
const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);
const clockCode = readFileSync(
  resolve(__dirname, '../public/js/clock.js'),
  'utf-8'
);
const calendarCode = readFileSync(
  resolve(__dirname, '../public/js/calendar.js'),
  'utf-8'
);

/**
 * Load all required modules into the global scope.
 * Each ES5 module does `var LF = LF || {};` which creates a local var.
 * We work around this by ensuring globalThis.LF exists before each load
 * and copying it back after.
 */
function loadModules() {
  // amlich.js — UMD, exports _calendar
  const amlicFn = new Function('exports', 'module', amlicCode);
  const amlicExports = {};
  amlicFn(amlicExports, { exports: amlicExports });
  globalThis._calendar = amlicExports;

  // utils.js — creates LF.utils
  globalThis.LF = globalThis.LF || {};
  const wrappedUtils = 'var LF = globalThis.LF;\n' + utilsCode.replace('var LF = LF || {};', '') + '\n; globalThis.LF = LF;';
  new Function(wrappedUtils)();

  // clock.js — creates LF.clock
  const wrappedClock = 'var LF = globalThis.LF;\n' + clockCode.replace('var LF = LF || {};', '') + '\n; globalThis.LF = LF;';
  new Function(wrappedClock)();

  // calendar.js — creates LF.calendar
  const wrappedCalendar = 'var LF = globalThis.LF;\n' + calendarCode.replace('var LF = LF || {};', '') + '\n; globalThis.LF = LF;';
  new Function(wrappedCalendar)();
}

/**
 * Generator for valid solar dates in range 1900-2100.
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

describe('Feature: legacy-frame-upgrade, Property 18: Tính năng offline hoạt động không cần mạng', () => {
  let makeRequestSpy;

  beforeEach(() => {
    delete globalThis.LF;
    delete globalThis._calendar;

    // Set up minimal DOM elements for clock.update()
    document.body.innerHTML =
      '<div id="digital-clock">' +
      '<span id="clock-hours"></span>' +
      '<span id="clock-minutes"></span>' +
      '<span id="clock-seconds"></span>' +
      '</div>';

    loadModules();

    // Spy on makeRequest to detect any network calls
    makeRequestSpy = vi.spyOn(globalThis.LF.utils, 'makeRequest');

    // Initialize clock DOM refs
    globalThis.LF.clock._els = {
      hours: document.getElementById('clock-hours'),
      minutes: document.getElementById('clock-minutes'),
      seconds: document.getElementById('clock-seconds'),
      clock: document.getElementById('digital-clock')
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  /**
   * Property 18a: clock.update() never calls makeRequest.
   *
   * **Validates: Requirements 10.1**
   */
  it('clock.update() executes without calling makeRequest', () => {
    // clock.update() uses current time, no random input needed,
    // but we call it multiple times to be thorough
    for (let i = 0; i < 100; i++) {
      globalThis.LF.clock.lastTime = { h: '', m: '', s: '' };
      globalThis.LF.clock.update();
    }
    expect(makeRequestSpy).not.toHaveBeenCalled();
  });

  /**
   * Property 18b: calendar.solarToLunar() never calls makeRequest for any valid date.
   *
   * **Validates: Requirements 10.1**
   */
  it('calendar.solarToLunar() executes without calling makeRequest for random dates', () => {
    fc.assert(
      fc.property(
        validSolarDate,
        ({ day, month, year }) => {
          const result = globalThis.LF.calendar.solarToLunar(day, month, year);
          expect(result).toBeDefined();
          expect(result.day).toBeDefined();
          expect(makeRequestSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18c: calendar.getDaySummary() never calls makeRequest for any valid date.
   *
   * **Validates: Requirements 10.1**
   */
  it('calendar.getDaySummary() executes without calling makeRequest for random dates', () => {
    fc.assert(
      fc.property(
        validSolarDate,
        ({ day, month, year }) => {
          const summary = globalThis.LF.calendar.getDaySummary(day, month, year);
          expect(summary).toBeDefined();
          expect(summary.dayCanChi).toBeDefined();
          expect(makeRequestSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
