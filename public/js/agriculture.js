/**
 * agriculture.js — Module giá cà phê nội địa cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Hiển thị giá cà phê Robusta nội địa (Tây Nguyên)
 */

var LF = LF || {};

LF.agriculture = {};

LF.agriculture.CACHE_KEY = 'agriculture';
LF.agriculture.CACHE_TTL = 1800000; // 30 phút

LF.agriculture.init = function () {
    var cached = LF.utils.cacheGet(LF.agriculture.CACHE_KEY, LF.agriculture.CACHE_TTL);
    if (cached) {
        LF.agriculture.render(cached);
    } else {
        LF.agriculture.fetchData();
    }
};

LF.agriculture.fetchData = function () {
    LF.utils.makeRequest('/api/agriculture', function (err, response) {
        if (!err && response && response.data) {
            LF.utils.cacheSet(LF.agriculture.CACHE_KEY, response.data, LF.agriculture.CACHE_TTL);
            LF.agriculture.render(response.data);
        } else {
            // Thử stale cache trước khi hiện lỗi
            var stale = LF.utils.cacheGetStale(LF.agriculture.CACHE_KEY);
            if (stale) {
                LF.agriculture.render(stale);
            } else {
                LF.agriculture.renderError();
            }
        }
    });
};

LF.agriculture.render = function (data) {
    if (!data || !data.coffee) {
        LF.agriculture.renderError();
        return;
    }

    var coffeeEl = document.getElementById('agri-coffee-value');
    if (coffeeEl) {
        coffeeEl.className = 'agri-value';
        var n = parseInt(data.coffee, 10);
        var s = '' + n;
        var r = '';
        var c = 0;
        var ii;
        for (ii = s.length - 1; ii >= 0; ii--) {
            r = s[ii] + r;
            c++;
            if (c % 3 === 0 && ii > 0 && s[ii - 1] !== '-') {
                r = '.' + r;
            }
        }
        coffeeEl.textContent = r + ' \u0111/kg';
    }
};

LF.agriculture.renderError = function () {
    // Ẩn widget khi không có dữ liệu nào
    var widget = document.getElementById('agriculture-widget');
    if (widget) { widget.style.display = 'none'; }
};
