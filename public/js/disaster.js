/**
 * disaster.js — Module cảnh báo thiên tai cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 2.4, 6.3, 6.4
 */

var LF = LF || {};

LF.disaster = {};

/** Cache key và TTL (10 phút) */
LF.disaster.CACHE_KEY = 'disaster';
LF.disaster.CACHE_TTL = 600000;

/** GDACS API timeout */
LF.disaster.TIMEOUT = 12000;

/** Bounding box Đông Nam Á: lat -11 đến 28.5, lon 92 đến 142 */
LF.disaster.SEA_BOUNDS = {
    latMin: -11,
    latMax: 28.5,
    lonMin: 92,
    lonMax: 142
};

/** Trạng thái lazy-load */
LF.disaster._loaded = false;

/**
 * Lọc events theo khu vực Đông Nam Á (bounding box)
 * @param {Array} events - mảng events { title, alertlevel, lat, lon, ... }
 * @returns {Array} events nằm trong bounding box ĐNA
 */
LF.disaster.filterSEAsia = function (events) {
    var result = [];
    var bounds = LF.disaster.SEA_BOUNDS;
    var i, ev, lat, lon;

    if (!events || !events.length) {
        return result;
    }

    for (i = 0; i < events.length; i++) {
        ev = events[i];
        lat = parseFloat(ev.lat);
        lon = parseFloat(ev.lon);

        if (isNaN(lat) || isNaN(lon)) {
            continue;
        }

        if (lat >= bounds.latMin && lat <= bounds.latMax &&
            lon >= bounds.lonMin && lon <= bounds.lonMax) {
            result.push(ev);
        }
    }

    return result;
};


/**
 * Render banner cảnh báo thiên tai
 * Mức Red có màu đỏ #ff4444
 * @param {Array} events - mảng events đã lọc
 */
LF.disaster.renderBanner = function (events) {
    if (!events || !events.length) {
        LF.disaster.removeBanner();
        return;
    }

    // Ưu tiên event mức Red, sau đó Orange, rồi Green
    var priorityOrder = ['Red', 'Orange', 'Green'];
    var sorted = [];
    var p, i;

    for (p = 0; p < priorityOrder.length; p++) {
        for (i = 0; i < events.length; i++) {
            if (events[i].alertlevel === priorityOrder[p]) {
                sorted.push(events[i]);
            }
        }
    }

    // Thêm các event không có alertlevel chuẩn
    for (i = 0; i < events.length; i++) {
        var found = false;
        var j;
        for (j = 0; j < sorted.length; j++) {
            if (sorted[j] === events[i]) {
                found = true;
                break;
            }
        }
        if (!found) {
            sorted.push(events[i]);
        }
    }

    var topEvent = sorted[0];
    var banner = document.getElementById('disaster-banner');

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'disaster-banner';
        document.body.appendChild(banner);
    }

    // Xóa nội dung cũ
    while (banner.firstChild) {
        banner.removeChild(banner.firstChild);
    }

    // Xóa className cũ
    banner.className = '';

    // Thêm className theo mức cảnh báo
    var alertLevel = topEvent.alertlevel || '';
    if (alertLevel === 'Red') {
        banner.className = 'show alert-red';
        banner.style.backgroundColor = '#ff4444';
        banner.style.color = '#fff';
    } else if (alertLevel === 'Orange') {
        banner.className = 'show alert-orange';
        banner.style.backgroundColor = '#e67e22';
        banner.style.color = '#fff';
    } else if (alertLevel === 'Green') {
        banner.className = 'show alert-green';
        banner.style.backgroundColor = '#27ae60';
        banner.style.color = '#fff';
    } else {
        banner.className = 'show';
        banner.style.backgroundColor = '#e67e22';
        banner.style.color = '#fff';
    }

    // Icon cảnh báo
    var icon = document.createElement('span');
    icon.className = 'disaster-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';

    // Text cảnh báo
    var text = document.createElement('span');
    text.className = 'disaster-text';
    var title = topEvent.title || 'Cảnh báo thiên tai';
    if (sorted.length > 1) {
        title = title + ' (+' + (sorted.length - 1) + ' cảnh báo khác)';
    }
    text.textContent = title;

    // Nút đóng
    var closeBtn = document.createElement('button');
    closeBtn.className = 'disaster-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = function () {
        LF.disaster.removeBanner();
    };

    banner.appendChild(icon);
    banner.appendChild(text);
    banner.appendChild(closeBtn);
};

