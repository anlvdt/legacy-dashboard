/**
 * Property test: Ticker tin tức hiển thị đa nguồn
 * Feature: legacy-frame-upgrade, Property 9: Ticker tin tức hiển thị đa nguồn
 *
 * Validates: Requirements 6.1
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

const newsCode = readFileSync(
  resolve(__dirname, '../public/js/news.js'),
  'utf-8'
);

/**
 * Load utils.js and news.js into the global scope.
 */
function loadModulesGlobal() {
  const wrappedCode = utilsCode + '\n' + newsCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

/** Arbitrary for a non-empty Vietnamese-style news source name */
const sourceNameArb = fc.constantFrom(
  'VnExpress', 'Tuổi Trẻ', 'Dân Trí', 'Báo Chính Phủ', 'VTV News',
  'Thanh Niên', 'Người Lao Động', 'Zing News'
);

/** Arbitrary for a single news item with a given source */
function newsItemArb(sourceName) {
  return fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    link: fc.webUrl(),
    source: fc.constant(sourceName)
  });
}

/** Arbitrary for a set of N distinct source names (N >= 2) */
const distinctSourcesArb = fc
  .uniqueArray(sourceNameArb, { minLength: 2, maxLength: 5 })
  .filter(arr => arr.length >= 2);

/**
 * Generate items from multiple distinct sources.
 * Each source contributes at least 1 item.
 */
const multiSourceItemsArb = distinctSourcesArb.chain(sources => {
  // For each source, generate 1-3 items
  const itemArbs = sources.map(name =>
    fc.array(newsItemArb(name), { minLength: 1, maxLength: 3 })
  );
  return fc.tuple(...itemArbs).map(arrays => {
    // Flatten all items and shuffle
    const all = [];
    for (const arr of arrays) {
      for (const item of arr) {
        all.push(item);
      }
    }
    return { sources, items: all };
  });
});

describe('Feature: legacy-frame-upgrade, Property 9: Ticker tin tức hiển thị đa nguồn', () => {
  beforeEach(() => {
    delete globalThis.LF;
    loadModulesGlobal();
  });

  /**
   * Property 9: Given items from N sources (N >= 2), after calling
   * buildTickerDOM(items), the DOM output must contain at least one
   * item from each source. Each item should have a `.news-ticker-source`
   * element containing the source name.
   *
   * **Validates: Requirements 6.1**
   */
  it('buildTickerDOM output contains at least one .news-ticker-source element per source', () => {
    fc.assert(
      fc.property(
        multiSourceItemsArb,
        ({ sources, items }) => {
          const fragment = globalThis.LF.news.buildTickerDOM(items);

          // Append fragment to a temporary container to query it
          const container = document.createElement('div');
          container.appendChild(fragment);

          const sourceElements = container.querySelectorAll('.news-ticker-source');

          // Collect all source names found in the DOM
          const foundSources = new Set();
          for (let i = 0; i < sourceElements.length; i++) {
            const text = sourceElements[i].textContent.trim();
            if (text) {
              foundSources.add(text);
            }
          }

          // Every input source must appear at least once
          for (const sourceName of sources) {
            expect(foundSources.has(sourceName)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9b: Each ticker item is an <a> element with target="_blank"
   * so links open in a new tab when tapped.
   *
   * **Validates: Requirements 6.1**
   */
  it('each ticker item is a link that opens in a new tab', () => {
    fc.assert(
      fc.property(
        multiSourceItemsArb,
        ({ items }) => {
          const fragment = globalThis.LF.news.buildTickerDOM(items);

          const container = document.createElement('div');
          container.appendChild(fragment);

          const tickerItems = container.querySelectorAll('.news-ticker-item');

          // Should have at least as many items as input
          expect(tickerItems.length).toBeGreaterThanOrEqual(items.length);

          for (let i = 0; i < tickerItems.length; i++) {
            const el = tickerItems[i];
            expect(el.tagName).toBe('A');
            expect(el.getAttribute('target')).toBe('_blank');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9c: The total number of .news-ticker-item elements equals
   * the number of input items (one DOM element per news item).
   *
   * **Validates: Requirements 6.1**
   */
  it('produces exactly one .news-ticker-item per input item', () => {
    fc.assert(
      fc.property(
        multiSourceItemsArb,
        ({ items }) => {
          const fragment = globalThis.LF.news.buildTickerDOM(items);

          const container = document.createElement('div');
          container.appendChild(fragment);

          const tickerItems = container.querySelectorAll('.news-ticker-item');
          expect(tickerItems.length).toBe(items.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
