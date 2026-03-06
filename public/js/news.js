/**
 * news.js — Module tin tức cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Hiển thị tin tức dạng inline widget (ngang hàng với các khối khác)
 * Tự cuộn lên liên tục kiểu teleprompter
 * Khi TTS đọc: cuộn đồng bộ với bài đang đọc
 */

var LF = LF || {};

LF.news = {};

/** Danh sách nguồn tin RSS */
LF.news.sources = [
    { name: 'VnExpress', url: 'https://vnexpress.net/rss/tin-moi-nhat.rss' },
    { name: 'Thanh Niên', url: 'https://thanhnien.vn/rss/home.rss' },
    { name: 'Dân Trí', url: 'https://dantri.com.vn/rss/home.rss' },
    { name: 'Tuổi Trẻ', url: 'https://tuoitre.vn/rss/tin-moi-nhat.rss' }
];

/** Danh sách từ khoá chuyên mục cần lọc bỏ (nội dung không phù hợp) */
LF.news.BLOCKED_KEYWORDS = [
    'tam su tham kin', 'tâm sự thầm kín',
    'tam su', 'tâm sự',
    'gioi tinh', 'giới tính',
    'chuyen ay', 'chuyện ấy',
    'phong the', 'phòng the',
    'suc khoe gioi tinh', 'sức khỏe giới tính',
    'tinh duc', 'tình dục',
    'ngoại tình', 'đánh ghen', 'giường chiếu',
    'gợi cảm', 'gợi dục', 'ái ân',
    'khỏa thân', 'khiêu dâm', 'mại dâm', 'sex', 'người lớn',
    'cưỡng hiếp', 'cưỡng bức', 'hiếp dâm', 'xâm hại tình dục',
    'tử thi', 'phân xác', 'giết người', 'chặt xác',
    'đâm chết', 'chém chết', 'thiêu sống',
    'clip nóng', 'ảnh nóng', 'lộ hàng', 'nhạy cảm',
    'sugar baby', 'sugar daddy', 'bán dâm'
];

/**
 * Kiểm tra xem bài viết có thuộc chuyên mục bị chặn không
 * @param {string} title
 * @param {string} link
 * @param {string} description
 * @returns {boolean} true nếu bị chặn
 */
