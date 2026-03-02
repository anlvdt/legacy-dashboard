/**
 * Unit tests: Ngày lễ và ngày đặc biệt
 * Feature: legacy-frame-upgrade
 *
 * Validates: Requirements 5.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
  const amlicFn = new Function('exports', 'module', amlicCode);
  const amlicExports = {};
  amlicFn(amlicExports, { exports: amlicExports });
  globalThis._calendar = amlicExports;

  const wrappedCalendar = calendarCode + '\n; globalThis.LF = LF;';
  new Function(wrappedCalendar)();
}

describe('Unit tests: Ngày lễ Việt Nam và ngày đặc biệt', () => {
  beforeEach(() => {
    delete globalThis.LF;
    delete globalThis._calendar;
    loadModules();
  });

  // --- Ngày lễ dương lịch ---

  describe('Ngày lễ dương lịch', () => {
    it('30/4 — Giải phóng miền Nam', () => {
      const result = globalThis.LF.calendar.getHoliday(30, 4, 2024, 22, 3);
      expect(result).toBe('Giải phóng miền Nam');
    });

    it('1/5 — Quốc tế Lao động', () => {
      const result = globalThis.LF.calendar.getHoliday(1, 5, 2024, 23, 3);
      expect(result).toBe('Quốc tế Lao động');
    });

    it('2/9 — Quốc khánh', () => {
      const result = globalThis.LF.calendar.getHoliday(2, 9, 2024, 30, 7);
      expect(result).toBe('Quốc khánh');
    });
  });

  // --- Ngày lễ âm lịch ---

  describe('Ngày lễ âm lịch', () => {
    it('Tết Nguyên Đán (1/1 âm) — 10/2/2024 dương', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(10, 2, 2024);
      expect(lunar.day).toBe(1);
      expect(lunar.lunarMonth).toBe(1);
      expect(lunar.holiday).toBe('Tết Nguyên Đán');
    });

    it('Giỗ Tổ Hùng Vương (10/3 âm) — 18/4/2024 dương', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(18, 4, 2024);
      expect(lunar.day).toBe(10);
      expect(lunar.lunarMonth).toBe(3);
      expect(lunar.holiday).toBe('Giỗ Tổ Hùng Vương');
    });

    it('Trung Thu (15/8 âm) — 17/9/2024 dương', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(17, 9, 2024);
      expect(lunar.day).toBe(15);
      expect(lunar.lunarMonth).toBe(8);
      expect(lunar.holiday).toBe('Trung Thu');
    });

    it('Vu Lan (15/7 âm) — 18/8/2024 dương', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(18, 8, 2024);
      expect(lunar.day).toBe(15);
      expect(lunar.lunarMonth).toBe(7);
      expect(lunar.holiday).toBe('Vu Lan');
    });

    it('Tết 2025 (1/1 Ất Tỵ) — 29/1/2025 dương', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(29, 1, 2025);
      expect(lunar.day).toBe(1);
      expect(lunar.lunarMonth).toBe(1);
      expect(lunar.holiday).toBe('Tết Nguyên Đán');
    });
  });

  // --- Ngày đặc biệt ---

  describe('Năm nhuận dương lịch', () => {
    it('29/2/2024 — ngày hợp lệ trong năm nhuận', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(29, 2, 2024);
      expect(lunar.day).toBe(20);
      expect(lunar.lunarMonth).toBe(1);
      expect(lunar.lunarYear).toBe(2024);
    });

    it('29/2/2000 — năm nhuận thế kỷ', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(29, 2, 2000);
      expect(typeof lunar.day).toBe('number');
      expect(lunar.dayCanChi).not.toBe('Lỗi');
    });
  });

  describe('Tháng nhuận âm lịch', () => {
    it('22/3/2023 — ngày 1 tháng 2 nhuận Quý Mão', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(22, 3, 2023);
      expect(lunar.day).toBe(1);
      expect(lunar.lunarMonth).toBe(2);
      expect(lunar.isLeap).toBe(true);
      expect(lunar.yearName).toContain('Quý Mão');
    });
  });

  describe('Ngày không phải lễ', () => {
    it('15/6/2024 — ngày bình thường không có lễ', () => {
      const lunar = globalThis.LF.calendar.solarToLunar(15, 6, 2024);
      expect(lunar.holiday).toBe('');
    });
  });
});
