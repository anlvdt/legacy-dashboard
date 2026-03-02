/**
 * news.js — Module tin tức cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 2.2, 2.4, 2.6, 6.1, 6.2, 6.5, 6.6, 6.7
 * Bổ sung: parse description RSS, LF.news._items, openPanel(), TTS integration
 */

var LF = LF || {};

LF.news = {};

/** Danh sách nguồn tin RSS */
LF.news.sources = [
    { name: 'VnExpress', url: 'https://vnexpress.net/rss/tin-moi-nhat.rss' },
    { name: 'Thanh Niên', url: 'https://thanhnien.vn/rss/home.rss' },
    { name: 'Dân Trí', url: 'https://dantri.com.vn/rss/home.rss' },
    { name: 'Báo Chính Phủ', url: 'https://baochinhphu.vn/rss/tin-moi.rss' },
    { name: 'VTV News', url: 'https://vtv.vn/trong-nuoc.rss' }
];

/** Cache key và TTL (15 phút) */
LF.news.CACHE_KEY = 'news';
LF.news.CACHE_TTL = 900000;

/** Danh sách dự phòng CORS Proxy (Ưu tiên proxy nội bộ Netlify) */
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

/** Trạng thái animation */
LF.news._animationId = null;
LF.news._refreshTimer = null;
LF.news._tickerOffset = 0;
LF.news._loaded = false;
LF.news._items = []; // Danh sách tin đã tải — dùng cho TTS và news panel

/**
 * Strip HTML tags khỏi mô tả RSS
 * @param {string} html
 * @returns {string}
 */
LF.news._stripHtml = function (html) {
    if (!html) { return ''; }
    // Loại bỏ CDATA
    var s = html.replace(/<\!\[CDATA\[/g, '').replace(/\]\]>/g, '');
    // Loại bỏ HTML tags
    s = s.replace(/<[^>]+>/g, ' ');
    // Decode HTML entities cơ bản
    s = s.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    // Chuẩn hoá khoảng trắng
    s = s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    // Giới hạn 300 ký tự
    if (s.length > 300) {
        s = s.substring(0, 297) + '...';
    }
    return s;
};

/**
 * Parse RSS XML thành mảng items
 * @param {string} xmlString - chuỗi XML RSS
 * @param {string} sourceName - tên nguồn tin
 * @returns {Array} mảng items { title, description, link, source }
 */
LF.news.parseRSS = function (xmlString, sourceName) {
    var items = [];
    if (!xmlString || typeof xmlString !== 'string') {
        return items;
    }

    var parser;
    var doc;
    try {
        parser = new DOMParser();
        doc = parser.parseFromString(xmlString, 'text/xml');
    } catch (e) {
        return items;
    }

    if (!doc) {
        return items;
    }

    // Kiểm tra lỗi parse XML
    var parseError = doc.getElementsByTagName('parsererror');
    if (parseError && parseError.length > 0) {
        return items;
    }

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
 * Build DOM cho ticker (dùng DocumentFragment), hiển thị tên nguồn
 * Ticker items mở news panel khi click thay vì mở link trực tiếp
 * @param {Array} items - mảng items { title, description, link, source }
 * @returns {DocumentFragment}
 */
LF.news.buildTickerDOM = function (items) {
    var elements = [];
    var i, item, el, sourceSpan, titleSpan, sep;

    if (!items || !items.length) {
        var emptyEl = document.createElement('span');
        emptyEl.className = 'news-ticker-item';
        emptyEl.textContent = 'Không có tin tức';
        elements.push(emptyEl);
        return LF.utils.createFragment(elements);
    }

    for (i = 0; i < items.length; i++) {
        item = items[i];

        // Dùng <a> để giữ semantics và tương thích test
        // Click intercepted để mở news panel thay vì đi thẳng tới link
        el = document.createElement('a');
        el.className = 'news-ticker-item';
        el.href = item.link || '#';
        el.target = '_blank';
        el.rel = 'noopener';
        el.setAttribute('data-index', i);

        sourceSpan = document.createElement('span');
        sourceSpan.className = 'news-ticker-source';
        sourceSpan.textContent = item.source || '';

        titleSpan = document.createElement('span');
        titleSpan.className = 'news-ticker-title';
        titleSpan.textContent = item.title || '';

        el.appendChild(sourceSpan);
        el.appendChild(titleSpan);

        // Intercept click → mở news panel (không theo link trực tiếp)
        (function (idx) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                LF.news.openPanel(idx);
            });
        })(i);

        elements.push(el);

        if (i < items.length - 1) {
            sep = document.createElement('span');
            sep.className = 'news-ticker-separator';
            sep.textContent = ' | ';
            elements.push(sep);
        }
    }

    return LF.utils.createFragment(elements);
};

