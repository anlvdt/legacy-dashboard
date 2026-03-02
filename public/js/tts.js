/**
 * tts.js — Module Text-to-Speech cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Engine chính: Google Translate TTS (giọng tự nhiên tiếng Việt)
 *   → Proxy qua /.netlify/functions/tts-proxy
 *   → Phát bằng <audio> element (tương thích iOS 7+, Android 4.4+)
 *
 * Fallback: Web Speech API (browser built-in, khi proxy thất bại)
 *
 * Hẹn giờ đọc sáng: setInterval kiểm tra mỗi 30s
 */

var LF = LF || {};

LF.tts = {};

/** Trạng thái */
LF.tts._isReading = false;
LF.tts._currentIndex = 0;
LF.tts._items = [];
LF.tts._scheduleTimer = null;
LF.tts._audio = null;        // <audio> element hiện tại
LF.tts._prefetchedAudio = null; // caching audio tiep theo
LF.tts._prefetchIndex = -1;
LF.tts.TTS_PROXY = '/.netlify/functions/tts-proxy';

/**
 * Kiểm tra hỗ trợ Audio element
 * @returns {boolean}
 */
LF.tts.isAudioSupported = function () {
    try {
        return typeof Audio !== 'undefined';
    } catch (e) {
        return false;
    }
};

/**
 * Kiểm tra hỗ trợ Web Speech API (fallback)
 * @returns {boolean}
 */
LF.tts.isSpeechSupported = function () {
    return typeof window !== 'undefined' &&
        typeof window.speechSynthesis !== 'undefined';
};

/**
 * Chuẩn hóa văn bản trước khi đọc (Dịch từ viết tắt)
 * @param {string} text
 * @returns {string}
 */
LF.tts._normalizeText = function (text) {
    if (!text) return '';
    var str = text;
    var dict = {
        'UBND': 'Ủy ban nhân dân',
        'HĐND': 'Hội đồng nhân dân',
        'TP.HCM': 'Thành phố Hồ Chí Minh',
        'TPHCM': 'Thành phố Hồ Chí Minh',
        'TP HCM': 'Thành phố Hồ Chí Minh',
        'HN': 'Hà Nội',
        'CSGT': 'Cảnh sát giao thông',
        'BĐS': 'Bất động sản',
        'TTXVN': 'Thông tấn xã Việt Nam',
        'GD&ĐT': 'Giáo dục và Đào tạo',
        'GD-ĐT': 'Giáo dục và Đào tạo',
        'KH&CN': 'Khoa học và Công nghệ',
        'BHXH': 'Bảo hiểm xã hội',
        'BHYT': 'Bảo hiểm y tế',
        'NXB': 'Nhà xuất bản',
        'BCH': 'Ban chấp hành',
        'TW': 'Trung ương',
        'BQP': 'Bộ quốc phòng',
        'BCA': 'Bộ công án',
        'BTC': 'Bộ tài chính',
        'BCT': 'Bộ công thương',
        'TAND': 'Tòa án nhân dân',
        'VKSND': 'Viện kiểm sát nhân dân',
        'TANDTC': 'Tòa án nhân dân tối cao',
        'CSĐT': 'Cảnh sát điều tra',
        'GTVT': 'Giao thông vận tải'
    };

    for (var key in dict) {
        if (dict.hasOwnProperty(key)) {
            var val = dict[key];
            // Thay thế chính xác từ, chấp nhận dấu câu phía sau bằng lookahead
            var regexPattern = '(^|\\\\s|[(\\\\[\\"\\\'\\u201C\\u2018])(' + key.replace(/\\./g, '\\\\.') + ')(?=\\\\s|$|[.,;:?!)\\\\]\\"\\\'\\u201D\\u2019])';
            var regex = new RegExp(regexPattern, 'g');
            str = str.replace(regex, function (match, p1, p2) {
                return p1 + val;
            });
            // Chạy 2 lần để giải quyết trường hợp các từ viết tắt đứng sát nhau
            str = str.replace(regex, function (match, p1, p2) {
                return p1 + val;
            });
        }
    }
    return str;
};

/* ================================================================
 * EDGE TTS (Engine chính)
 * ================================================================ */

/**
 * Phát một đoạn text qua Edge TTS proxy
 * @param {string} text
 * @param {string} voice - Tên giọng (ví dụ vi-VN-HoaiMyNeural)
 * @param {function} onEnd - callback khi xong
 * @param {function} onError - callback khi lỗi
 * @param {number} idx - index đang đọc để kiểm tra prefetch
 */
