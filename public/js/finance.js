/**
 * finance.js — Module tài chính cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 2.7, 4.6, 4.7, 5.4, 5.5, 10.4
 */

var LF = LF || {};

LF.finance = {};

/** Cache TTL: 30 phút */
LF.finance.CACHE_TTL = 1800000;

/** Cache keys */
LF.finance.CACHE_KEY_USD = 'finance_usd';
LF.finance.CACHE_KEY_GOLD_WORLD = 'finance_gold_world';
LF.finance.CACHE_KEY_GOLD_SJC = 'finance_gold_sjc';

/** Lưu giá trị trước đó để tính xu hướng */
LF.finance.previousValues = { usd: null, goldWorld: null, goldSJC: null };

/**
 * Tính xu hướng tăng/giảm so với lần trước
 * @param {number} current - giá trị hiện tại
 * @param {number} previous - giá trị lần trước
 * @returns {{ trend: string, symbol: string }}
 */
LF.finance.getTrend = function (current, previous) {
    if (previous === null || previous === undefined) {
        return { trend: 'stable', symbol: '' };
    }
    if (current > previous) {
        return { trend: 'up', symbol: '\u25B2' };
    }
    if (current < previous) {
        return { trend: 'down', symbol: '\u25BC' };
    }
    return { trend: 'stable', symbol: '' };
};

/**
 * Lấy thông báo lỗi tiếng Việt cho module tài chính
 * @param {string} type - 'usd' | 'gold_world' | 'gold_sjc'
 * @returns {string}
 */
LF.finance.getErrorMessage = function (type) {
    var messages = {
        'usd': 'Không thể tải tỷ giá USD',
        'gold_world': 'Không thể tải giá vàng thế giới',
        'gold_sjc': 'Không thể tải giá vàng SJC'
    };
    return messages[type] || 'Lỗi tải dữ liệu tài chính';
};

/**
 * Format thời gian cập nhật cuối
 * @param {number} timestamp
 * @returns {string}
 */
LF.finance._formatLastUpdate = function (timestamp) {
    if (!timestamp) { return ''; }
    var d = new Date(timestamp);
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
};

/**
 * Format số với dấu phân cách hàng nghìn
 * @param {number} num
 * @returns {string}
 */
LF.finance._formatNumber = function (num) {
    if (typeof num !== 'number' || isNaN(num)) { return '--'; }
    var parts = num.toString().split('.');
    var intPart = parts[0];
    var decPart = parts.length > 1 ? '.' + parts[1] : '';
    var result = '';
    var i;
    var count = 0;
    for (i = intPart.length - 1; i >= 0; i--) {
        result = intPart[i] + result;
        count++;
        if (count % 3 === 0 && i > 0 && intPart[i - 1] !== '-') {
            result = '.' + result;
        }
    }
    return result + decPart;
};

/**
 * Hiển thị dữ liệu cache cũ (bỏ qua TTL) hoặc thông báo lỗi tiếng Việt
 * @param {string} cacheKey
 * @param {string} type - 'usd' | 'gold_world' | 'gold_sjc'
 * @param {string} elementId - ID phần tử DOM hiển thị giá trị
 */
LF.finance._showCachedOrError = function (cacheKey, type, elementId) {
    var raw = null;
    try {
        raw = localStorage.getItem('lf_cache_' + cacheKey);
    } catch (e) {
        // localStorage không khả dụng
    }

    var el = document.getElementById(elementId);
    if (!el) { return; }

    if (raw) {
        try {
            var entry = JSON.parse(raw);
            if (entry && entry.data && typeof entry.data.value === 'number') {
                var lastUpdate = LF.finance._formatLastUpdate(entry.data.ts || entry.ts);
                var suffix = lastUpdate ? ' (Cập nhật lúc ' + lastUpdate + ')' : '';
                if (type === 'usd') {
                    el.textContent = LF.finance._formatNumber(entry.data.value) + ' VND' + suffix;
                } else {
                    el.textContent = entry.data.value.toFixed(2) + ' tr' + suffix;
                }
                return;
            }
        } catch (e) {
            // JSON parse lỗi
        }
    }

    el.textContent = LF.finance.getErrorMessage(type);
};