LF.news._isBlocked = function (title, link, description) {
    var text = ((title || '') + ' ' + (link || '') + ' ' + (description || '')).toLowerCase();
    // Bỏ dấu tiếng Việt để so sánh
    var normalized = text;
    try {
        normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {
        // normalize() không hỗ trợ trên thiết bị cũ, dùng text gốc
    }
    var i;
    for (i = 0; i < LF.news.BLOCKED_KEYWORDS.length; i++) {
        if (text.indexOf(LF.news.BLOCKED_KEYWORDS[i]) !== -1) { return true; }
        if (normalized.indexOf(LF.news.BLOCKED_KEYWORDS[i]) !== -1) { return true; }
    }
    return false;
};

/** Cache key và TTL (15 phút) */
LF.news.CACHE_KEY = 'news';
LF.news.CACHE_TTL = 900000;

/** Danh sách dự phòng CORS Proxy */
LF.news.CORS_PROXIES = [
    '/api/proxy?url=',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors.lol/?'
];

/** RSS timeout riêng: 10 giây cho mỗi proxy */
LF.news.RSS_TIMEOUT = 10000;

/** Refresh interval: 15 phút */
LF.news.REFRESH_INTERVAL = 900000;

/** Trạng thái */
LF.news._scrollAnimId = null;
LF.news._refreshTimer = null;
LF.news._loaded = false;
LF.news._items = [];
LF.news._scrollOffset = 0;
LF.news._scrollPaused = false;

/**
 * Strip HTML tags khỏi mô tả RSS
 */
LF.news._stripHtml = function (html) {
    if (!html) { return ''; }
    var s = html.replace(/<\!\[CDATA\[/g, '').replace(/\]\]>/g, '');
    s = s.replace(/<[^>]+>/g, ' ');
    s = s.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    s = s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    if (s.length > 300) {
        s = s.substring(0, 297) + '...';
    }
    return s;
};

/**
 * Parse RSS XML thành mảng items
 */
LF.news.parseRSS = function (xmlString, sourceName) {
    var items = [];
    if (!xmlString || typeof xmlString !== 'string') { return items; }

    var parser, doc;
    try {
        parser = new DOMParser();
        doc = parser.parseFromString(xmlString, 'text/xml');
    } catch (e) { return items; }

    if (!doc) { return items; }
    var parseError = doc.getElementsByTagName('parsererror');
    if (parseError && parseError.length > 0) { return items; }

    var itemNodes = doc.getElementsByTagName('item');
    var i, titleNode, linkNode, descNode, title, link, description;

    for (i = 0; i < itemNodes.length; i++) {
        titleNode = itemNodes[i].getElementsByTagName('title')[0];
        linkNode = itemNodes[i].getElementsByTagName('link')[0];
        descNode = itemNodes[i].getElementsByTagName('description')[0];

        title = '';
        link = '';
        description = '';

        if (titleNode) {
            title = titleNode.textContent || titleNode.childNodes[0] && titleNode.childNodes[0].nodeValue || '';
            title = title.replace(/^\s+|\s+$/g, '');
        }
        if (linkNode) {
            link = linkNode.textContent || linkNode.childNodes[0] && linkNode.childNodes[0].nodeValue || '';
            link = link.replace(/^\s+|\s+$/g, '');
        }
        if (descNode) {
            var rawDesc = descNode.textContent || descNode.childNodes[0] && descNode.childNodes[0].nodeValue || '';
            description = LF.news._stripHtml(rawDesc);
        }

        if (title) {
            // Lọc bỏ bài thuộc chuyên mục bị chặn
            if (LF.news._isBlocked(title, link, description)) { continue; }

            items.push({
                title: title,
                description: description,
                link: link,
                source: sourceName || ''
            });
        }
    }
    return items;
};

/**
 * Build DOM cho inline scroll view (cuộn dọc kiểu teleprompter)
 */
LF.news._buildInlineDOM = function (items) {
    var container = document.getElementById('news-inline-scroll-content');
    if (!container) { return; }

    while (container.firstChild) { container.removeChild(container.firstChild); }

    if (!items || !items.length) {
        var emptyEl = document.createElement('div');
        emptyEl.className = 'news-scroll-item';
        emptyEl.textContent = 'Không có tin tức';
        container.appendChild(emptyEl);
        return;
    }

    var i, item, el, sourceSpan, titleSpan;
    for (i = 0; i < items.length; i++) {
        item = items[i];

        el = document.createElement('div');
        el.className = 'news-scroll-item';
        el.setAttribute('data-index', i);

        sourceSpan = document.createElement('span');
        sourceSpan.className = 'news-scroll-source';
        sourceSpan.textContent = item.source || '';

        titleSpan = document.createElement('span');
        titleSpan.className = 'news-scroll-title';
        titleSpan.textContent = item.title || '';

        el.appendChild(sourceSpan);
        el.appendChild(titleSpan);

        // Click mở link
        (function (lnk) {
            el.addEventListener('click', function () {
                if (lnk) { window.open(lnk, '_blank'); }
            });
        })(item.link);

        container.appendChild(el);
    }
};

/**
 * Bắt đầu animation cuộn dọc liên tục (teleprompter)
 */
LF.news.startScrollAnimation = function () {
    var scrollView = document.getElementById('news-inline-scroll-view');
    var content = document.getElementById('news-inline-scroll-content');
    if (!scrollView || !content) { return; }

    LF.news.stopScrollAnimation();
    LF.news._scrollOffset = 0;
    var speed = 0.5; // pixel per frame

    function animate() {
        if (LF.news._scrollPaused) {
            LF.news._scrollAnimId = (typeof requestAnimationFrame === 'function')
                ? requestAnimationFrame(animate)
                : setTimeout(animate, 16);
            return;
        }

        LF.news._scrollOffset += speed;

        var contentHeight = content.scrollHeight;
        var viewHeight = scrollView.offsetHeight;

        // Reset khi cuộn hết
        if (LF.news._scrollOffset >= contentHeight) {
            LF.news._scrollOffset = -viewHeight;
        }

        content.style.cssText = '-webkit-transform:translateY(' + (-LF.news._scrollOffset) + 'px);transform:translateY(' + (-LF.news._scrollOffset) + 'px)';

        LF.news._scrollAnimId = (typeof requestAnimationFrame === 'function')
            ? requestAnimationFrame(animate)
            : setTimeout(animate, 16);
    }

    LF.news._scrollAnimId = (typeof requestAnimationFrame === 'function')
        ? requestAnimationFrame(animate)
        : setTimeout(animate, 16);
};

/**
 * Dừng animation cuộn
 */
LF.news.stopScrollAnimation = function () {
    if (LF.news._scrollAnimId !== null) {
        if (typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(LF.news._scrollAnimId);
        } else {
            clearTimeout(LF.news._scrollAnimId);
        }
        LF.news._scrollAnimId = null;
    }
};

/**
 * Cuộn tới item cụ thể (dùng khi TTS đọc)
 */
LF.news.scrollToItem = function (index) {
    var content = document.getElementById('news-inline-scroll-content');
    if (!content) { return; }

    var items = content.getElementsByClassName('news-scroll-item');
    if (!items[index]) { return; }

    // Highlight item đang đọc
    var i;
    for (i = 0; i < items.length; i++) {
        items[i].className = items[i].className.replace(/\s*news-scroll-active/g, '');
    }
    items[index].className = items[index].className + ' news-scroll-active';

    // Cuộn tới vị trí item
    LF.news._scrollOffset = items[index].offsetTop;
    content.style.cssText = '-webkit-transform:translateY(' + (-LF.news._scrollOffset) + 'px);transform:translateY(' + (-LF.news._scrollOffset) + 'px)';
};

/**
 * Xóa highlight tất cả items
 */
LF.news.clearHighlight = function () {
    var content = document.getElementById('news-inline-scroll-content');
    if (!content) { return; }
    var items = content.getElementsByClassName('news-scroll-item');
    var i;
    for (i = 0; i < items.length; i++) {
        items[i].className = items[i].className.replace(/\s*news-scroll-active/g, '');
    }
};

/**
 * Hiển thị tin tức lên inline widget
 */
LF.news._renderInline = function (items, isStale) {
    var widget = document.getElementById('news-widget');
    if (!widget) { return; }

    LF.news._items = items || [];

    LF.news._buildInlineDOM(items);

    // Hiện widget
    if (items && items.length > 0) {
        widget.style.display = '';
    } else {
        // Ẩn widget khi không có tin tức
        widget.style.display = 'none';
    }

    // Hiện nút TTS
    if (items && items.length > 0) {
        var ttsBtn = document.getElementById('news-inline-tts-btn');
        if (ttsBtn) { ttsBtn.style.display = ''; }
    }

    // Bắt đầu cuộn
    LF.news.startScrollAnimation();
};

// Backward compat — old code gọi _renderTicker
LF.news._renderTicker = LF.news._renderInline;

/**
 * Lấy thông báo lỗi tiếng Việt
 */
LF.news.getErrorMessage = function () {
    return 'Không thể tải tin tức';
};

/**
 * Lấy tin tức từ cache
 */
LF.news._getCachedItems = function () {
    var raw = null;
    try { raw = localStorage.getItem('lf_cache_' + LF.news.CACHE_KEY); } catch (e) { return null; }
    if (!raw) { return null; }
    try {
        var entry = JSON.parse(raw);
        if (entry && entry.data && entry.data.length) { return entry.data; }
    } catch (e) { }
    return null;
};

/**
 * Tải RSS từ một nguồn qua XHR
 */
LF.news._loadRSSSource = function (source, callback) {
    var proxyIndex = 0;

    function tryNextProxy() {
        if (proxyIndex >= LF.news.CORS_PROXIES.length) {
            return callback([]);
        }

        var proxyBase = LF.news.CORS_PROXIES[proxyIndex];
        var proxyUrl = proxyBase + encodeURIComponent(source.url);

        var xhr = new XMLHttpRequest();
        var done = false;

        xhr.open('GET', proxyUrl, true);
        xhr.timeout = LF.news.RSS_TIMEOUT;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4 || done) { return; }
            done = true;

            if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
                if (xhr.responseText.indexOf('<?xml') === -1 && xhr.responseText.indexOf('<rss') === -1) {
                    proxyIndex++;
                    tryNextProxy();
                    return;
                }

                var items = LF.news.parseRSS(xhr.responseText, source.name);
                if (items && items.length > 0) {
                    callback(items);
                } else {
                    proxyIndex++;
                    tryNextProxy();
                }
            } else {
                proxyIndex++;
                tryNextProxy();
            }
        };

        xhr.ontimeout = function () {
            if (done) { return; }
            done = true;
            proxyIndex++;
            tryNextProxy();
        };

        xhr.onerror = function () {
            if (done) { return; }
            done = true;
            proxyIndex++;
            tryNextProxy();
        };

        xhr.send(null);
    }

    tryNextProxy();
};

