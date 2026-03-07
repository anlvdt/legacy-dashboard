/**
 * Property test: Timeout mặc định cho API request
 * Feature: legacy-frame-upgrade, Property 19: Timeout mặc định cho API request
 *
 * Validates: Requirements 10.6
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the ES5 module source
const utilsCode = readFileSync(
  resolve(__dirname, '../public/js/utils.js'),
  'utf-8'
);

function loadUtilsGlobal() {
  const wrappedCode = utilsCode + '\n; globalThis.LF = LF;';
  const fn = new Function(wrappedCode);
  fn();
}

describe('Feature: legacy-frame-upgrade, Property 19: Timeout mặc định cho API request', () => {
  let capturedTimeout;
  let OriginalXHR;

  beforeEach(() => {
    delete globalThis.LF;
    capturedTimeout = null;

    // Save original XMLHttpRequest and replace with a spy that captures timeout
    OriginalXHR = globalThis.XMLHttpRequest;
    globalThis.XMLHttpRequest = function () {
      this.readyState = 0;
      this.status = 0;
      this.responseText = '';
      this.timeout = 0;
      this.open = function () {};
      this.send = function () {};
      this.onreadystatechange = null;
      this.ontimeout = null;
      this.onerror = null;
    };

    // Use a Proxy on the prototype to capture timeout assignment
    const xhrProto = globalThis.XMLHttpRequest.prototype;
    const testCtx = { capturedTimeout: null };

    globalThis.XMLHttpRequest = function () {
      this.readyState = 0;
      this.status = 0;
      this.responseText = '';
      this._timeout = 0;
      this.open = function () {};
      this.send = function () {};
      this.onreadystatechange = null;
      this.ontimeout = null;
      this.onerror = null;

      Object.defineProperty(this, 'timeout', {
        get() { return this._timeout; },
        set(val) {
          this._timeout = val;
          capturedTimeout = val;
        },
        configurable: true,
      });
    };

    loadUtilsGlobal();
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = OriginalXHR;
    delete globalThis.LF;
  });

  /**
   * Property 19: For any URL, calling makeRequest(url, callback) without a
   * third timeout argument must set XHR.timeout to 12000 (12 seconds).
   *
   * **Validates: Requirements 10.6**
   */
  it('makeRequest without timeout parameter sets XHR.timeout === 12000 for any URL', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (url) => {
          capturedTimeout = null;
          const callback = function () {};

          // Call makeRequest with only url and callback — no timeout arg
          globalThis.LF.utils.makeRequest(url, callback);

          expect(capturedTimeout).toBe(12000);
        }
      ),
      { numRuns: 100 }
    );
  });
});
