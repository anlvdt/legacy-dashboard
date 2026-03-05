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
            // Thử stale cache trước khi hiện lỗi
            var stale = LF.utils.cacheGetStale(LF.kqxs.CACHE_KEY);
            if (stale) {
                LF.kqxs.render(stale);
            } else {
                LF.kqxs.renderError();
            }
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
    // Ẩn widget khi không có dữ liệu nào
    var widget = document.getElementById('kqxs-widget');
    if (widget) { widget.style.display = 'none'; }
};


/* =========================================================================
   LF.fuel - Module Giá xăng dầu
   ========================================================================= */
LF.fuel = {};
LF.fuel.CACHE_KEY = 'fuel';
LF.fuel.CACHE_TTL = 900000; // 15 mins
LF.fuel.DAILY_KEY = 'fuel_daily_snapshot';

LF.fuel.init = function () {
    var cached = LF.utils.cacheGet(LF.fuel.CACHE_KEY, LF.fuel.CACHE_TTL);
    if (cached) {
        LF.fuel.render(cached);
    } else {
        LF.fuel.fetchData();
    }
};

/**
 * Lưu giá trị hôm nay vào daily snapshot
 */
LF.fuel._saveDailySnapshot = function (key, value) {
    try {
        var today = new Date().toISOString().split('T')[0];
        var raw = localStorage.getItem('lf_' + LF.fuel.DAILY_KEY);
        var snapshot = raw ? JSON.parse(raw) : {};
        if (snapshot.date && snapshot.date !== today) {
            snapshot.prev = snapshot.current || {};
            snapshot.current = {};
            snapshot.date = today;
        }
        if (!snapshot.date) {
            snapshot.date = today;
            snapshot.current = {};
            snapshot.prev = {};
        }
        if (!snapshot.current[key]) {
            snapshot.current[key] = value;
        }
        localStorage.setItem('lf_' + LF.fuel.DAILY_KEY, JSON.stringify(snapshot));
    } catch (e) { }
};

/**
 * Lấy giá trị hôm qua
 */
LF.fuel._getPrevDayValue = function (key) {
    try {
        var raw = localStorage.getItem('lf_' + LF.fuel.DAILY_KEY);
        if (!raw) return null;
        var snapshot = JSON.parse(raw);
        if (snapshot.prev && typeof snapshot.prev[key] === 'number') {
            return snapshot.prev[key];
        }
    } catch (e) { }
    return null;
};

/**
 * Render thay đổi giá vào DOM element (colored badge ▲▼)
 */
LF.fuel._renderChange = function (changeElId, current, previous) {
    var changeEl = document.getElementById(changeElId);
    if (!changeEl) return;
    if (previous === null || previous === undefined) {
        changeEl.textContent = '';
        changeEl.className = 'price-change';
        return;
    }
    var diff = current - previous;
    if (Math.abs(diff) < 1) {
        changeEl.textContent = '\u25AC 0';
        changeEl.className = 'price-change price-change-flat';
        return;
    }
    var sign = diff > 0 ? '+' : '';
    var arrow = diff > 0 ? '\u25B2 ' : '\u25BC ';
    var cls = diff > 0 ? 'price-change-up' : 'price-change-down';
    changeEl.textContent = arrow + sign + LF.fuel._formatNumber(Math.round(diff));
    changeEl.className = 'price-change ' + cls;
};

/**
 * Format số có dấu chấm phân cách hàng nghìn
 */
LF.fuel._formatNumber = function (n) {
    var s = '' + Math.abs(n);
    var r = '';
    var c = 0;
    var i;
    for (i = s.length - 1; i >= 0; i--) {
        r = s[i] + r;
        c++;
        if (c % 3 === 0 && i > 0) {
            r = '.' + r;
        }
    }
    return (n < 0 ? '-' : '') + r;
};

LF.fuel.fetchData = function () {
    LF.utils.makeRequest('/api/fuel', function (err, response) {
        if (!err && response && response.data) {
            LF.utils.cacheSet(LF.fuel.CACHE_KEY, response.data, LF.fuel.CACHE_TTL);
            LF.fuel.render(response.data);
        } else {
            // Thử stale cache trước khi hiện lỗi
            var stale = LF.utils.cacheGetStale(LF.fuel.CACHE_KEY);
            if (stale) {
                LF.fuel.render(stale);
            } else {
                LF.fuel.renderError();
            }
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
        var n = parseInt(val, 10);
        var s = '' + n;
        var r = '';
        var c = 0;
        var i;
        for (i = s.length - 1; i >= 0; i--) {
            r = s[i] + r;
            c++;
            if (c % 3 === 0 && i > 0 && s[i - 1] !== '-') {
                r = '.' + r;
            }
        }
        return r + ' \u0111';
    };

    var items = [
        { key: 'ron95', valueId: 'fuel-ron95-value', changeId: 'fuel-ron95-change' },
        { key: 'e5', valueId: 'fuel-e5-value', changeId: 'fuel-e5-change' },
        { key: 'do', valueId: 'fuel-do-value', changeId: 'fuel-do-change' }
    ];

    var i, item, el, val;
    for (i = 0; i < items.length; i++) {
        item = items[i];
        val = data[item.key] ? parseInt(data[item.key], 10) : 0;
        el = document.getElementById(item.valueId);
        if (el) {
            el.className = 'fuel-value';
            el.textContent = format(data[item.key]);
        }
        if (val) {
            LF.fuel._saveDailySnapshot(item.key, val);
            var prev = LF.fuel._getPrevDayValue(item.key);
            LF.fuel._renderChange(item.changeId, val, prev);
        }
    }
};

LF.fuel.renderError = function () {
    // Ẩn widget khi không có dữ liệu nào
    var widget = document.getElementById('fuel-widget');
    if (widget) { widget.style.display = 'none'; }
};