/**
 * Xóa banner cảnh báo
 */
LF.disaster.removeBanner = function () {
    var banner = document.getElementById('disaster-banner');
    if (banner) {
        banner.className = '';
        banner.style.display = 'none';
        // Xóa nội dung
        while (banner.firstChild) {
            banner.removeChild(banner.firstChild);
        }
    }
};

/**
 * Lấy thông báo lỗi tiếng Việt cho module thiên tai
 * @returns {string}
 */
LF.disaster.getErrorMessage = function () {
    return 'Không thể tải cảnh báo thiên tai';
};

/**
 * Tải alerts từ GDACS, lọc Đông Nam Á, render banner
 * Lazy-load: chỉ tải khi được gọi lần đầu
 * Cache kết quả với TTL 10 phút
 */
LF.disaster.load = function () {
    // Kiểm tra cache trước
    var cached = LF.utils.cacheGet(LF.disaster.CACHE_KEY);
    if (cached) {
        var filtered = LF.disaster.filterSEAsia(cached);
        LF.disaster.renderBanner(filtered);
        LF.disaster._loaded = true;
        return;
    }

    var gdacsUrl = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Green;Orange;Red&eventlist=EQ;TC;FL;VO;DR;WF&fromDate=' + LF.disaster._getDateRange();

    LF.utils.makeRequest(gdacsUrl, function (err, data) {
        if (err || !data) {
            // Thử cache cũ (bỏ qua TTL)
            var oldCached = null;
            try {
                var raw = localStorage.getItem('lf_cache_' + LF.disaster.CACHE_KEY);
                if (raw) {
                    var entry = JSON.parse(raw);
                    if (entry && entry.data) {
                        oldCached = entry.data;
                    }
                }
            } catch (e) {
                // ignore
            }

            if (oldCached) {
                var filtered = LF.disaster.filterSEAsia(oldCached);
                LF.disaster.renderBanner(filtered);
            }
            return;
        }

        // Parse GDACS response — events nằm trong features array
        var events = [];
        var features = (data.features) ? data.features : [];
        var i, f, props, geo;

        for (i = 0; i < features.length; i++) {
            f = features[i];
            props = (f.properties) ? f.properties : {};
            geo = (f.geometry && f.geometry.coordinates) ? f.geometry.coordinates : [];

            events.push({
                title: props.name || props.eventname || props.htmldescription || '',
                alertlevel: props.alertlevel || '',
                lat: geo[1] !== undefined ? geo[1] : null,
                lon: geo[0] !== undefined ? geo[0] : null,
                eventtype: props.eventtype || '',
                fromdate: props.fromdate || ''
            });
        }

        // Cache kết quả
        LF.utils.cacheSet(LF.disaster.CACHE_KEY, events, LF.disaster.CACHE_TTL);

        // Lọc và render
        var filtered = LF.disaster.filterSEAsia(events);
        LF.disaster.renderBanner(filtered);
        LF.disaster._loaded = true;
    }, LF.disaster.TIMEOUT);
};

/**
 * Lấy date range cho GDACS API (30 ngày trước)
 * @returns {string} format YYYY-MM-DD
 */
LF.disaster._getDateRange = function () {
    var now = new Date();
    var past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    var yyyy = past.getFullYear();
    var mm = (past.getMonth() + 1 < 10) ? '0' + (past.getMonth() + 1) : '' + (past.getMonth() + 1);
    var dd = (past.getDate() < 10) ? '0' + past.getDate() : '' + past.getDate();
    return yyyy + '-' + mm + '-' + dd;
};

/**
 * Khởi tạo module thiên tai (lazy-load — gọi khi cần)
 */
LF.disaster.init = function () {
    if (LF.disaster._loaded) { return; }
    LF.disaster.load();
};
