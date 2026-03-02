/**
 * slideshow.js — Module ảnh nền cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 2.2, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

var LF = LF || {};

LF.slideshow = {};

/** Danh sách interval hợp lệ */
LF.slideshow._validIntervals = [10000, 15000, 30000, 60000];

/** Interval mặc định */
LF.slideshow._defaultInterval = 12000;

/** Thời gian fade transition (ms) */
LF.slideshow._fadeDuration = 1500;

/** Timeout tải ảnh (ms) */
LF.slideshow._imageTimeout = 10000;

/** Ảnh đã preload sẵn */
LF.slideshow.preloadedImage = null;

/** ID của interval đang chạy */
LF.slideshow._intervalId = null;

/** Trạng thái đang chạy */
LF.slideshow._running = false;

/**
 * Validate interval — chỉ chấp nhận {10000, 15000, 30000, 60000}, mặc định 12000
 * @param {*} intervalMs
 * @returns {number}
 */
LF.slideshow.validateInterval = function (intervalMs) {
    var i;
    for (i = 0; i < LF.slideshow._validIntervals.length; i++) {
        if (intervalMs === LF.slideshow._validIntervals[i]) {
            return intervalMs;
        }
    }
    return LF.slideshow._defaultInterval;
};

/**
 * Chọn kích thước Picsum theo viewport
 * Legacy device → luôn "640/480"
 * w <= 640 → "640/480"
 * w <= 768 → "1024/600"
 * w <= 1280 → "1280/720"
 * w > 1280 → "1920/1080"
 *
 * @param {number} [viewportWidth] - chiều rộng viewport (mặc định lấy từ window)
 * @returns {string} kích thước dạng "width/height"
 */
LF.slideshow.getPicsumSize = function (viewportWidth) {
    var w = (typeof viewportWidth === 'number')
        ? viewportWidth
        : (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1920);

    // Thiết bị cũ → luôn giới hạn 640x480
    if (LF.utils && typeof LF.utils.isLegacyDevice === 'function' && LF.utils.isLegacyDevice()) {
        return '640/480';
    }

    if (w <= 640) {
        return '640/480';
    }
    if (w <= 768) {
        return '1024/600';
    }
    if (w <= 1280) {
        return '1280/720';
    }
    return '1920/1080';
};

/**
 * Tạo URL ảnh Picsum ngẫu nhiên
 * @returns {string}
 */
LF.slideshow._getPicsumUrl = function () {
    var size = LF.slideshow.getPicsumSize();
    return 'https://picsum.photos/' + size + '?random=' + Math.floor(Math.random() * 100000);
};

/**
 * Preload ảnh tiếp theo
 * Tải ảnh mới vào bộ nhớ, bỏ qua nếu lỗi sau 10 giây
 * @param {function} [callback] - function(err, img) gọi khi xong
 */
LF.slideshow.preloadNext = function (callback) {
    var img = new Image();
    var done = false;
    var timer;
    var url = LF.slideshow._getPicsumUrl();

    timer = setTimeout(function () {
        if (done) { return; }
        done = true;
        img.onload = null;
        img.onerror = null;
        img.src = '';
        LF.slideshow.preloadedImage = null;
        if (typeof callback === 'function') {
            callback(new Error('Image load timeout'), null);
        }
    }, LF.slideshow._imageTimeout);

    img.onload = function () {
        if (done) { return; }
        done = true;
        clearTimeout(timer);
        LF.slideshow.preloadedImage = img;
        if (typeof callback === 'function') {
            callback(null, img);
        }
    };

    img.onerror = function () {
        if (done) { return; }
        done = true;
        clearTimeout(timer);
        LF.slideshow.preloadedImage = null;
        if (typeof callback === 'function') {
            callback(new Error('Image load error'), null);
        }
    };

    img.src = url;
};

/**
 * Chuyển ảnh với fade transition 1.5s bằng opacity
 * Sử dụng requestAnimationFrame cho animation mượt
 */
LF.slideshow.changeImage = function () {
    var bgEl = document.getElementById('background-slideshow');
    if (!bgEl) { return; }

    var img = LF.slideshow.preloadedImage;
    if (!img || !img.src) {
        // Không có ảnh preload → preload rồi thử lại
        LF.slideshow.preloadNext(function (err) {
            if (!err) {
                LF.slideshow.changeImage();
            }
        });
        return;
    }

    // Fade out
    bgEl.style.opacity = '0';

    // Sau khi fade out xong (1.5s), đổi ảnh rồi fade in
    setTimeout(function () {
        bgEl.style.backgroundImage = 'url(' + img.src + ')';
        bgEl.style.opacity = '1';
        LF.slideshow.preloadedImage = null;

        // Preload ảnh tiếp theo
        LF.slideshow.preloadNext();
    }, LF.slideshow._fadeDuration);
};

/**
 * Khởi tạo slideshow
 * Thiết lập CSS transition cho background element
 */
LF.slideshow.init = function () {
    var bgEl = document.getElementById('background-slideshow');
    if (bgEl) {
        bgEl.style.transition = 'opacity ' + (LF.slideshow._fadeDuration / 1000) + 's ease';
        bgEl.style.webkitTransition = 'opacity ' + (LF.slideshow._fadeDuration / 1000) + 's ease';
        bgEl.style.opacity = '1';
    }

    // Preload ảnh đầu tiên
    LF.slideshow.preloadNext();
};

/**
 * Bắt đầu slideshow với interval
 * Chỉ chấp nhận interval trong {10000, 15000, 30000, 60000}, mặc định 12000
 *
 * @param {number} [intervalMs] - thời gian giữa các ảnh (ms)
 */
LF.slideshow.start = function (intervalMs) {
    // Dừng nếu đang chạy
    LF.slideshow.stop();

    var interval = LF.slideshow.validateInterval(intervalMs);

    LF.slideshow._running = true;
    LF.slideshow._intervalId = setInterval(function () {
        LF.slideshow.changeImage();
    }, interval);
};

/**
 * Dừng slideshow
 */
LF.slideshow.stop = function () {
    LF.slideshow._running = false;
    if (LF.slideshow._intervalId !== null) {
        clearInterval(LF.slideshow._intervalId);
        LF.slideshow._intervalId = null;
    }
};