/**
 * Tải tin từ nhiều nguồn đồng thời
 */
LF.news.loadMultiSource = function () {
    var current = (LF.settings && LF.settings.current) ? LF.settings.current : {};
    var isMulti = current.newsMultiSource !== false;
    var sources;

    if (isMulti) {
        sources = LF.news.sources;
    } else {
        var idx = current.newsSourceIndex || 0;
        if (idx >= LF.news.sources.length) { idx = 0; }
        sources = [LF.news.sources[idx]];
    }

    var allItems = [];
    var completed = 0;
    var total = sources.length;

    function onAllDone() {
        if (allItems.length > 0) {
            LF.utils.cacheSet(LF.news.CACHE_KEY, allItems, LF.news.CACHE_TTL);
            LF.news._renderInline(allItems, false);
            LF.news._loaded = true;
        } else {
            var cached = LF.news._getCachedItems();
            if (cached && cached.length > 0) {
                LF.news._items = cached;
                LF.news._renderInline(cached, true);
            } else {
                LF.news._renderInline([], false);
            }
        }
    }

    var i;
    for (i = 0; i < sources.length; i++) {
        LF.news._loadRSSSource(sources[i], function (items) {
            completed++;
            if (items && items.length > 0) {
                var j;
                for (j = 0; j < items.length; j++) { allItems.push(items[j]); }
            }
            if (completed >= total) { onAllDone(); }
        });
    }
};

/**
 * Tự động refresh mỗi 15 phút
 */
LF.news.scheduleRefresh = function () {
    if (LF.news._refreshTimer !== null) {
        clearInterval(LF.news._refreshTimer);
        LF.news._refreshTimer = null;
    }
    LF.news._refreshTimer = setInterval(function () {
        LF.news.loadMultiSource();
    }, LF.news.REFRESH_INTERVAL);
};

LF.news.stopRefresh = function () {
    if (LF.news._refreshTimer !== null) {
        clearInterval(LF.news._refreshTimer);
        LF.news._refreshTimer = null;
    }
};

// Backward compat
LF.news.stopAnimation = LF.news.stopScrollAnimation;
LF.news.startAnimation = LF.news.startScrollAnimation;

/**
 * Khởi tạo module tin tức
 */
LF.news.init = function () {
    if (LF.news._loaded) { return; }
    LF.news.loadMultiSource();
    LF.news.scheduleRefresh();
};

/* ================================================================
 * NEWS PANEL — Giữ lại cho backward compat
 * ================================================================ */
LF.news.openPanel = function () { };
LF.news.closePanel = function () { };
LF.news.bindPanelEvents = function () { };
LF.news._buildPanelList = function () { };