LF.tts._playEdge = function (text, voice, onEnd, onError, idx) {
    if (!text) {
        if (onEnd) { onEnd(); }
        return;
    }

    var audio;
    if (LF.tts._prefetchedAudio && LF.tts._prefetchIndex === idx) {
        // Tận dụng bài đã tải trước
        audio = LF.tts._prefetchedAudio;
        LF.tts._prefetchedAudio = null;
        LF.tts._prefetchIndex = -1;
    } else {
        var url = LF.tts.TTS_PROXY
            + '?q=' + encodeURIComponent(text)
            + '&voice=' + encodeURIComponent(voice || 'vi-VN-HoaiMyNeural')
            + '&rate=-15%';
        audio = new Audio(url);
    }

    LF.tts._audio = audio;

    audio.onended = function () {
        LF.tts._audio = null;
        if (onEnd) { onEnd(); }
    };

    audio.onerror = function () {
        LF.tts._audio = null;
        if (onError) { onError(); }
    };

    try {
        audio.play();
    } catch (e) {
        if (onError) { onError(); }
    }
};

/**
 * Tải trước (Prefetch) audio của bài tiếp theo
 */
LF.tts._prefetchEdge = function (text, voice, idx) {
    if (!text) return;
    var url = LF.tts.TTS_PROXY
        + '?q=' + encodeURIComponent(text)
        + '&voice=' + encodeURIComponent(voice || 'vi-VN-HoaiMyNeural')
        + '&rate=-15%';

    var audio = new Audio();
    audio.preload = "auto";
    audio.src = url; // Quá trình tải mạng bắt đầu âm thầm

    LF.tts._prefetchedAudio = audio;
    LF.tts._prefetchIndex = idx;
};

/**
 * Phát text toàn bộ qua Edge TTS
 * @param {string} text
 * @param {function} onDone - callback khi đọc hết
 * @param {function} onError - callback khi lỗi (fallback sang Web Speech)
 * @param {number} idx - index để map cache
 */
LF.tts._speakEdgeTTS = function (text, onDone, onError, idx) {
    if (!LF.tts._isReading) {
        if (onDone) { onDone(); }
        return;
    }

    var gender = (LF.settings && LF.settings.current && LF.settings.current.ttsVoiceGender) ? LF.settings.current.ttsVoiceGender : 'female';
    var voice = (gender === 'male') ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';

    LF.tts._playEdge(
        text,
        voice,
        function () { if (onDone) { onDone(); } },
        function () { if (onError) { onError(); } },
        idx
    );
};

/* ================================================================
 * WEB SPEECH API (Fallback)
 * ================================================================ */

/**
 * Tìm giọng tiếng Việt tốt nhất via Web Speech API
 * Ưu tiên: vi-VN Neural Edge → vi-VN → en-US
 * @param {string} gender - 'male' hoặc 'female'
 * @returns {SpeechSynthesisVoice|null}
 */
LF.tts._findVoice = function (gender) {
    if (!LF.tts.isSpeechSupported()) { return null; }
    var voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) { return null; }

    var neuralName = (gender === 'male') ? 'NamMinh' : 'HoaiMy';
    var i, v;

    for (i = 0; i < voices.length; i++) {
        v = voices[i];
        if (v.name && v.name.indexOf(neuralName) !== -1) { return v; }
    }
    for (i = 0; i < voices.length; i++) {
        v = voices[i];
        if (v.lang && (v.lang === 'vi-VN' || v.lang === 'vi')) { return v; }
    }
    for (i = 0; i < voices.length; i++) {
        v = voices[i];
        if (v.lang && v.lang.indexOf('en') === 0) { return v; }
    }
    return voices[0] || null;
};

/**
 * Phát text qua Web Speech API (fallback)
 * @param {string} text
 * @param {function} onEnd
 */
LF.tts._speakFallback = function (text, onEnd) {
    if (!LF.tts.isSpeechSupported() || !text) {
        if (onEnd) { onEnd(); }
        return;
    }

    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    var gender = (LF.settings && LF.settings.current) ? LF.settings.current.ttsVoiceGender : 'female';
    var voice = LF.tts._findVoice(gender);
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
    } else {
        utterance.lang = 'vi-VN';
    }
    utterance.rate = 0.9;
    utterance.onend = function () { if (onEnd) { onEnd(); } };
    utterance.onerror = function () { if (onEnd) { onEnd(); } };
    window.speechSynthesis.speak(utterance);
};

/* ================================================================
 * PUBLIC API
 * ================================================================ */

/**
 * Dừng đọc ngay lập tức
 */
