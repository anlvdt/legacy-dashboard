/**
 * agriculture.js — Module giá cà phê nội địa cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Hiển thị giá cà phê Robusta nội địa (Tây Nguyên)
 * + Giá Robusta ICE London (USD/tấn)
 * + Xu hướng tăng/giảm
 * + Giá theo vùng
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

/**
 * Format số có dấu chấm phân cách hàng nghìn
 * @param {number} n
 * @returns {string}
 */
LF.agriculture._formatNumber = function (n) {
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
    return r;
};

/**
 * Format change value with sign: +100 or -1.400
 */
LF.agriculture._formatChange = function (val) {
    if (!val || val === 0) return '';
    var sign = val > 0 ? '+' : '';
    return sign + LF.agriculture._formatNumber(val);
};

LF.agriculture.render = function (data) {
    if (!data || !data.coffee) {
        LF.agriculture.renderError();
        return;
    }

    // Giá Robusta nội địa (Tây Nguyên)
    var coffeeEl = document.getElementById('agri-coffee-value');
    if (coffeeEl) {
        coffeeEl.className = 'agri-value';
        coffeeEl.textContent = LF.agriculture._formatNumber(data.coffee) + ' \u0111/kg';
    }

    // Giá Robusta ICE London
    var worldEl = document.getElementById('agri-coffee-world');
    var worldRow = document.getElementById('agri-world-row');
    if (worldEl && data.coffeeWorld) {
        var wText = LF.agriculture._formatNumber(data.coffeeWorld) + ' USD/t\u1EA5n';
        if (data.robustaChange) {
            wText += ' ' + LF.agriculture._formatChange(data.robustaChange);
        }
        worldEl.textContent = wText;
        if (worldRow) { worldRow.style.display = ''; }
    }

    // Giá Arabica New York
    var arabicaEl = document.getElementById('agri-arabica-value');
    var arabicaRow = document.getElementById('agri-arabica-row');
    if (arabicaEl && data.arabica) {
        var aText = data.arabica + ' \u00A2/lb';
        if (data.arabicaChange) {
            aText += ' ' + LF.agriculture._formatChange(data.arabicaChange);
        }
        arabicaEl.textContent = aText;
        if (arabicaRow) { arabicaRow.style.display = ''; }
    }

    // Giá Hồ tiêu
    var pepperEl = document.getElementById('agri-pepper-value');
    var pepperRow = document.getElementById('agri-pepper-row');
    if (pepperEl && data.pepper) {
        var pepperText = LF.agriculture._formatNumber(data.pepper) + ' \u0111/kg';
        if (data.pepperChange && data.pepperChange !== 0) {
            pepperText += ' ' + LF.agriculture._formatChange(data.pepperChange);
        }
        pepperEl.textContent = pepperText;
        if (pepperRow) { pepperRow.style.display = ''; }
    }

    // Xu hướng tăng/giảm
    var changeEl = document.getElementById('agri-coffee-change');
    if (changeEl && data.coffeeChange !== null && data.coffeeChange !== undefined) {
        var change = data.coffeeChange;
        if (change > 0) {
            changeEl.textContent = '\u25B2 +' + LF.agriculture._formatNumber(change);
            changeEl.className = 'agri-change agri-change-up';
        } else if (change < 0) {
            changeEl.textContent = '\u25BC ' + LF.agriculture._formatNumber(change);
            changeEl.className = 'agri-change agri-change-down';
        } else {
            changeEl.textContent = '\u25AC 0';
            changeEl.className = 'agri-change agri-change-flat';
        }
        changeEl.style.display = '';
    }

    // Giá theo vùng (with per-region change)
    var regionsEl = document.getElementById('agri-coffee-regions');
    if (regionsEl && data.coffeeRegions && data.coffeeRegions.length > 0) {
        var html = '';
        var i;
        for (i = 0; i < data.coffeeRegions.length; i++) {
            var region = data.coffeeRegions[i];
            html += '<div class="agri-region-item">';
            html += '<span class="agri-region-name">' + region.name + '</span>';
            html += '<span class="agri-region-price">' + LF.agriculture._formatNumber(region.price) + '</span>';
            if (region.change !== undefined && region.change !== null) {
                var cls = region.change < 0 ? 'agri-change-down' : (region.change > 0 ? 'agri-change-up' : 'agri-change-flat');
                var prefix = region.change > 0 ? '+' : '';
                html += '<span class="agri-region-change ' + cls + '">' + prefix + LF.agriculture._formatNumber(region.change) + '</span>';
            }
            html += '</div>';
        }
        regionsEl.innerHTML = html;
        regionsEl.style.display = '';
    }
};

LF.agriculture.renderError = function () {
    // Ẩn widget khi không có dữ liệu nào
    var widget = document.getElementById('agriculture-widget');
    if (widget) { widget.style.display = 'none'; }
};
