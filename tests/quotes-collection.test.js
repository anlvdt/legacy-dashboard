/**
 * Property test: Bộ sưu tập ca dao đầy đủ và có cấu trúc
 * Feature: legacy-frame-upgrade, Property 8: Bộ sưu tập ca dao đầy đủ và có cấu trúc
 *
 * Validates: Requirements 5.7
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

const quotesCode = readFileSync(
  resolve(__dirname, '../public/js/quotes.js'),
  'utf-8'
);

/**
 * Load utils.js and quotes.js into the global scope.
 */
function loadModulesGlobal() {
  const wrappedCode = utilsCode + '\n' + quotesCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

const VALID_CATEGORIES = ['gia-dinh', 'hoc-tap', 'dao-duc', 'mua-vu', 'cuoc-song', 'tinh-yeu', 'truyen-cam-hung', 'lich-su'];

describe('Feature: legacy-frame-upgrade, Property 8: Bộ sưu tập ca dao đầy đủ và có cấu trúc', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModulesGlobal();
  });

  /**
   * Property 8a: Collection has at least 50 elements.
   *
   * **Validates: Requirements 5.7**
   */
  it('collection contains at least 50 quotes', () => {
    const collection = globalThis.LF.quotes.collection;
    expect(Array.isArray(collection)).toBe(true);
    expect(collection.length).toBeGreaterThanOrEqual(50);
  });

  /**
   * Property 8b: For any element in the collection, it must have a non-empty text,
   * non-empty author, and a valid category.
   *
   * **Validates: Requirements 5.7**
   */
  it('every quote has non-empty text, non-empty author, and valid category', () => {
    const collection = globalThis.LF.quotes.collection;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: collection.length - 1 }),
        (index) => {
          const quote = collection[index];

          // text must be a non-empty string
          expect(typeof quote.text).toBe('string');
          expect(quote.text.trim().length).toBeGreaterThan(0);

          // author must be a non-empty string
          expect(typeof quote.author).toBe('string');
          expect(quote.author.trim().length).toBeGreaterThan(0);

          // category must be one of the valid categories
          expect(typeof quote.category).toBe('string');
          expect(VALID_CATEGORIES).toContain(quote.category);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8c: All six categories are represented in the collection.
   *
   * **Validates: Requirements 5.7**
   */
  it('all eight categories are represented in the collection', () => {
    const collection = globalThis.LF.quotes.collection;
    const categoriesFound = {};

    for (let i = 0; i < collection.length; i++) {
      categoriesFound[collection[i].category] = true;
    }

    for (let i = 0; i < VALID_CATEGORIES.length; i++) {
      expect(categoriesFound[VALID_CATEGORIES[i]]).toBe(true);
    }
  });

  /**
   * Property 8d: No quote in the collection has only whitespace for text or author.
   *
   * **Validates: Requirements 5.7**
   */
  it('no quote has whitespace-only text or author', () => {
    const collection = globalThis.LF.quotes.collection;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: collection.length - 1 }),
        (index) => {
          const quote = collection[index];
          expect(quote.text.trim()).not.toBe('');
          expect(quote.author.trim()).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});
