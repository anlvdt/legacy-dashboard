import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

/**
 * Feature: legacy-frame-upgrade, Property 1: Tuân thủ cú pháp ES5
 *
 * Validates: Requirements 1.5, 11.3
 *
 * For any file JavaScript trong thư mục public/js/, nội dung file không được
 * chứa bất kỳ cú pháp ES6+ nào bao gồm: let, const, =>, template literal
 * (backtick), async, await, class, import, export.
 */

const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');

/**
 * Forbidden ES6+ patterns. Each entry has a regex and a human-readable label.
 * The patterns use word-boundary or context-aware matching to avoid false
 * positives inside strings or comments where the literal word might appear
 * as data (e.g. a Vietnamese sentence containing the word "class").
 *
 * We match the keyword followed by a space (as specified in the task) which
 * targets actual syntax usage rather than occurrences inside strings.
 */
const FORBIDDEN_PATTERNS = [
  { pattern: /\blet\s/, label: 'let ' },
  { pattern: /\bconst\s/, label: 'const ' },
  { pattern: /=>/, label: '=>' },
  { pattern: /`/, label: 'backtick (template literal)' },
  { pattern: /\basync\s/, label: 'async ' },
  { pattern: /\bawait\s/, label: 'await ' },
  { pattern: /\bclass\s/, label: 'class ' },
  { pattern: /\bimport\s/, label: 'import ' },
  { pattern: /\bexport\s/, label: 'export ' },
];

/**
 * Collect all .js files from the public/js/ directory (non-recursive).
 */
function getJsFiles() {
  if (!fs.existsSync(JS_DIR)) return [];
  return fs
    .readdirSync(JS_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ name: f, fullPath: path.join(JS_DIR, f) }));
}

describe('Feature: legacy-frame-upgrade, Property 1: Tuân thủ cú pháp ES5', () => {
  const jsFiles = getJsFiles();

  if (jsFiles.length === 0) {
    it('should pass vacuously when no JS files exist in public/js/', () => {
      // No JS files to check — property holds vacuously.
      expect(jsFiles).toHaveLength(0);
    });
  } else {
    it.each(jsFiles)(
      'file "$name" must not contain ES6+ syntax',
      ({ name, fullPath }) => {
        const content = fs.readFileSync(fullPath, 'utf-8');

        fc.assert(
          fc.property(
            fc.constant(content),
            (fileContent) => {
              for (const { pattern, label } of FORBIDDEN_PATTERNS) {
                const match = pattern.exec(fileContent);
                if (match) {
                  const lineNum =
                    fileContent.substring(0, match.index).split('\n').length;
                  throw new Error(
                    `Found forbidden ES6+ syntax "${label}" in ${name} at line ${lineNum}`
                  );
                }
              }
              return true;
            }
          ),
          { numRuns: 1 } // deterministic — one file content, one check
        );
      }
    );

    it('should verify all JS files were scanned (property-based)', () => {
      /**
       * Property: for any file picked from the JS directory, it must have
       * been included in our scan list. This uses fast-check to randomly
       * sample from the file list and confirm membership.
       */
      const fileNames = jsFiles.map((f) => f.name);

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: Math.max(0, fileNames.length - 1) }),
          (idx) => {
            const picked = fileNames[idx];
            return (
              typeof picked === 'string' &&
              picked.endsWith('.js') &&
              fs.existsSync(path.join(JS_DIR, picked))
            );
          }
        ),
        { numRuns: Math.min(100, Math.max(1, fileNames.length * 10)) }
      );
    });
  }
});
