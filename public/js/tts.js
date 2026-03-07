/**
 * tts.js — Module Text-to-Speech cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Engine duy nhất: Edge TTS qua /.netlify/functions/tts-proxy
 * Nếu Edge TTS thất bại → chỉ cuộn tin, không đọc
 *
 * Khi đọc: tạm dừng cuộn tự động, cuộn đồng bộ tới bài đang đọc
 */

var LF = LF || {};

LF.tts = {};

/** Trạng thái */
LF.tts._isReading = false;
LF.tts._currentIndex = 0;
LF.tts._items = [];
LF.tts._scheduleTimer = null;
LF.tts._audio = null;
LF.tts._prefetchedAudio = null;
LF.tts._prefetchIndex = -1;
LF.tts.TTS_PROXY = '/.netlify/functions/tts-proxy';

/**
 * Kiểm tra hỗ trợ Audio element
 */
LF.tts.isAudioSupported = function () {
    try { return typeof Audio !== 'undefined'; } catch (e) { return false; }
};

/**
 * Backward compat — luôn trả false vì đã loại bỏ Web Speech
 */
LF.tts.isSpeechSupported = function () {
    return false;
};

/**
 * Chuẩn hóa văn bản trước khi đọc
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
            var regexPattern = '(^|\\\\s|[(\\\\[\\"\\\'\\u201C\\u2018])(' + key.replace(/\\./g, '\\\\.') + ')(?=\\\\s|$|[.,;:?!)\\\\]\\"\\\'\\u201D\\u2019])';
            var regex = new RegExp(regexPattern, 'g');
            str = str.replace(regex, function (match, p1, p2) { return p1 + val; });
            str = str.replace(regex, function (match, p1, p2) { return p1 + val; });
        }
    }
    return str;
};

/* ================================================================
 * EDGE TTS (Engine duy nhất)
 * ================================================================ */

/**
 * Phát một đoạn text qua Edge TTS proxy
 */
