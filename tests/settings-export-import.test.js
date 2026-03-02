/**
 * Property test: Xuất/nhập cài đặt round-trip
 * Feature: legacy-frame-upgrade, Property 14: Xuất/nhập cài đặt round-trip
 *
 * Validates: Requirements 7.6
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

/**
 * Arbitrary that generates a valid settings object matching the defaults schema.
 * Each key gets a random value of the correct type.
 */
function settingsArbitrary() {
  return fc.record({
    powerSaveMode: fc.boolean(),
    clockOnlyMode: fc.boolean(),
    clockOnlyShowGregorian: fc.boolean(),
    clockOnlyShowLunar: fc.boolean(),
    clockOnlyShowWeather: fc.boolean(),
    secondsVisible: fc.boolean(),
    slideshowHidden: fc.boolean(),
    dateHidden: fc.boolean(),
    calendarHidden: fc.boolean(),
    weatherHidden: fc.boolean(),
    quoteHidden: fc.boolean(),
    aqiHidden: fc.boolean(),
    showFinanceWidget: fc.boolean(),
    showDisasterAlerts: fc.boolean(),
    showNewsTicker: fc.boolean(),
    showAgriWidget: fc.boolean(),
    showRadio: fc.boolean(),
    useOnlinePhotos: fc.boolean(),
    slideshowInterval: fc.constantFrom(10000, 12000, 15000, 30000, 60000),
    newsSourceIndex: fc.integer({ min: 0, max: 10 }),
    newsMultiSource: fc.boolean(),
    enableTTS: fc.boolean(),
    ttsVoiceGender: fc.constantFrom('female', 'male'),
    ttsScheduleEnabled: fc.boolean(),
    ttsScheduleTime: fc.constantFrom('06:00', '07:00', '07:30', '08:00'),
  });
}

describe('Feature: legacy-frame-upgrade, Property 14: Xuất/nhập cài đặt round-trip', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadSettingsGlobal();
  });

  /**
   * Property 14: For any valid settings object, exportSettings() then
   * importSettings() must return an object deep-equal to the original.
   *
   * **Validates: Requirements 7.6**
   */
  it('exportSettings() then importSettings() returns deep-equal object', () => {
    fc.assert(
      fc.property(settingsArbitrary(), (settings) => {
        const exported = globalThis.LF.settings.exportSettings(settings);

        // Exported must be a non-empty string
        expect(typeof exported).toBe('string');
        expect(exported.length).toBeGreaterThan(0);

        const imported = globalThis.LF.settings.importSettings(exported);

        // Imported must deep-equal the original settings
        expect(imported).toEqual(settings);
      }),
      { numRuns: 100 }
    );
  });
});