/**
 * Animation ticker bằng requestAnimationFrame
 * Cuộn ngang liên tục
 */
LF.news.startAnimation = function () {
    var ticker = document.getElementById('news-ticker-content');
    if (!ticker) { return; }

    // Dừng animation cũ nếu có
    LF.news.stopAnimation();

    LF.news._tickerOffset = 0;
    var speed = 1; // pixel per frame

    function animate() {
        if (!ticker.firstChild) {
            LF.news._animationId = null;
            return;
        }

        LF.news._tickerOffset -= speed;

        // Reset khi cuộn hết nội dung
        var contentWidth = ticker.scrollWidth;
        var containerWidth = ticker.parentNode ? ticker.parentNode.offsetWidth : 0;

        if (LF.news._tickerOffset < -contentWidth) {
            LF.news._tickerOffset = containerWidth;
        }

        ticker.style.cssText = '-webkit-transform:translateX(' + LF.news._tickerOffset + 'px);transform:translateX(' + LF.news._tickerOffset + 'px)';

        LF.news._animationId = (typeof requestAnimationFrame === 'function')
            ? requestAnimationFrame(animate)
            : setTimeout(animate, 16);
    }

    LF.news._animationId = (typeof requestAnimationFrame === 'function')
        ? requestAnimationFrame(animate)
        : setTimeout(animate, 16);
};

/**
 * Dừng animation ticker
 */
LF.news.stopAnimation = function () {
    if (LF.news._animationId !== null) {
        if (typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(LF.news._animationId);
        } else {
            clearTimeout(LF.news._animationId);
        }
        LF.news._animationId = null;
    }
};

/**
 * Hiển thị tin tức lên ticker
 * @param {Array} items - mảng items
 * @param {boolean} isStale - true nếu dùng tin cũ
 */
LF.news._renderTicker = function (items, isStale) {
    var container = document.getElementById('news-ticker-content');
    if (!container) { return; }

    // Lưu items vào _items để TTS và news panel sử dụng
    LF.news._items = items || [];

    // Xóa nội dung cũ
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Thêm thông báo "Đang dùng tin cũ" nếu cần
    if (isStale) {
        var staleEl = document.createElement('span');
        staleEl.className = 'news-ticker-stale';
        staleEl.textContent = 'Đang dùng tin cũ — ';
        container.appendChild(staleEl);
    }

    var fragment = LF.news.buildTickerDOM(items);
    container.appendChild(fragment);

    // Mostra nút TTS khi đã có tin (luôn hiện, không cần bật setting)
    if (items && items.length > 0) {
        var ttsBtn = document.getElementById('news-tts-btn');
        if (ttsBtn) { ttsBtn.style.display = ''; }
    }

    // Bắt đầu animation
    LF.news.startAnimation();
};

/**
 * Lấy thông báo lỗi tiếng Việt cho module tin tức
 * @returns {string}
 */
LF.news.getErrorMessage = function () {
    return 'Không thể tải tin tức';
};

/**
 * Lấy tin tức từ cache (bỏ qua TTL — dùng cho fallback)
 * @returns {Array|null}
 */
LF.news._getCachedItems = function () {
    var raw = null;
    try {
        raw = localStorage.getItem('lf_cache_' + LF.news.CACHE_KEY);
    } catch (e) {
        return null;
    }
    if (!raw) { return null; }
    try {
        var entry = JSON.parse(raw);
        if (entry && entry.data && entry.data.length) {
            return entry.data;
        }
    } catch (e) {
        // JSON parse lỗi
    }
    return null;
};