LF.tts.stop = function () {
    LF.tts._isReading = false;
    LF.tts._currentIndex = 0;

    // Dừng audio element
    if (LF.tts._audio) {
        try {
            LF.tts._audio.pause();
            LF.tts._audio.src = '';
        } catch (e) { }
        LF.tts._audio = null;
    }

    // Dừng Web Speech API
    if (LF.tts.isSpeechSupported()) {
        try { window.speechSynthesis.cancel(); } catch (e) { }
    }

    LF.tts._updateTTSButton(false);
    LF.tts._clearHighlight();
};

/**
 * Đọc một news item (tiêu đề + mô tả đầy đủ) qua Google TTS
 * @param {object} item - {title, description, source}
 * @param {function} onEnd
 * @param {number} idx - index đang đọc
 */
LF.tts.readNewsItem = function (item, onEnd, idx) {
    if (!item) {
        if (onEnd) { onEnd(); }
        return;
    }

    // Ghép text: tiêu đề, mô tả (Bỏ qua tên nguồn)
    var parts = [];
    if (item.title) { parts.push(item.title + '.'); }
    if (item.description && item.description !== item.title) {
        parts.push(item.description);
    }
    var fullText = parts.join(' ');

    // Normalization: Nới rộng chữ viết tắt
    fullText = LF.tts._normalizeText(fullText);

    // Thử Edge TTS trước, fallback sang Web Speech nếu lỗi
    LF.tts._speakEdgeTTS(
        fullText,
        function () { if (onEnd) { onEnd(); } },
        function () {
            // Edge TTS thất bại → dùng Web Speech API
            LF.tts._speakFallback(fullText, function () {
                if (onEnd) { onEnd(); }
            });
        },
        idx
    );
};

/**
 * Đọc lần lượt danh sách tin tức
 * @param {Array} items
 * @param {number} [startIndex]
 */
LF.tts.readNewsList = function (items, startIndex) {
    if (!items || items.length === 0) { return; }

    LF.tts._items = items;
    LF.tts._currentIndex = (typeof startIndex === 'number') ? startIndex : 0;
    LF.tts._isReading = true;

    LF.tts._updateTTSButton(true);
    LF.tts._readNext();
};

/**
 * Đọc tin tiếp theo (đệ quy qua callback)
 */
LF.tts._readNext = function () {
    if (!LF.tts._isReading) { return; }

    var items = LF.tts._items;
    var idx = LF.tts._currentIndex;

    if (idx >= items.length) {
        LF.tts._isReading = false;
        LF.tts._updateTTSButton(false);
        LF.tts._clearHighlight();
        return;
    }

    LF.tts._highlightPanelItem(idx);

    // Bắt đầu prefetch (tải trước) audio của bài tiếp theo
    if (idx + 1 < items.length) {
        var nextItem = items[idx + 1];
        var nextParts = [];
        // Bỏ qua tên nguồn giống như readNewsItem
        if (nextItem.title) { nextParts.push(nextItem.title + '.'); }
        if (nextItem.description && nextItem.description !== nextItem.title) {
            nextParts.push(nextItem.description);
        }
        var nextText = LF.tts._normalizeText(nextParts.join(' '));
        var gender = (LF.settings && LF.settings.current && LF.settings.current.ttsVoiceGender) ? LF.settings.current.ttsVoiceGender : 'female';
        var voice = (gender === 'male') ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';
        LF.tts._prefetchEdge(nextText, voice, idx + 1);
    }

    LF.tts.readNewsItem(items[idx], function () {
        if (!LF.tts._isReading) { return; }
        LF.tts._currentIndex++;
        LF.tts._readNext();
    }, idx);
};

/* ================================================================
 * UI HELPERS
 * ================================================================ */

/**
 * Cập nhật nút TTS trên ticker
 */
LF.tts._updateTTSButton = function (isReading) {
    var btn = document.getElementById('news-tts-btn');
    if (btn) {
        if (isReading) {
            btn.textContent = '\u23f9';
            btn.title = 'D\u1eebng \u0111\u1ecdc';
            if (btn.className.indexOf('tts-speaking') === -1) {
                btn.className = btn.className + ' tts-speaking';
            }
        } else {
            btn.textContent = '\ud83d\udd0a';
            btn.title = '\u0110\u1ecdc tin t\u1ee9c';
            btn.className = btn.className.replace(/\s*tts-speaking/g, '');
        }
    }

    var panelBtn = document.getElementById('news-panel-read-all-btn');
    if (panelBtn) {
        panelBtn.textContent = isReading ? '\u23f9 D\u1eebng \u0111\u1ecdc' : '\ud83d\udd0a \u0110\u1ecdc t\u1ea5t c\u1ea3';
    }
};

