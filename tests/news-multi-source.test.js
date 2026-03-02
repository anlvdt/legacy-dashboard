/**
 * Property test: Tin tức hiển thị đa nguồn (inline widget)
 * Feature: legacy-frame-upgrade, Property 9: Tin tức hiển thị đa nguồn
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
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(function (s) { return s.trim().length > 0; }),
    link: fc.webUrl(),
    source: fc.constant(sourceName)
  });
}

/** Arbitrary for a set of N distinct source names (N >= 2) */
const distinctSourcesArb = fc
  .uniqueArray(sourceNameArb, { minLength: 2, maxLength: 5 })
  .filter(function (arr) { return arr.length >= 2; });

/**
 * Generate items from multiple distinct sources.
 */
const multiSourceItemsArb = distinctSourcesArb.chain(function (sources) {
  var itemArbs = sources.map(function (name) {
    return fc.array(newsItemArb(name), { minLength: 1, maxLength: 3 });
  });
  return fc.tuple.apply(fc, itemArbs).map(function (arrays) {
    var all = [];
    for (var i = 0; i < arrays.length; i++) {
      for (var j = 0; j < arrays[i].length; j++) {
        all.push(arrays[i][j]);
      }
    }
    return { sources: sources, items: all };
  });
});

describe('Feature: legacy-frame-upgrade, Property 9: Tin tức hiển thị đa nguồn', function () {
  beforeEach(function () {
    delete globalThis.LF;

    // Tạo DOM container cho inline widget
    document.body.innerHTML = '<div id="news-inline-scroll-content"></div>';

    loadModulesGlobal();
  });

  /**
   * Property 9: Given items from N sources (N >= 2), after calling
   * _buildInlineDOM(items), the DOM output must contain at least one
   * item from each source with a .news-scroll-source element.
   */
  it('_buildInlineDOM output contains at least one .news-scroll-source element per source', { timeout: 15000 }, function () {
    fc.assert(
      fc.property(
        multiSourceItemsArb,
        function (data) {
          var sources = data.sources;
          var items = data.items;

          globalThis.LF.news._buildInlineDOM(items);

          var container = document.getElementById('news-inline-scroll-content');
          var sourceElements = container.querySelectorAll('.news-scroll-source');

          var foundSources = {};
          for (var i = 0; i < sourceElements.length; i++) {
            var text = sourceElements[i].textContent.trim();
            if (text) { foundSources[text] = true; }
          }

          for (var s = 0; s < sources.length; s++) {
            expect(foundSources[sources[s]]).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9b: Each news item is a div with class .news-scroll-item
   */
  it('each news item is a div with class news-scroll-item', function () {
    fc.assert(
      fc.property(
        multiSourceItemsArb,
        function (data) {
          var items = data.items;

          globalThis.LF.news._buildInlineDOM(items);

          var container = document.getElementById('news-inline-scroll-content');
          var scrollItems = container.querySelectorAll('.news-scroll-item');

          expect(scrollItems.length).toBeGreaterThanOrEqual(items.length);

          for (var i = 0; i < scrollItems.length; i++) {
            expect(scrollItems[i].tagName).toBe('DIV');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9c: Produces exactly one .news-scroll-item per input item
   */
  it('produces exactly one .news-scroll-item per input item', function () {
    fc.assert(
      fc.property(
        multiSourceItemsArb,
        function (data) {
          var items = data.items;

          globalThis.LF.news._buildInlineDOM(items);

          var container = document.getElementById('news-inline-scroll-content');
          var scrollItems = container.querySelectorAll('.news-scroll-item');
          expect(scrollItems.length).toBe(items.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
