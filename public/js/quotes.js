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
};

/**
 * Hiển thị câu ca dao ngẫu nhiên lên DOM
 */
LF.quotes.showRandom = function () {
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