/**
 * Highlight item đang đọc trong panel
 */
LF.tts._highlightPanelItem = function (idx) {
    var list = document.getElementById('news-panel-list');
    if (!list) { return; }
    var items = list.getElementsByClassName('news-panel-item');
    var i;
    for (i = 0; i < items.length; i++) {
        items[i].className = items[i].className.replace(/\s*tts-active/g, '');
    }
    if (items[idx]) {
        items[idx].className = items[idx].className + ' tts-active';
        if (items[idx].scrollIntoView) {
            try { items[idx].scrollIntoView({ block: 'nearest' }); } catch (e) { }
        }
    }
};

/**
 * Xoá tất cả highlight
 */
LF.tts._clearHighlight = function () {
    var list = document.getElementById('news-panel-list');
    if (!list) { return; }
    var items = list.getElementsByClassName('news-panel-item');
    var i;
    for (i = 0; i < items.length; i++) {
        items[i].className = items[i].className.replace(/\s*tts-active/g, '');
    }
};

/* ================================================================
 * MORNING SCHEDULER — Hẹn giờ đọc tin mỗi sáng
 * ================================================================ */

/**
 * Đặt lịch đọc vào giờ cụ thể mỗi ngày
 * @param {string} timeStr - format "HH:MM"
 */
LF.tts.scheduleDaily = function (timeStr) {
    LF.tts.stopSchedule();
    if (!timeStr || timeStr.indexOf(':') === -1) { return; }

    var parts = timeStr.split(':');
    var targetHour = parseInt(parts[0], 10);
    var targetMin = parseInt(parts[1], 10);
    if (isNaN(targetHour) || isNaN(targetMin)) { return; }

    var lastFiredDate = '';

    LF.tts._scheduleTimer = setInterval(function () {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var dateKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

        if (h === targetHour && m === targetMin && dateKey !== lastFiredDate) {
            lastFiredDate = dateKey;
            LF.tts._triggerMorningRead();
        }
    }, 30000);
};

/**
 * Kích hoạt đọc tin buổi sáng
 */
LF.tts._triggerMorningRead = function () {
    var items = (LF.news && LF.news._items && LF.news._items.length) ? LF.news._items : null;

    if (!items || items.length === 0) {
        // Tải tin mới nếu chưa có, chờ 15s rồi đọc
        if (LF.news && LF.news.loadMultiSource) {
            LF.news.loadMultiSource();
        }
        setTimeout(function () {
            var loaded = (LF.news && LF.news._items && LF.news._items.length) ? LF.news._items : [];
            if (loaded.length > 0) {
                if (LF.news && LF.news.openPanel) { LF.news.openPanel(); }
                LF.tts.readNewsList(loaded, 0);
            }
        }, 15000);
        return;
    }

    if (LF.news && LF.news.openPanel) { LF.news.openPanel(); }
    LF.tts.readNewsList(items, 0);
};

/**
 * Huỷ lịch đọc
 */
LF.tts.stopSchedule = function () {
    if (LF.tts._scheduleTimer !== null) {
        clearInterval(LF.tts._scheduleTimer);
        LF.tts._scheduleTimer = null;
    }
};

/* ================================================================
 * INIT
 * ================================================================ */

/**
 * Khởi tạo module TTS
 */
LF.tts.init = function () {
    // Kiểm tra tối thiểu hỗ trợ Audio
    var supported = LF.tts.isAudioSupported() || LF.tts.isSpeechSupported();
    if (!supported) {
        var ttsBtn = document.getElementById('news-tts-btn');
        if (ttsBtn) { ttsBtn.style.display = 'none'; }
        return;
    }

    // Preload Web Speech voices nếu có
    if (LF.tts.isSpeechSupported() && window.speechSynthesis.getVoices) {
        window.speechSynthesis.getVoices();
    }

    // Nút 🔊 trên ticker
    var ttsBtn = document.getElementById('news-tts-btn');
    if (ttsBtn) {
        ttsBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (LF.tts._isReading) {
                LF.tts.stop();
            } else {
                var items = (LF.news && LF.news._items) ? LF.news._items : [];
                if (items.length > 0) {
                    if (LF.news && LF.news.openPanel) { LF.news.openPanel(); }
                    LF.tts.readNewsList(items, 0);
                }
            }
        });
    }

    // Bật lịch hẹn giờ nếu đã cấu hình
    var current = (LF.settings && LF.settings.current) ? LF.settings.current : {};
    if (current.ttsScheduleEnabled && current.ttsScheduleTime) {
        LF.tts.scheduleDaily(current.ttsScheduleTime);
    }
};
