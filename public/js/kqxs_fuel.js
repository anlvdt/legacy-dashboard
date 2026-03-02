/**
 * kqxs_fuel.js — Module Xổ số 3 miền và Giá Xăng cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function)
 */

var LF = LF || {};

/* =========================================================================
   LF.kqxs - Module Kết quả xổ số 
   ========================================================================= */
LF.kqxs = {};
LF.kqxs.CACHE_KEY = 'kqxs';
LF.kqxs.CACHE_TTL = 900000; // 15 mins

LF.kqxs.init = function () {
    var cached = LF.utils.cacheGet(LF.kqxs.CACHE_KEY, LF.kqxs.CACHE_TTL);
    if (cached) {
        LF.kqxs.render(cached);
    } else {
        LF.kqxs.fetchData();
    }
};

LF.kqxs.fetchData = function () {
    LF.utils.makeRequest('/api/kqxs', function (err, data) {
        if (!err && data) {
            LF.utils.cacheSet(LF.kqxs.CACHE_KEY, data, LF.kqxs.CACHE_TTL);
            LF.kqxs.render(data);
        } else {
            LF.kqxs.renderError();
        }
    });
};

LF.kqxs.render = function (data) {
    if (!data) {
        LF.kqxs.renderError();
        return;
    }

    var setRow = function (id, d) {
        var el = document.getElementById(id);
        if (el) {
            var valSpan = el.querySelector('.kqxs-value');
            if (valSpan) {
                if (d) {
                    valSpan.className = 'kqxs-value';
                    valSpan.textContent = d.dacbiet || d.giai1 || 'Đang chờ KQ';
                } else {
                    valSpan.className = 'kqxs-value loading';
                    valSpan.textContent = 'Chưa có KQ';
                }
            }
        }
    };

    setRow('kqxs-mb', data.mb);
    setRow('kqxs-mt', data.mt);
    setRow('kqxs-mn', data.mn);
};

LF.kqxs.renderError = function () {
    var ids = ['kqxs-mb', 'kqxs-mt', 'kqxs-mn'];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) {
            var valSpan = el.querySelector('.kqxs-value');
            if (valSpan) {
                valSpan.className = 'kqxs-value loading';
                valSpan.textContent = 'Lỗi kết nối';
            }
        }
    }
};


/* =========================================================================
   LF.fuel - Module Giá xăng dầu
   ========================================================================= */
LF.fuel = {};
LF.fuel.CACHE_KEY = 'fuel';
LF.fuel.CACHE_TTL = 900000; // 15 mins

LF.fuel.init = function () {
    var cached = LF.utils.cacheGet(LF.fuel.CACHE_KEY, LF.fuel.CACHE_TTL);
    if (cached) {
        LF.fuel.render(cached);
    } else {
        LF.fuel.fetchData();
    }
};

LF.fuel.fetchData = function () {
    LF.utils.makeRequest('/api/fuel', function (err, response) {
        if (!err && response && response.data) {
            LF.utils.cacheSet(LF.fuel.CACHE_KEY, response.data, LF.fuel.CACHE_TTL);
            LF.fuel.render(response.data);
        } else {
            LF.fuel.renderError();
        }
    });
};

LF.fuel.render = function (data) {
    if (!data) {
        LF.fuel.renderError();
        return;
    }

    var format = function (val) {
        if (!val) return '---';
        return parseInt(val, 10).toLocaleString('vi-VN') + ' đ';
    };

    var e95 = document.getElementById('fuel-ron95-value');
    var e5 = document.getElementById('fuel-e5-value');
    var edo = document.getElementById('fuel-do-value');

    if (e95) { e95.className = 'fuel-value'; e95.textContent = format(data['ron95']); }
    if (e5) { e5.className = 'fuel-value'; e5.textContent = format(data['e5']); }
    if (edo) { edo.className = 'fuel-value'; edo.textContent = format(data['do']); }
};

LF.fuel.renderError = function () {
    var ids = ['fuel-ron95-value', 'fuel-e5-value', 'fuel-do-value'];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) {
            el.className = 'fuel-value loading';
            el.textContent = 'Lỗi dữ liệu';
        }
    }
};