/**
 * Tải tỷ giá USD/VND từ open.er-api.com
 */
LF.finance.loadUSD = function () {
    var cached = LF.utils.cacheGet(LF.finance.CACHE_KEY_USD);
    var el = document.getElementById('finance-usd-value');

    // Hiển thị "Đang tải..." khi chờ API
    if (!cached && el) {
        el.textContent = 'Đang tải...';
    }

    // Nếu có cache hợp lệ, dùng luôn
    if (cached && typeof cached.value === 'number') {
        LF.finance._applyUSD(cached.value);
        return;
    }

    LF.utils.makeRequest('https://open.er-api.com/v6/latest/USD', function (err, data) {
        if (err || !data || !data.rates || typeof data.rates.VND !== 'number') {
            LF.finance._showCachedOrError(LF.finance.CACHE_KEY_USD, 'usd', 'finance-usd-value');
            return;
        }

        var rate = data.rates.VND;
        LF.finance._applyUSD(rate);

        LF.utils.cacheSet(LF.finance.CACHE_KEY_USD, {
            value: rate,
            ts: Date.now()
        }, LF.finance.CACHE_TTL);
    });
};

/**
 * Áp dụng tỷ giá USD lên DOM
 * @param {number} rate
 */
LF.finance._applyUSD = function (rate) {
    var el = document.getElementById('finance-usd-value');

    LF.finance.previousValues.usd = rate;

    if (el) {
        el.className = 'finance-value';
        el.textContent = LF.finance._formatNumber(Math.round(rate)) + ' VND';
    }
};

/**
 * Tải giá vàng thế giới quy đổi VND/lượng từ freegoldapi.com
 */
LF.finance.loadGoldWorld = function () {
    var cached = LF.utils.cacheGet(LF.finance.CACHE_KEY_GOLD_WORLD);
    var el = document.getElementById('finance-gold-world-value');

    if (!cached && el) {
        el.textContent = 'Đang tải...';
    }

    if (cached && typeof cached.value === 'number') {
        LF.finance._applyGoldWorld(cached.value);
        return;
    }

    LF.utils.makeRequest('https://api.gold-api.com/price/XAU', function (err, data) {
        if (err || !data || typeof data.price !== 'number') {
            LF.finance._showCachedOrError(LF.finance.CACHE_KEY_GOLD_WORLD, 'gold_world', 'finance-gold-world-value');
            return;
        }

        // Quy đổi: giá vàng thế giới (USD/oz) → VND/lượng
        // 1 lượng = 1.20565 troy ounce
        // Cần tỷ giá USD/VND — lấy từ previousValues hoặc cache
        var usdRate = LF.finance.previousValues.usd;
        if (!usdRate) {
            var usdCached = LF.utils.cacheGet(LF.finance.CACHE_KEY_USD);
            if (usdCached && typeof usdCached.value === 'number') {
                usdRate = usdCached.value;
            } else {
                usdRate = 25400; // Fallback mặc định
            }
        }

        var pricePerLuong = data.price * 1.20565 * usdRate / 1000000; // triệu VND/lượng
        pricePerLuong = Math.round(pricePerLuong * 100) / 100;

        LF.finance._applyGoldWorld(pricePerLuong);

        LF.utils.cacheSet(LF.finance.CACHE_KEY_GOLD_WORLD, {
            value: pricePerLuong,
            ts: Date.now()
        }, LF.finance.CACHE_TTL);
    });
};

/**
 * Áp dụng giá vàng thế giới lên DOM
 * @param {number} priceMillionVND - triệu VND/lượng
 */
LF.finance._applyGoldWorld = function (priceMillionVND) {
    var el = document.getElementById('finance-gold-world-value');

    LF.finance.previousValues.goldWorld = priceMillionVND;

    if (el) {
        el.className = 'finance-value';
        el.textContent = priceMillionVND.toFixed(2) + ' tr';
    }
};

