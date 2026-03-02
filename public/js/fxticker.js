/**
 * fxticker.js — Ticker tỷ giá ngoại tệ + vàng thế giới
 * Chạy ngang cạnh dưới màn hình
 * Tất cả cú pháp ES5 (var, function)
 */

var LF = LF || {};

LF.fxticker = {};

LF.fxticker.CACHE_KEY = 'fx_ticker';
LF.fxticker.CACHE_TTL = 1800000; // 30 phút

/** Danh sách đồng tiền cần hiển thị */
LF.fxticker.CURRENCIES = ['EUR', 'JPY', 'GBP', 'CNY', 'KRW', 'THB', 'AUD', 'SGD', 'TWD'];

/** Animation frame ID */
LF.fxticker._animId = null;
LF.fxticker._position = 0;

/**
 * Khởi tạo ticker
 */
LF.fxticker.init = function () {
    var cached = LF.utils.cacheGet(LF.fxticker.CACHE_KEY, LF.fxticker.CACHE_TTL);
    if (cached && cached.items && cached.items.length > 0) {
        LF.fxticker._render(cached.items);
    }
    LF.fxticker._fetchData();
};

/**
 * Fetch tỷ giá từ open.er-api.com + giá vàng từ gold-api.com
 */
LF.fxticker._fetchData = function () {
    var items = [];
    var done = 0;
    var total = 2;

    function checkDone() {
        done++;
        if (done >= total && items.length > 0) {
            LF.utils.cacheSet(LF.fxticker.CACHE_KEY, { items: items, ts: Date.now() }, LF.fxticker.CACHE_TTL);
            LF.fxticker._render(items);
        }
    }

    // 1. Tỷ giá ngoại tệ (quy đổi sang VND)
    LF.utils.makeRequest('https://open.er-api.com/v6/latest/USD', function (err, data) {
        if (!err && data && data.rates && data.rates.VND) {
            var usdVnd = data.rates.VND;
            // USD
            items.push({ code: 'USD', value: LF.fxticker._fmt(Math.round(usdVnd)), unit: '' });

            var currencies = LF.fxticker.CURRENCIES;
            var i, code, rate, vndRate;
            for (i = 0; i < currencies.length; i++) {
                code = currencies[i];
                rate = data.rates[code];
                if (rate && rate > 0) {
                    vndRate = usdVnd / rate;
                    if (code === 'JPY' || code === 'KRW' || code === 'TWD') {
                        items.push({ code: code, value: LF.fxticker._fmt(Math.round(vndRate * 100)), unit: '/100' });
                    } else {
                        items.push({ code: code, value: LF.fxticker._fmt(Math.round(vndRate)), unit: '' });
                    }
                }
            }
        }
        checkDone();
    }, 10000);

    // 2. Giá vàng thế giới
    LF.utils.makeRequest('https://api.gold-api.com/price/XAU', function (err, data) {
        if (!err && data && typeof data.price === 'number') {
            items.push({ code: 'V\u00E0ng TG', value: '$' + LF.fxticker._fmt(Math.round(data.price)), unit: '/oz' });
            // Bạc
        }
        if (!err && data && typeof data.price_gram_24k === 'number') {
            // Thêm giá vàng theo gram
        }
        checkDone();
    }, 10000);
};

/**
 * Format số với dấu chấm phân cách hàng nghìn
 * @param {number} num
 * @returns {string}
 */
LF.fxticker._fmt = function (num) {
    var str = num.toString();
    var result = '';
    var count = 0;
    var i;
    for (i = str.length - 1; i >= 0; i--) {
        result = str[i] + result;
        count++;
        if (count % 3 === 0 && i > 0 && str[i - 1] !== '-') {
            result = '.' + result;
        }
    }
    return result;
};

/**
 * Render ticker content và bắt đầu animation
 * @param {Array} items - [{code, value, unit}]
 */
LF.fxticker._render = function (items) {
    var container = document.getElementById('fx-ticker');
    var content = document.getElementById('fx-ticker-content');
    if (!container || !content) { return; }

    var html = '';
    var i;
    for (i = 0; i < items.length; i++) {
        html += '<span class="fx-item"><span class="fx-code">' + items[i].code + '</span> <span class="fx-val">' + items[i].value + items[i].unit + '</span></span>';
        if (i < items.length - 1) {
            html += '<span class="fx-sep">\u00B7</span>';
        }
    }

    // Nhân đôi nội dung để tạo loop liền mạch
    content.innerHTML = html + '<span class="fx-sep">\u00B7</span>' + html;
    container.style.display = '';

    LF.fxticker._startScroll();
};

/**
 * Bắt đầu scroll animation (dùng requestAnimationFrame)
 */
LF.fxticker._startScroll = function () {
    var content = document.getElementById('fx-ticker-content');
    if (!content) { return; }

    LF.fxticker._position = 0;
    var speed = 0.3; // pixels per frame

    function step() {
        LF.fxticker._position -= speed;
        var halfWidth = content.scrollWidth / 2;
        if (Math.abs(LF.fxticker._position) >= halfWidth) {
            LF.fxticker._position = 0;
        }
        content.style.webkitTransform = 'translateX(' + LF.fxticker._position + 'px)';
        content.style.transform = 'translateX(' + LF.fxticker._position + 'px)';
        LF.fxticker._animId = requestAnimationFrame(step);
    }

    if (LF.fxticker._animId) {
        cancelAnimationFrame(LF.fxticker._animId);
    }
    LF.fxticker._animId = requestAnimationFrame(step);
};

/**
 * Dừng scroll animation
 */
LF.fxticker.stop = function () {
    if (LF.fxticker._animId) {
        cancelAnimationFrame(LF.fxticker._animId);
        LF.fxticker._animId = null;
    }
};
