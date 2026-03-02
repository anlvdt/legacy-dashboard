/**
 * agriculture.js — Module giá nông sản cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Hiển thị giá cà phê Robusta nội địa và giá hồ tiêu
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
            LF.agriculture.renderError();
        }
    });
};

LF.agriculture.render = function (data) {
    if (!data) {
        LF.agriculture.renderError();
        return;
    }

    var format = function (val) {
        if (!val) { return 'Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u'; }
        return parseInt(val, 10).toLocaleString('vi-VN') + ' \u0111/kg';
    };

    var coffeeEl = document.getElementById('agri-coffee-value');
    var pepperEl = document.getElementById('agri-pepper-value');

    if (coffeeEl) {
        coffeeEl.className = 'agri-value';
        coffeeEl.textContent = format(data.coffee);
    }
    if (pepperEl) {
        pepperEl.className = 'agri-value';
        pepperEl.textContent = format(data.pepper);
    }
};

LF.agriculture.renderError = function () {
    var ids = ['agri-coffee-value', 'agri-pepper-value'];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) {
            el.className = 'agri-value loading';
            el.textContent = 'L\u1ED7i d\u1EEF li\u1EC7u';
        }
    }
};