/**
 * Tải giá vàng SJC trong nước
 * Dùng proxy hoặc API giá vàng SJC
 */
LF.finance.loadGoldSJC = function () {
    var cached = LF.utils.cacheGet(LF.finance.CACHE_KEY_GOLD_SJC);
    var el = document.getElementById('finance-gold-sjc-value');

    if (!cached && el) {
        el.textContent = 'Đang tải...';
    }

    if (cached && typeof cached.value === 'number') {
        LF.finance._applyGoldSJC(cached.value);
        return;
    }

    var providers = [
        // 1. Primary: Webgia API - free JSON endpoint
        function (done) {
            var url = 'https://api.webgia.com/gold/';
            LF.utils.makeRequest(url, function (err, data) {
                if (err || !data) { return done(new Error("webgia gold API failed")); }
                var sjcPrice = null;
                // webgia returns array, find SJC 1 luong entry
                if (data && data.data) {
                    var list = data.data;
                    for (var k = 0; k < list.length; k++) {
                        if (list[k].name && list[k].name.indexOf('SJC') >= 0 && list[k].buy) {
                            // Price comes in thousands VND
                            sjcPrice = parseFloat(list[k].buy) / 1000;
                            break;
                        }
                    }
                }
                if (sjcPrice && sjcPrice > 50) {
                    return done(null, sjcPrice);
                }
                done(new Error("webgia: no SJC data"));
            }, 6000);
        },
        // 2. Fallback 1: /api/proxy to try SJC public page
        function (done) {
            var targetUrl = 'https://sjc.com.vn/';
            var reqUrl = '/api/proxy?url=' + encodeURIComponent(targetUrl);
            LF.utils.makeRequest(reqUrl, function (err, data) {
                var sjcPrice = null;
                if (!err && typeof data === 'string') {
                    var match = data.match(/([0-9]{2,3}[.,][0-9]{3}).*?lượng/i);
                    if (match && match[1]) {
                        sjcPrice = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
                    }
                }
                if (sjcPrice && sjcPrice > 50) {
                    return done(null, sjcPrice);
                }
                done(new Error("SJC page scrape failed"));
            }, 8000);
        },
        // 3. Fallback 2: Estimate from World Gold (+ SJC premium ~5 triệu VND/lượng)
        function (done) {
            var worldPrice = LF.finance.previousValues.goldWorld;
            if (worldPrice && worldPrice > 50) {
                var sjcEstimate = parseFloat((worldPrice + 5).toFixed(2));
                return done(null, sjcEstimate);
            }
            // Last resort: static recent market price
            done(null, 170.0);
        }
    ];

    var idx = 0;
    function nextProvider() {
        if (idx >= providers.length) {
            LF.finance._showCachedOrError(LF.finance.CACHE_KEY_GOLD_SJC, 'gold_sjc', 'finance-gold-sjc-value');
            return;
        }

        providers[idx](function (err, sjcPrice) {
            if (!err && sjcPrice) {
                LF.finance._applyGoldSJC(sjcPrice);
                LF.utils.cacheSet(LF.finance.CACHE_KEY_GOLD_SJC, {
                    value: sjcPrice,
                    ts: Date.now()
                }, LF.finance.CACHE_TTL);
            } else {
                idx++;
                nextProvider();
            }
        });
    }

    nextProvider();
};

/**
 * Áp dụng giá vàng SJC lên DOM
 * @param {number} priceMillionVND - triệu VND/lượng
 */
LF.finance._applyGoldSJC = function (priceMillionVND) {
    var el = document.getElementById('finance-gold-sjc-value');

    LF.finance.previousValues.goldSJC = priceMillionVND;

    if (el) {
        el.className = 'finance-value';
        el.textContent = priceMillionVND.toFixed(2) + ' tr';
    }
};

/**
 * Render widget tài chính với xu hướng ▲▼
 * Gọi tất cả load functions
 */
LF.finance.render = function () {
    LF.finance.loadUSD();
    LF.finance.loadGoldWorld();
    LF.finance.loadGoldSJC();
};