LF.tts._playEdge = function (text, voice, onEnd, onError, idx) {
    if (!text) {
        if (onEnd) { onEnd(); }
        return;
    }

    var audio;
    if (LF.tts._prefetchedAudio && LF.tts._prefetchIndex === idx) {
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

    try { audio.play(); } catch (e) { if (onError) { onError(); } }
};

/**
 * Tải trước audio của bài tiếp theo
 */
LF.tts._prefetchEdge = function (text, voice, idx) {
    if (!text) return;
    var url = LF.tts.TTS_PROXY
        + '?q=' + encodeURIComponent(text)
        + '&voice=' + encodeURIComponent(voice || 'vi-VN-HoaiMyNeural')
        + '&rate=-15%';

    var audio = new Audio();
    audio.preload = "auto";
    audio.src = url;

    LF.tts._prefetchedAudio = audio;
    LF.tts._prefetchIndex = idx;
};

/**
 * Phát text qua Edge TTS — nếu lỗi thì bỏ qua (không fallback)
 */
LF.tts._speakEdgeTTS = function (text, onDone, onError, idx) {
    if (!LF.tts._isReading) {
        if (onDone) { onDone(); }
        return;
    }

    var gender = (LF.settings && LF.settings.current && LF.settings.current.ttsVoiceGender) ? LF.settings.current.ttsVoiceGender : 'female';
    var voice = (gender === 'male') ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';

    LF.tts._playEdge(
        text, voice,
        function () { if (onDone) { onDone(); } },
        function () { if (onError) { onError(); } },
        idx
    );
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

    if (LF.tts._audio) {
        try {
            LF.tts._audio.pause();
            LF.tts._audio.src = '';
        } catch (e) { }
        LF.tts._audio = null;
    }

    LF.tts._updateTTSButton(false);

    // Resume cuộn tự động
    if (LF.news) {
        LF.news._scrollPaused = false;
        LF.news.clearHighlight();
    }
};

/**
 * Đọc một news item qua Edge TTS
 * Nếu Edge TTS lỗi → skip bài này, chuyển bài tiếp (chỉ cuộn)
 */
LF.tts.readNewsItem = function (item, onEnd, idx) {
    if (!item) {
        if (onEnd) { onEnd(); }
        return;
    }

    var parts = [];
    if (item.title) { parts.push(item.title + '.'); }
    if (item.description && item.description !== item.title) {
        parts.push(item.description);
    }
    var fullText = parts.join(' ');
    fullText = LF.tts._normalizeText(fullText);

    // Cuộn tới bài đang đọc
    if (LF.news && LF.news.scrollToItem) {
        LF.news.scrollToItem(idx);
    }

    LF.tts._speakEdgeTTS(
        fullText,
        function () { if (onEnd) { onEnd(); } },
        function () {
            // Edge TTS lỗi → bỏ qua, chuyển bài tiếp (chỉ cuộn, không đọc)
            if (onEnd) { onEnd(); }
        },
        idx
    );
};

/**
 * Đọc lần lượt danh sách tin tức
 */
LF.tts.readNewsList = function (items, startIndex) {
    if (!items || items.length === 0) { return; }

    LF.tts._items = items;
    LF.tts._currentIndex = (typeof startIndex === 'number') ? startIndex : 0;
    LF.tts._isReading = true;

    // Tạm dừng cuộn tự động
    if (LF.news) { LF.news._scrollPaused = true; }

    LF.tts._updateTTSButton(true);
    LF.tts._readNext();
};

/**
 * Đọc tin tiếp theo
 */
LF.tts._readNext = function () {
    if (!LF.tts._isReading) { return; }

    var items = LF.tts._items;
    var idx = LF.tts._currentIndex;

    if (idx >= items.length) {
        LF.tts._isReading = false;
        LF.tts._updateTTSButton(false);
        // Resume cuộn tự động
        if (LF.news) {
            LF.news._scrollPaused = false;
            LF.news.clearHighlight();
        }
        return;
    }

    // Prefetch bài tiếp theo
    if (idx + 1 < items.length) {
        var nextItem = items[idx + 1];
        var nextParts = [];
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
 * Cập nhật nút TTS trên inline widget
 */
LF.tts._updateTTSButton = function (isReading) {
    var speakerSvg = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.1em"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    var stopSvg = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.1em"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';

    var btn = document.getElementById('news-inline-tts-btn');
    if (btn) {
        if (isReading) {
            btn.innerHTML = stopSvg;
            btn.title = 'Dừng đọc';
            if (btn.className.indexOf('tts-speaking') === -1) {
                btn.className = btn.className + ' tts-speaking';
            }
        } else {
            btn.innerHTML = speakerSvg;
            btn.title = 'Đọc tin tức';
            btn.className = btn.className.replace(/\s*tts-speaking/g, '');
        }
    }

    // Backward compat — old button
    var oldBtn = document.getElementById('news-tts-btn');
    if (oldBtn) {
        oldBtn.innerHTML = isReading ? stopSvg : speakerSvg;
    }

    var panelBtn = document.getElementById('news-panel-read-all-btn');
    if (panelBtn) {
        panelBtn.innerHTML = isReading ? (stopSvg + ' Dừng đọc') : (speakerSvg + ' Đọc tất cả');
    }
};

/**
 * Backward compat — teleprompter overlay đã bị loại bỏ
 */
LF.tts._updateTeleprompter = function () { };
LF.tts._closeTeleprompter = function () { };

/* ================================================================
 * MORNING SCHEDULER
 * ================================================================ */

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

LF.tts._triggerMorningRead = function () {
    var items = (LF.news && LF.news._items && LF.news._items.length) ? LF.news._items : null;

    if (!items || items.length === 0) {
        if (LF.news && LF.news.loadMultiSource) { LF.news.loadMultiSource(); }
        setTimeout(function () {
            var loaded = (LF.news && LF.news._items && LF.news._items.length) ? LF.news._items : [];
            if (loaded.length > 0) {
                LF.tts.readNewsList(loaded, 0);
            }
        }, 15000);
        return;
    }

    LF.tts.readNewsList(items, 0);
};

LF.tts.stopSchedule = function () {
    if (LF.tts._scheduleTimer !== null) {
        clearInterval(LF.tts._scheduleTimer);
        LF.tts._scheduleTimer = null;
    }
};

/* ================================================================
 * INIT
 * ================================================================ */

LF.tts.init = function () {
    if (!LF.tts.isAudioSupported()) {
        var ttsBtn = document.getElementById('news-inline-tts-btn');
        if (ttsBtn) { ttsBtn.style.display = 'none'; }
        return;
    }

    // Nút TTS trên inline widget
    var ttsBtn = document.getElementById('news-inline-tts-btn');
    if (ttsBtn) {
        ttsBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (LF.tts._isReading) {
                LF.tts.stop();
            } else {
                var items = (LF.news && LF.news._items) ? LF.news._items : [];
                if (items.length > 0) {
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
