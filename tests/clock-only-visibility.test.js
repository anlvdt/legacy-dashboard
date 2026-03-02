/**
 * Property test: Chế độ nhìn xa ẩn widget không thiết yếu
 * Feature: legacy-frame-upgrade, Property 17: Chế độ nhìn xa ẩn widget không thiết yếu
 *
 * Test applySettings() với clockOnlyMode=true ẩn lịch, tài chính, tin tức, ca dao, AQI
 * Và các widget tùy chọn (ngày dương, ngày âm, thời tiết) chỉ hiển thị khi sub-setting tương ứng là true
 *
 * Validates: Requirements 9.2, 9.3
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load ES5 module sources
const settingsCode = readFileSync(
  resolve(__dirname, '../public/js/settings.js'),
  'utf-8'
);
const appCode = readFileSync(
  resolve(__dirname, '../public/js/app.js'),
  'utf-8'
);

/**
 * IDs of non-essential widgets that MUST be hidden in clock-only mode
 */
const NON_ESSENTIAL_WIDGET_IDS = [
  'calendar-widget',
  'finance-widget',
  'news-ticker',
  'quote-widget',
  'aqi-widget',
];

/**
 * Optional widget mappings: { id, settingKey }
 * These only show when their corresponding sub-setting is true
 */
const OPTIONAL_WIDGETS = [
  { id: 'date-display', settingKey: 'clockOnlyShowGregorian' },
  { id: 'lunar-date-display', settingKey: 'clockOnlyShowLunar' },
  { id: 'weather-widget', settingKey: 'clockOnlyShowWeather' },
];

/**
 * Create all required DOM elements for the test
 */
function setupDOM() {
  document.body.innerHTML = '';
  document.body.className = '';

  const allIds = [
    ...NON_ESSENTIAL_WIDGET_IDS,
    ...OPTIONAL_WIDGETS.map((w) => w.id),
    'slideshow-container',
    'clock-seconds',
    'disaster-banner',
    'background-slideshow',
    'offline-indicator',
    'settings-panel',
    'storage-warning',
  ];

  const uniqueIds = [...new Set(allIds)];

  for (const id of uniqueIds) {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
}

/**
 * Load settings.js and app.js into global scope via globalThis.LF.
 * Both modules use `var LF = LF || {};` so we pre-seed globalThis.LF
 * and use `with` semantics via wrapping to share the namespace.
 */
function loadModules() {
  // Pre-seed the LF namespace on globalThis
  globalThis.LF = globalThis.LF || {};

  // Wrap settings.js so `var LF = LF || {}` picks up globalThis.LF
  const settingsWrapped =
    'var LF = globalThis.LF || {};\n' +
    settingsCode.replace(/^var LF = LF \|\| \{\};?/m, '') +
    '\nglobalThis.LF = LF;';
  new Function(settingsWrapped)();

  // Remove the auto-init IIFE from app.js
  const iifeStart = appCode.lastIndexOf('(function () {');
  const appTrimmed = iifeStart !== -1 ? appCode.substring(0, iifeStart) : appCode;

  const appWrapped =
    'var LF = globalThis.LF || {};\n' +
    appTrimmed.replace(/^var LF = LF \|\| \{\};?/m, '') +
    '\nglobalThis.LF = LF;';
  new Function(appWrapped)();
}

/**
 * Check if an element is hidden (has hidden-force class)
 */
function isHidden(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return true;
  return el.className.indexOf('hidden-force') !== -1;
}

describe('Feature: legacy-frame-upgrade, Property 17: Chế độ nhìn xa ẩn widget không thiết yếu', () => {
  beforeEach(() => {
    delete globalThis.LF;
    setupDOM();
    loadModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 17a: Khi clockOnlyMode=true, tất cả widget không thiết yếu phải bị ẩn
   * For any combination of sub-settings, non-essential widgets are always hidden.
   *
   * **Validates: Requirements 9.2, 9.3**
   */
  it('hides all non-essential widgets when clockOnlyMode is true', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (showGregorian, showLunar, showWeather) => {
          // Reset DOM elements (clear hidden-force classes)
          setupDOM();

          const { LF } = globalThis;

          // Configure settings with clockOnlyMode=true
          LF.settings.current = {};
          const key = Object.keys(LF.settings.defaults);
          for (let i = 0; i < key.length; i++) {
            LF.settings.current[key[i]] = LF.settings.defaults[key[i]];
          }
          LF.settings.current.clockOnlyMode = true;
          LF.settings.current.clockOnlyShowGregorian = showGregorian;
          LF.settings.current.clockOnlyShowLunar = showLunar;
          LF.settings.current.clockOnlyShowWeather = showWeather;

          // Apply clock-only mode
          LF.app.applyClockOnlyMode();

          // All non-essential widgets must be hidden
          for (const widgetId of NON_ESSENTIAL_WIDGET_IDS) {
            expect(isHidden(widgetId)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17b: Widget tùy chọn chỉ hiển thị khi sub-setting tương ứng là true
   * For any combination of sub-settings, optional widgets visibility matches their setting.
   *
   * **Validates: Requirements 9.2, 9.3**
   */
  it('optional widgets visibility matches their sub-settings in clock-only mode', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (showGregorian, showLunar, showWeather) => {
          // Reset DOM elements
          setupDOM();

          const { LF } = globalThis;

          LF.settings.current = {};
          const keys = Object.keys(LF.settings.defaults);
          for (let i = 0; i < keys.length; i++) {
            LF.settings.current[keys[i]] = LF.settings.defaults[keys[i]];
          }
          LF.settings.current.clockOnlyMode = true;
          LF.settings.current.clockOnlyShowGregorian = showGregorian;
          LF.settings.current.clockOnlyShowLunar = showLunar;
          LF.settings.current.clockOnlyShowWeather = showWeather;

          // Apply clock-only mode
          LF.app.applyClockOnlyMode();

          // Check each optional widget matches its sub-setting
          const settingMap = {
            clockOnlyShowGregorian: showGregorian,
            clockOnlyShowLunar: showLunar,
            clockOnlyShowWeather: showWeather,
          };

          for (const widget of OPTIONAL_WIDGETS) {
            const shouldBeVisible = settingMap[widget.settingKey];
            if (shouldBeVisible) {
              expect(isHidden(widget.id)).toBe(false);
            } else {
              expect(isHidden(widget.id)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
