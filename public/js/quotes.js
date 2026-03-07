/**
 * quotes.js — Module ca dao, tục ngữ cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 5.7
 */

var LF = LF || {};

LF.quotes = {};

/** Interval ID cho rotate */
LF.quotes._rotateInterval = null;

/** Index câu hiện tại */
LF.quotes._currentIndex = -1;

/** Sự kiện lịch sử "ngày này" */
LF.quotes._historyEvents = [];

/** Đếm lượt rotate để xen kẽ lịch sử */
LF.quotes._rotateCount = 0;

/**
 * Bộ sưu tập ca dao, tục ngữ, danh ngôn tiếng Việt
 * Dữ liệu được tải từ quotes-data.js (500 câu chọn lọc từ Vietnamese Quotes API)
 * Fallback inline 3 câu phòng khi file data chưa load
 */
LF.quotes.collection = (typeof LF.quotesData !== 'undefined' && LF.quotesData.length > 0)
    ? LF.quotesData
    : [
        { text: 'Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra.', author: 'Ca dao', category: 'gia-dinh' },
        { text: 'Có công mài sắt có ngày nên kim.', author: 'Tục ngữ', category: 'cuoc-song' },
        { text: 'Không thầy đố mày làm nên.', author: 'Tục ngữ', category: 'hoc-tap' }
    ];

/**
 * Tải thêm ca dao, tục ngữ từ API (bổ sung vào collection inline)
 * Collection inline đã có sẵn — gọi callback ngay
 * @param {function} callback
 */
LF.quotes.loadData = function (callback) {
    // Collection inline đã có sẵn — gọi callback ngay
    if (callback) { callback(); }

    // Tải sự kiện "ngày này trong lịch sử" (không block)
    LF.quotes._loadHistory();
};

/**
 * Tải sự kiện "ngày này trong lịch sử" từ byabbe.se
 */
LF.quotes._loadHistory = function () {
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var url = 'https://byabbe.se/on-this-day/' + month + '/' + day + '/events.json';

    if (typeof LF.utils === 'undefined' || !LF.utils.makeRequest) { return; }

    LF.utils.makeRequest(url, function (err, data) {
        if (err || !data || !data.events || !data.events.length) { return; }

        var events = data.events;
        var picked = [];
        var i, ev;

        // Lọc sự kiện có năm >= 1800 và mô tả ngắn gọn
        for (i = 0; i < events.length; i++) {
            ev = events[i];
            if (ev.year && parseInt(ev.year, 10) >= 1800 && ev.description && ev.description.length < 200) {
                picked.push({
                    year: ev.year,
                    text: ev.description
                });
            }
        }

        // Giữ tối đa 15 sự kiện ngẫu nhiên
        if (picked.length > 15) {
            picked.sort(function () { return Math.random() - 0.5; });
            picked = picked.slice(0, 15);
        }

        LF.quotes._historyEvents = picked;
    }, 8000);
};

/**
 * Hiển thị câu ca dao ngẫu nhiên hoặc sự kiện lịch sử (xen kẽ) lên DOM
 * Mỗi 3 lượt ca dao sẽ xen 1 sự kiện lịch sử
 */
LF.quotes.showRandom = function () {
    LF.quotes._rotateCount++;

    // Xen kẽ: mỗi 3 lượt hiện 1 sự kiện lịch sử
    if (LF.quotes._historyEvents.length > 0 && LF.quotes._rotateCount % 3 === 0) {
        LF.quotes._showHistoryEvent();
        return;
    }

    var collection = LF.quotes.collection;
    if (!collection || !collection.length) { return; }

    var index = Math.floor(Math.random() * collection.length);
    // Tránh lặp lại câu vừa hiển thị
    if (collection.length > 1 && index === LF.quotes._currentIndex) {
        index = (index + 1) % collection.length;
    }
    LF.quotes._currentIndex = index;

    var quote = collection[index];
    var textEl = document.getElementById('quote-text');
    var authorEl = document.getElementById('quote-author');
    var wrapperEl = document.getElementById('quote-widget');

    if (textEl) {
        textEl.textContent = quote.text;
    }
    if (authorEl) {
        authorEl.textContent = '\u2014 ' + quote.author;
    }
    if (wrapperEl) {
        if (wrapperEl.className.indexOf('loaded') === -1) {
            wrapperEl.className += ' loaded';
        }
    }
};

/**
 * Hiển thị 1 sự kiện lịch sử "ngày này"
 */
LF.quotes._showHistoryEvent = function () {
    var events = LF.quotes._historyEvents;
    if (!events.length) { return; }

    var idx = Math.floor(Math.random() * events.length);
    var ev = events[idx];

    var textEl = document.getElementById('quote-text');
    var authorEl = document.getElementById('quote-author');

    if (textEl) {
        textEl.textContent = ev.text;
    }
    if (authorEl) {
        authorEl.textContent = '\u2014 Ng\u00E0y n\u00E0y n\u0103m ' + ev.year;
    }
};

/**
 * Đổi câu mới định kỳ (mỗi 60 giây)
 * @param {number} intervalMs - khoảng thời gian giữa các lần đổi (mặc định 60000ms)
 */
LF.quotes.rotate = function (intervalMs) {
    var interval = intervalMs || 60000;

    LF.quotes.loadData(function () {
        // Dừng rotate cũ nếu có
        if (LF.quotes._rotateInterval) {
            clearInterval(LF.quotes._rotateInterval);
            LF.quotes._rotateInterval = null;
        }

        // Hiển thị câu đầu tiên ngay
        LF.quotes.showRandom();

        // Đặt interval đổi câu
        LF.quotes._rotateInterval = setInterval(function () {
            LF.quotes.showRandom();
        }, interval);
    });
};