/**
 * Tải RSS từ một nguồn qua XHR trực tiếp (trả text, không parse JSON)
 * Áp dụng cơ chế dự phòng liên hoàn (Fallback CORS Proxies)
 * @param {Object} source - { name, url }
 * @param {function} callback - function(items)
 */
LF.news._loadRSSSource = function (source, callback) {
    var proxyIndex = 0;

    function tryNextProxy() {
        if (proxyIndex >= LF.news.CORS_PROXIES.length) {
            // Đã thử hết tất cả proxy mà vẫn thất bại
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
                // Kiểm tra xem payload trả về có valid XML không (để chống lỗi proxy trả về HTML báo lỗi)
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

    // Bắt đầu thử từ proxy đầu tiên
    tryNextProxy();
};

/**
 * Tải tin từ nhiều nguồn đồng thời
 * Dùng allorigins.win proxy cho RSS
 */
LF.news.loadMultiSource = function () {
    var sources = LF.news.sources;
    var allItems = [];
    var completed = 0;
    var total = sources.length;

    // Hiển thị "Đang tải..." khi bắt đầu
    var container = document.getElementById('news-ticker-content');
    if (container && !LF.news._loaded) {
        container.textContent = 'Đang tải tin tức...';
    }

    function onAllDone() {
        if (allItems.length > 0) {
            // Lưu cache
            LF.utils.cacheSet(LF.news.CACHE_KEY, allItems, LF.news.CACHE_TTL);
            LF.news._renderTicker(allItems, false);
            LF.news._loaded = true;
        } else {
            // Không có tin nào — thử cache (bỏ qua TTL)
            var cached = LF.news._getCachedItems();
            if (cached && cached.length > 0) {
                LF.news._items = cached;
                LF.news._renderTicker(cached, true);
            } else {
                LF.news._renderTicker([], false);
            }
        }
    }

    var i;
    for (i = 0; i < sources.length; i++) {
        LF.news._loadRSSSource(sources[i], function (items) {
            completed++;

            if (items && items.length > 0) {
                var j;
                for (j = 0; j < items.length; j++) {
                    allItems.push(items[j]);
                }
            }

            if (completed >= total) {
                onAllDone();
            }
        });
    }
};


/**
 * Tự động refresh mỗi 15 phút
 */
LF.news.scheduleRefresh = function () {
    // Xóa timer cũ nếu có
    if (LF.news._refreshTimer !== null) {
        clearInterval(LF.news._refreshTimer);
        LF.news._refreshTimer = null;
    }

    LF.news._refreshTimer = setInterval(function () {
        LF.news.loadMultiSource();
    }, LF.news.REFRESH_INTERVAL);
};

/**
 * Dừng refresh tự động
 */
LF.news.stopRefresh = function () {
    if (LF.news._refreshTimer !== null) {
        clearInterval(LF.news._refreshTimer);
        LF.news._refreshTimer = null;
    }
};

/**
 * Khởi tạo module tin tức (lazy-load — gọi khi cần)
 */
LF.news.init = function () {
    if (LF.news._loaded) { return; }
    LF.news.loadMultiSource();
    LF.news.scheduleRefresh();
};

/* ================================================================
 * NEWS PANEL — Overlay hiển thị danh sách tin đầy đủ + TTS
 * ================================================================ */

/**
 * Mở news panel, có thể scroll tới vị trí cụ thể
 * @param {number} [scrollToIndex] - index của bài muốn focus
 */
LF.news.openPanel = function (scrollToIndex) {
    var overlay = document.getElementById('news-panel');
    if (!overlay) { return; }

    // Điền nội dung
    LF.news._buildPanelList(LF.news._items);

    // Hiển thị panel
    overlay.className = overlay.className.replace(/\s*show/g, '') + ' show';

    // Scroll tới item nếu có yêu cầu
    if (typeof scrollToIndex === 'number') {
        var list = document.getElementById('news-panel-list');
        if (list) {
            var items = list.getElementsByClassName('news-panel-item');
            if (items[scrollToIndex] && items[scrollToIndex].scrollIntoView) {
                setTimeout(function () {
                    try { items[scrollToIndex].scrollIntoView({ block: 'center' }); } catch (e) { }
                }, 100);
            }
        }
    }
};

/**
 * Đóng news panel
 */
LF.news.closePanel = function () {
    var overlay = document.getElementById('news-panel');
    if (!overlay) { return; }
    overlay.className = overlay.className.replace(/\s*show/g, '');
    // Dừng TTS khi đóng panel
    if (LF.tts && LF.tts.stop) { LF.tts.stop(); }
};

/**
 * Xây dựng danh sách tin trong panel
 * @param {Array} items
 */
LF.news._buildPanelList = function (items) {
    var list = document.getElementById('news-panel-list');
    if (!list) { return; }

    // Xóa nội dung cũ
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }

    if (!items || items.length === 0) {
        var emptyMsg = document.createElement('p');
        emptyMsg.className = 'news-panel-empty';
        emptyMsg.textContent = 'Chưa có tin tức. Hãy kiểm tra kết nối mạng.';
        list.appendChild(emptyMsg);
        return;
    }

    var i, item, el, sourceEl, titleEl, descEl, actionsEl, linkBtn, readBtn;

    for (i = 0; i < items.length; i++) {
        item = items[i];

        el = document.createElement('div');
        el.className = 'news-panel-item';

        // Nguồn tin
        sourceEl = document.createElement('span');
        sourceEl.className = 'news-panel-source';
        sourceEl.textContent = item.source || '';
        el.appendChild(sourceEl);

        // Tiêu đề
        titleEl = document.createElement('div');
        titleEl.className = 'news-panel-title';
        titleEl.textContent = item.title || '';
        el.appendChild(titleEl);

        // Mô tả ngắn
        if (item.description) {
            descEl = document.createElement('div');
            descEl.className = 'news-panel-desc';
            descEl.textContent = item.description;
            el.appendChild(descEl);
        }

        // Actions: Đọc + Mở link
        actionsEl = document.createElement('div');
        actionsEl.className = 'news-panel-actions';

        // Nút Đọc riêng lẻ
        readBtn = document.createElement('button');
        readBtn.className = 'news-panel-read-btn';
        readBtn.innerHTML = '<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="currentColor" style="vertical-align:-0.15em; margin-right:0.25em"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg> Đọc';
        (function (idx, itm) {
            readBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (LF.tts && LF.tts.readNewsList) {
                    LF.tts.readNewsList(LF.news._items, idx);
                }
            });
        })(i, item);
        actionsEl.appendChild(readBtn);

        // Nút mở link
        if (item.link) {
            linkBtn = document.createElement('a');
            linkBtn.className = 'news-panel-btn news-panel-link-btn';
            linkBtn.textContent = '🔗 Đọc bài';
            linkBtn.href = item.link;
            linkBtn.target = '_blank';
            linkBtn.rel = 'noopener';
            actionsEl.appendChild(linkBtn);
        }

        el.appendChild(actionsEl);
        list.appendChild(el);
    }
};

/**
 * Bind sự kiện cho news panel (gọi sau khi DOM ready)
 */
LF.news.bindPanelEvents = function () {
    // Nút đóng panel
    var closeBtn = document.getElementById('news-panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            LF.news.closePanel();
        });
    }

    // Click outside → đóng panel
    var overlay = document.getElementById('news-panel');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                LF.news.closePanel();
            }
        });
    }

    // Nút "Đọc tất cả" trong panel
    var readAllBtn = document.getElementById('news-panel-read-all-btn');
    if (readAllBtn) {
        readAllBtn.addEventListener('click', function () {
            if (LF.tts && LF.tts._isReading) {
                LF.tts.stop();
            } else if (LF.tts && LF.tts.readNewsList) {
                LF.tts.readNewsList(LF.news._items, 0);
            }
        });
    }
};

