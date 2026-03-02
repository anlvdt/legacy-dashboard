/**
 * utils.js — Tiện ích dùng chung cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.5, 2.1, 2.6, 2.7, 10.6, 11.3, 11.4, 11.5
 */

var LF = LF || {};

LF.utils = {};

/**
 * XHR wrapper với timeout
 * @param {string} url
 * @param {function} callback - function(err, data)
 * @param {number} [timeoutMs] - mặc định 12000
 */
LF.utils.makeRequest = function (url, callback, timeoutMs) {
    var timeout = (typeof timeoutMs === 'number') ? timeoutMs : 12000;
    var xhr = new XMLHttpRequest();
    var done = false;

    xhr.open('GET', url, true);
    xhr.timeout = timeout;

    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4 || done) {
            return;
        }
        done = true;

        if (xhr.status >= 200 && xhr.status < 300) {
            var data = null;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                callback(new Error('JSON parse error'), null);
                return;
            }
            callback(null, data);
        } else {
            callback(new Error('HTTP ' + xhr.status), null);
        }
    };

    xhr.ontimeout = function () {
        if (done) { return; }
        done = true;
        callback(new Error('Request timeout'), null);
    };

    xhr.onerror = function () {
        if (done) { return; }
        done = true;
        callback(new Error('Network error'), null);
    };

    xhr.send(null);
    return xhr;
};


/**
 * Cache API response vào localStorage với TTL
 * Key prefix: "lf_cache_"
 * @param {string} key
 * @param {*} data
 * @param {number} ttlMs - thời gian sống (ms)
 */
LF.utils.cacheSet = function (key, data, ttlMs) {
    var storageKey = 'lf_cache_' + key;
    var entry = {
        data: data,
        ts: Date.now(),
        ttl: ttlMs
    };
    try {
        localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (e) {
        // localStorage không khả dụng hoặc đầy — bỏ qua
    }
};

/**
 * Đọc cache, trả null nếu hết hạn hoặc không tìm thấy
 * Key prefix: "lf_cache_"
 * @param {string} key
 * @returns {*|null}
 */
LF.utils.cacheGet = function (key) {
    var storageKey = 'lf_cache_' + key;
    try {
        var raw = localStorage.getItem(storageKey);
        if (raw === null) {
            return null;
        }
        var entry = JSON.parse(raw);
        if (!entry || typeof entry.ts !== 'number' || typeof entry.ttl !== 'number') {
            return null;
        }
        if (Date.now() > entry.ts + entry.ttl) {
            // Hết hạn — xóa luôn
            try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
            return null;
        }
        return entry.data;
    } catch (e) {
        return null;
    }
};

/**
 * Tạo DocumentFragment từ mảng elements
 * @param {Array} elements - mảng các DOM elements
 * @returns {DocumentFragment}
 */
LF.utils.createFragment = function (elements) {
    var frag = document.createDocumentFragment();
    var i;
    if (elements && elements.length) {
        for (i = 0; i < elements.length; i++) {
            if (elements[i]) {
                frag.appendChild(elements[i]);
            }
        }
    }
    return frag;
};

/**
 * Phát hiện thiết bị cũ qua User-Agent
 * Return true cho: iOS < 10, Android < 5, Chrome < 40
 * @returns {boolean}
 */
LF.utils.isLegacyDevice = function () {
    var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    var match;
    var version;

    // iOS < 10: "CPU iPhone OS 9_3_5" hoặc "CPU OS 8_4"
    match = ua.match(/CPU (?:iPhone )?OS (\d+)[_\.]/);
    if (match) {
        version = parseInt(match[1], 10);
        if (version < 10) {
            return true;
        }
    }

    // Android < 5: "Android 4.4.2"
    match = ua.match(/Android (\d+)[\.\s]/);
    if (match) {
        version = parseInt(match[1], 10);
        if (version < 5) {
            return true;
        }
    }

    // Chrome < 40: "Chrome/39.0"
    // Kiểm tra Chrome nhưng loại trừ Edge/OPR để tránh false positive
    if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edge') === -1 && ua.indexOf('OPR') === -1) {
        match = ua.match(/Chrome\/(\d+)/);
        if (match) {
            version = parseInt(match[1], 10);
            if (version < 40) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Batch DOM updates — gom nhiều thay đổi vào 1 reflow
 * Dùng requestAnimationFrame nếu có, fallback setTimeout(fn, 16)
 * @param {function} updateFn
 */
LF.utils.batchUpdate = function (updateFn) {
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(updateFn);
    } else {
        setTimeout(updateFn, 16);
    }
};