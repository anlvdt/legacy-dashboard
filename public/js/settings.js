/**
 * settings.js — Module cài đặt cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.5
 */

var LF = LF || {};

LF.settings = {};

/** Giá trị mặc định cho tất cả cài đặt */
LF.settings.defaults = {
    // Hiển thị
    powerSaveMode: false,
    clockOnlyMode: false,
    clockOnlyShowGregorian: false,
    clockOnlyShowLunar: false,
    clockOnlyShowWeather: false,
    secondsVisible: false,
    // Thành phần ẩn/hiện
    slideshowHidden: false,
    dateHidden: false,
    calendarHidden: false,
    weatherHidden: false,
    quoteHidden: false,
    aqiHidden: true,
    showFinanceWidget: true,
    showDisasterAlerts: false,
    showNewsTicker: true,
    showAgriWidget: true,
    // Radio cải lương
    showRadio: false,
    // Nguồn ảnh
    useOnlinePhotos: false,
    slideshowInterval: 12000,
    // Tin tức
    newsSourceIndex: 0,
    newsMultiSource: true,
    // TTS — Đọc tin bằng giọng nói
    enableTTS: false,
    ttsVoiceGender: 'female',
    ttsScheduleEnabled: false,
    ttsScheduleTime: '07:00'
};

/** Cài đặt hiện tại */
LF.settings.current = {};

/** Key lưu trong localStorage */
LF.settings._storageKey = 'lf_settings';

/** Thời gian animation mở panel (ms) */
LF.settings._animationDuration = 250;

/**
 * Nhóm cài đặt thành sections cho UI
 * Mỗi section có tiêu đề và danh sách setting keys
 */
LF.settings.sections = [
    {
        title: 'Hiển thị',
        items: ['powerSaveMode', 'clockOnlyMode', 'clockOnlyShowGregorian', 'clockOnlyShowLunar', 'clockOnlyShowWeather', 'secondsVisible']
    },
    {
        title: 'Thành phần',
        items: ['slideshowHidden', 'dateHidden', 'calendarHidden', 'weatherHidden', 'quoteHidden', 'aqiHidden', 'showFinanceWidget', 'showDisasterAlerts', 'showNewsTicker', 'showAgriWidget', 'showRadio']
    },
    {
        title: 'Nguồn ảnh',
        items: ['useOnlinePhotos', 'slideshowInterval']
    },
    {
        title: 'Tin tức & Cảnh báo',
        items: ['newsSourceIndex', 'newsMultiSource', 'enableTTS', 'ttsVoiceGender', 'ttsScheduleEnabled']
    },
    {
        title: 'Hướng dẫn',
        items: []
    }
];

/**
 * Bản đồ label tiếng Việt cho từng setting key
 * Dùng cho getButtonText()
 */
LF.settings.labels = {
    powerSaveMode: 'tiết kiệm điện',
    clockOnlyMode: 'chế độ nhìn xa',
    clockOnlyShowGregorian: 'ngày dương lịch (nhìn xa)',
    clockOnlyShowLunar: 'ngày âm lịch (nhìn xa)',
    clockOnlyShowWeather: 'thời tiết (nhìn xa)',
    secondsVisible: 'đồng hồ giây',
    slideshowHidden: 'ảnh nền',
    dateHidden: 'ngày tháng',
    calendarHidden: 'lịch',
    weatherHidden: 'thời tiết',
    quoteHidden: 'ca dao',
    aqiHidden: 'chất lượng không khí',
    showFinanceWidget: 'tài chính',
    showDisasterAlerts: 'cảnh báo thiên tai',
    showNewsTicker: 'tin tức',
    showAgriWidget: 'nông sản',
    showRadio: 'radio cải lương',
    useOnlinePhotos: 'ảnh trực tuyến',
    newsMultiSource: 'đa nguồn tin',
    enableTTS: 'đọc tin bằng giọng nói',
    ttsScheduleEnabled: 'hẹn giờ đọc tin sáng'
};

/**
 * Kiểm tra localStorage khả dụng
 * @returns {boolean}
 */
LF.settings.isStorageAvailable = function () {
    try {
        var testKey = '__lf_storage_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Tải settings từ localStorage
 * Trả về defaults nếu localStorage không khả dụng hoặc dữ liệu lỗi
 * @returns {object} settings object
 */
LF.settings.load = function () {
    var saved;
    var parsed;
    var key;
    var result = {};

    // Copy defaults
    for (key in LF.settings.defaults) {
        if (LF.settings.defaults.hasOwnProperty(key)) {
            result[key] = LF.settings.defaults[key];
        }
    }

    if (!LF.settings.isStorageAvailable()) {
        LF.settings.current = result;
        return result;
    }

    try {
        saved = localStorage.getItem(LF.settings._storageKey);
        if (saved !== null) {
            parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                // Merge saved values over defaults (chỉ key hợp lệ)
                for (key in LF.settings.defaults) {
                    if (LF.settings.defaults.hasOwnProperty(key) && parsed.hasOwnProperty(key)) {
                        result[key] = parsed[key];
                    }
                }
            }
        }
    } catch (e) {
        // JSON parse lỗi hoặc localStorage lỗi — dùng defaults
    }

    LF.settings.current = result;
    return result;
};

/**
 * Lưu settings vào localStorage (< 100ms)
 * Hiển thị thông báo nếu localStorage không khả dụng
 * @returns {boolean} true nếu lưu thành công
 */
LF.settings.save = function () {
    if (!LF.settings.isStorageAvailable()) {
        LF.settings._showStorageWarning();
        return false;
    }

    try {
        localStorage.setItem(
            LF.settings._storageKey,
            JSON.stringify(LF.settings.current)
        );
        return true;
    } catch (e) {
        LF.settings._showStorageWarning();
        return false;
    }
};

/**
 * Hiển thị thông báo khi localStorage không khả dụng
 */
LF.settings._showStorageWarning = function () {
    var el = document.getElementById('storage-warning');
    if (el) {
        el.textContent = 'Cài đặt sẽ không được lưu trong chế độ duyệt riêng tư';
        el.style.display = 'block';
    }
};

/**
 * Áp dụng settings hiện tại lên DOM
 * Cập nhật visibility của các widget và trạng thái nút
 */
LF.settings.apply = function () {
    var current = LF.settings.current;
    var body = document.body;

    if (!body) { return; }

    // Chế độ tiết kiệm điện
    if (current.powerSaveMode) {
        body.className = (body.className.indexOf('power-save-mode') === -1)
            ? body.className + ' power-save-mode'
            : body.className;
    } else {
        body.className = body.className.replace(/\s*power-save-mode/g, '');
    }

    // Chế độ nhìn xa — thêm vào container, không phải body
    var mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        if (current.clockOnlyMode) {
            if (mainContainer.className.indexOf('clock-only-mode') === -1) {
                mainContainer.className = mainContainer.className + ' clock-only-mode';
            }
        } else {
            mainContainer.className = mainContainer.className.replace(/\s*clock-only-mode/g, '');
        }
    }

    // Ẩn/hiện các widget (thông thường)
    LF.settings._setVisibility('slideshow-container', !current.slideshowHidden);
    LF.settings._setVisibility('date-display', !current.dateHidden);
    LF.settings._setVisibility('calendar-widget', !current.calendarHidden);
    LF.settings._setVisibility('weather-widget', !current.weatherHidden);
    LF.settings._setVisibility('quote-widget', !current.quoteHidden);
    LF.settings._setVisibility('aqi-widget', !current.aqiHidden);
    LF.settings._setVisibility('finance-widget', current.showFinanceWidget);
    LF.settings._setVisibility('disaster-banner', current.showDisasterAlerts);
    LF.settings._setVisibility('news-ticker', current.showNewsTicker);
    LF.settings._setVisibility('news-widget', current.showNewsTicker);
    LF.settings._setVisibility('agriculture-widget', current.showAgriWidget);
    LF.settings._setVisibility('radio-bar', current.showRadio);

    // Flags trên container cho layout 3-row mới
    if (mainContainer) {
        if (current.quoteHidden) {
            if (mainContainer.className.indexOf('quote-hidden') === -1) mainContainer.className += ' quote-hidden';
        } else {
            mainContainer.className = mainContainer.className.replace(/\s*quote-hidden/g, '');
        }

        if (current.aqiHidden) {
            if (mainContainer.className.indexOf('aqi-hidden') === -1) mainContainer.className += ' aqi-hidden';
        } else {
            mainContainer.className = mainContainer.className.replace(/\s*aqi-hidden/g, '');
        }
    }

    // Đồng hồ giây — dùng toggleSeconds để cập nhật CSS
    if (LF.clock && LF.clock.toggleSeconds) {
        LF.clock.toggleSeconds(!!current.secondsVisible);
    }

    // TTS button visibility
    var ttsBtnOld = document.getElementById('news-tts-btn');
    var ttsBtnInline = document.getElementById('news-inline-tts-btn');
    if (ttsBtnOld) {
        ttsBtnOld.style.display = current.enableTTS ? '' : 'none';
    }
    if (ttsBtnInline) {
        ttsBtnInline.style.display = current.enableTTS ? '' : 'none';
    }

    // Slideshow: bật/tắt theo useOnlinePhotos
    if (current.useOnlinePhotos && !current.slideshowHidden && !current.powerSaveMode) {
        if (LF.slideshow && LF.slideshow.start && !LF.slideshow._running) {
            LF.slideshow.start(current.slideshowInterval || 12000);
        }
    } else if (!current.useOnlinePhotos) {
        if (LF.slideshow && LF.slideshow.stop) {
            LF.slideshow.stop();
        }
    }

    // Cập nhật text nút trong panel
    LF.settings._updateButtonTexts();
};

/**
 * Ẩn/hiện phần tử DOM theo ID
 * @param {string} elementId
 * @param {boolean} visible
 */
LF.settings._setVisibility = function (elementId, visible) {
    var el = document.getElementById(elementId);
    if (!el) { return; }
    if (visible) {
        el.style.display = '';
        el.className = el.className.replace(/\s*hidden-force/g, '');
    } else {
        el.className = (el.className.indexOf('hidden-force') === -1)
            ? el.className + ' hidden-force'
            : el.className;
    }
};

/**
 * Lấy text nút phản ánh trạng thái cài đặt
 * Khi setting đang bật → text cho phép tắt ("Tắt ..." / "Ẩn ...")
 * Khi setting đang tắt → text cho phép bật ("Bật ..." / "Hiện ...")
 *
 * Các key "...Hidden" dùng "Ẩn"/"Hiện" (vì true = đang ẩn)
 * Các key "show..." dùng "Tắt"/"Bật" (vì true = đang hiện)
 * Các key khác dùng "Tắt"/"Bật"
 *
 * @param {string} settingKey
 * @param {boolean} currentValue
 * @returns {string} text tiếng Việt cho nút
 */
LF.settings.getButtonText = function (settingKey, currentValue) {
    var label = LF.settings.labels[settingKey] || settingKey;

    // Các key kết thúc bằng "Hidden" có logic đảo:
    // currentValue = true nghĩa là đang ẩn → nút cho phép "Hiện"
    // currentValue = false nghĩa là đang hiện → nút cho phép "Ẩn"
    if (settingKey.indexOf('Hidden') !== -1) {
        if (currentValue) {
            return 'Hiện ' + label;
        }
        return 'Ẩn ' + label;
    }

    // Các key "show..." hoặc boolean thông thường:
    // currentValue = true nghĩa là đang bật → nút cho phép "Tắt"
    // currentValue = false nghĩa là đang tắt → nút cho phép "Bật"
    if (currentValue) {
        return 'Tắt ' + label;
    }
    return 'Bật ' + label;
};

/**
 * Cập nhật text tất cả nút trong panel cài đặt
 */
LF.settings._updateButtonTexts = function () {
    var key;
    var btn;
    var current = LF.settings.current;

    for (key in LF.settings.defaults) {
        if (!LF.settings.defaults.hasOwnProperty(key)) { continue; }
        if (typeof current[key] !== 'boolean') { continue; }

        btn = document.getElementById('btn-' + key);
        if (btn) {
            btn.textContent = LF.settings.getButtonText(key, current[key]);
        }
    }
};

/**
 * Đặt lại cài đặt về mặc định (có dialog xác nhận)
 * @returns {boolean} true nếu đã reset
 */
LF.settings.reset = function () {
    var confirmed = false;
    var key;

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm('Bạn có chắc muốn đặt lại tất cả cài đặt về mặc định?');
    }

    if (!confirmed) {
        return false;
    }

    // Copy defaults vào current
    for (key in LF.settings.defaults) {
        if (LF.settings.defaults.hasOwnProperty(key)) {
            LF.settings.current[key] = LF.settings.defaults[key];
        }
    }

    LF.settings.save();
    LF.settings.apply();
    return true;
};

/**
 * Xuất settings thành chuỗi base64
 * @param {object} [settingsObj] - settings để xuất (mặc định dùng current)
 * @returns {string} chuỗi base64
 */
LF.settings.exportSettings = function (settingsObj) {
    var obj = settingsObj || LF.settings.current;
    var json = JSON.stringify(obj);
    // Dùng btoa cho base64 encode (ES5 compatible)
    try {
        return btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
        return '';
    }
};

/**
 * Nhập settings từ chuỗi base64
 * @param {string} base64String
 * @returns {object|null} settings object hoặc null nếu lỗi
 */
LF.settings.importSettings = function (base64String) {
    var json;
    var parsed;
    var key;
    var result = {};

    if (typeof base64String !== 'string' || base64String.length === 0) {
        return null;
    }

    try {
        json = decodeURIComponent(escape(atob(base64String)));
        parsed = JSON.parse(json);
    } catch (e) {
        return null;
    }

    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    // Validate và copy — chỉ lấy key hợp lệ từ defaults
    for (key in LF.settings.defaults) {
        if (LF.settings.defaults.hasOwnProperty(key)) {
            if (parsed.hasOwnProperty(key)) {
                result[key] = parsed[key];
            } else {
                result[key] = LF.settings.defaults[key];
            }
        }
    }

    return result;
};

/**
 * Thay đổi một setting và lưu ngay (< 100ms)
 * @param {string} key
 * @param {*} value
 */
LF.settings.set = function (key, value) {
    if (!LF.settings.defaults.hasOwnProperty(key)) { return; }
    LF.settings.current[key] = value;
    LF.settings.save();
    LF.settings.apply();
};

/**
 * Toggle một boolean setting
 * @param {string} key
 */
LF.settings.toggle = function (key) {
    if (!LF.settings.defaults.hasOwnProperty(key)) { return; }
    if (typeof LF.settings.current[key] === 'boolean') {
        LF.settings.set(key, !LF.settings.current[key]);
    }
};

/**
 * Mở panel cài đặt với animation opacity + translateY trong 250ms
 */
LF.settings.openPanel = function () {
    var panel = document.getElementById('settings-panel');
    if (!panel) { return; }

    if (panel.className.indexOf('show') === -1) {
        panel.className = panel.className + ' show';
    }
};

/**
 * Đóng panel cài đặt
 */
LF.settings.closePanel = function () {
    var panel = document.getElementById('settings-panel');
    if (!panel) { return; }

    panel.className = panel.className.replace(/\s*show/g, '');
};

/**
 * Toggle panel cài đặt
 */
LF.settings.togglePanel = function () {
    var panel = document.getElementById('settings-panel');
    if (!panel) { return; }

    if (panel.className.indexOf('show') !== -1) {
        LF.settings.closePanel();
    } else {
        LF.settings.openPanel();
    }
};

/**
 * Bind tất cả event listeners cho settings panel
 * Gọi sau khi DOM sẵn sàng
 */
LF.settings.bindEvents = function () {
    var toggleBtn = document.getElementById('settings-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            LF.settings.togglePanel();
        });
    }

    // Bind toggle buttons cho boolean settings
    var key;
    for (key in LF.settings.defaults) {
        if (!LF.settings.defaults.hasOwnProperty(key)) { continue; }
        if (typeof LF.settings.defaults[key] === 'boolean') {
            (function (k) {
                var btn = document.getElementById('btn-' + k);
                if (btn) {
                    btn.addEventListener('click', function () {
                        LF.settings.toggle(k);
                        // Áp dụng chế độ đặc biệt nếu cần
                        if (k === 'clockOnlyMode' && LF.app && LF.app.applyClockOnlyMode) {
                            LF.app.applyClockOnlyMode();
                        }
                        if ((k === 'clockOnlyShowGregorian' || k === 'clockOnlyShowLunar' || k === 'clockOnlyShowWeather') && LF.app && LF.app.applyClockOnlyMode) {
                            LF.app.applyClockOnlyMode();
                        }
                        if (k === 'powerSaveMode' && LF.app && LF.app.applyPowerSaveMode) {
                            LF.app.applyPowerSaveMode();
                        }
                        if (k === 'showDisasterAlerts' && LF.settings.current.showDisasterAlerts && LF.disaster && LF.disaster.init) {
                            LF.disaster.init();
                        }
                        if ((k === 'showNewsTicker' || k === 'newsMultiSource') && LF.news && LF.news.loadMultiSource) {
                            LF.news.loadMultiSource();
                        }
                        if (k === 'showRadio') {
                            if (LF.settings.current.showRadio && LF.radio && LF.radio.init) {
                                LF.radio.init();
                            } else if (!LF.settings.current.showRadio && LF.radio && LF.radio.stop) {
                                LF.radio.stop();
                            }
                        }
                    });
                }
            })(key);
        }
    }

    // Slideshow interval button
    var intervalBtn = document.getElementById('btn-slideshowInterval');
    if (intervalBtn) {
        intervalBtn.addEventListener('click', function () {
            var intervals = [12000, 10000, 15000, 30000, 60000];
            var current = LF.settings.current.slideshowInterval || 12000;
            var idx = -1;
            for (var i = 0; i < intervals.length; i++) {
                if (intervals[i] === current) { idx = i; break; }
            }
            var next = intervals[(idx + 1) % intervals.length];
            LF.settings.set('slideshowInterval', next);
            intervalBtn.textContent = 'Thời gian chuyển ảnh: ' + (next / 1000) + 's';
        });
    }

    // TTS voice gender button (cycle female ↔ male)
    var ttsGenderBtn = document.getElementById('btn-ttsVoiceGender');
    if (ttsGenderBtn) {
        ttsGenderBtn.addEventListener('click', function () {
            var cur = LF.settings.current.ttsVoiceGender || 'female';
            var next = (cur === 'female') ? 'male' : 'female';
            LF.settings.current.ttsVoiceGender = next;
            LF.settings.save();
            ttsGenderBtn.textContent = (next === 'female') ? 'Giọng: Nữ (HoaiMy)' : 'Giọng: Nam (NamMinh)';
        });
    }

    // TTS schedule time input
    var ttsTimeInput = document.getElementById('tts-schedule-time');
    if (ttsTimeInput) {
        ttsTimeInput.addEventListener('change', function () {
            LF.settings.current.ttsScheduleTime = ttsTimeInput.value || '07:00';
            LF.settings.save();
            if (LF.tts && LF.settings.current.ttsScheduleEnabled && LF.tts.scheduleDaily) {
                LF.tts.scheduleDaily(LF.settings.current.ttsScheduleTime);
            }
        });
    }

    // Khi bật enableTTS → hiện/ẩn nút TTS, dừng nếu tắt
    var enableTTSBtn = document.getElementById('btn-enableTTS');
    if (enableTTSBtn) {
        enableTTSBtn.addEventListener('click', function () {
            var ttsBtn = document.getElementById('news-tts-btn');
            var inlineTtsBtn = document.getElementById('news-inline-tts-btn');
            if (ttsBtn) {
                ttsBtn.style.display = LF.settings.current.enableTTS ? '' : 'none';
            }
            if (inlineTtsBtn) {
                inlineTtsBtn.style.display = LF.settings.current.enableTTS ? '' : 'none';
            }
            if (!LF.settings.current.enableTTS && LF.tts && LF.tts.stop) {
                LF.tts.stop();
            }
        });
    }

    // Khi bật ttsScheduleEnabled → bật/tắt lịch hẹn
    var scheduleToggleBtn = document.getElementById('btn-ttsScheduleEnabled');
    if (scheduleToggleBtn) {
        scheduleToggleBtn.addEventListener('click', function () {
            if (LF.tts) {
                if (LF.settings.current.ttsScheduleEnabled && LF.tts.scheduleDaily) {
                    LF.tts.scheduleDaily(LF.settings.current.ttsScheduleTime || '07:00');
                } else if (LF.tts.stopSchedule) {
                    LF.tts.stopSchedule();
                }
            }
        });
    }

    // Reset button
    var resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            LF.settings.reset();
        });
    }

    // Export button
    var exportBtn = document.getElementById('export-settings-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            var data = LF.settings.exportSettings();
            if (data) {
                try { prompt('Sao chép chuỗi cài đặt:', data); } catch (e) { }
            }
        });
    }

    // Import button
    var importBtn = document.getElementById('import-settings-btn');
    if (importBtn) {
        importBtn.addEventListener('click', function () {
            var input = prompt('Dán chuỗi cài đặt:');
            if (input) {
                var result = LF.settings.importSettings(input);
                if (result) {
                    LF.settings.current = result;
                    LF.settings.save();
                    LF.settings.apply();
                }
            }
        });
    }

    // Fullscreen button
    var fsBtn = document.getElementById('fullscreen-toggle');
    if (fsBtn) {
        fsBtn.addEventListener('click', function () {
            try {
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen();
                    } else if (document.documentElement.webkitRequestFullscreen) {
                        document.documentElement.webkitRequestFullscreen();
                    }
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                }
            } catch (e) { }
        });
    }

    // Refresh photos button — tải ảnh mới ngay lập tức
    var refreshPhotosBtn = document.getElementById('refresh-photos-btn');
    if (refreshPhotosBtn) {
        refreshPhotosBtn.addEventListener('click', function () {
            if (LF.slideshow && LF.slideshow.changeImage) {
                LF.slideshow.changeImage();
            }
        });
    }

    // News source button — đổi nguồn tin (cycle qua danh sách, chỉ có tác dụng khi tắt đa nguồn)
    var newsSourceBtn = document.getElementById('news-source-btn');
    if (newsSourceBtn) {
        newsSourceBtn.addEventListener('click', function () {
            if (!LF.news || !LF.news.sources) { return; }
            var total = LF.news.sources.length;
            if (total === 0) { return; }
            var idx = (LF.settings.current.newsSourceIndex || 0) + 1;
            if (idx >= total) { idx = 0; }
            LF.settings.current.newsSourceIndex = idx;
            LF.settings.save();
            newsSourceBtn.textContent = 'Nguồn: ' + LF.news.sources[idx].name;
            // Reload tin nếu đang ở chế độ đơn nguồn
            if (!LF.settings.current.newsMultiSource && LF.news.loadMultiSource) {
                LF.news.loadMultiSource();
            }
        });
    }

    // Photo guide button — hướng dẫn cập nhật ảnh
    var photoGuideBtn = document.getElementById('photo-guide-btn');
    if (photoGuideBtn) {
        photoGuideBtn.addEventListener('click', function () {
            LF.settings._showGuide(
                'Cập nhật ảnh nền',
                '<p>Ứng dụng tự động tải ảnh từ Picsum Photos khi bật "Ảnh trực tuyến".</p>' +
                '<ul>' +
                '<li>Bật <b>Ảnh trực tuyến</b> trong mục Nguồn ảnh</li>' +
                '<li>Chọn thời gian chuyển ảnh (10s, 15s, 30s, 60s)</li>' +
                '<li>Nhấn <b>Tải ảnh mới</b> để đổi ảnh ngay</li>' +
                '</ul>' +
                '<p>Nếu không bật ảnh trực tuyến, ứng dụng sẽ hiển thị nền đen.</p>'
            );
        });
    }

    // Always-on guide button — hướng dẫn giữ màn hình bật
    var alwaysOnGuideBtn = document.getElementById('always-on-guide-btn');
    if (alwaysOnGuideBtn) {
        alwaysOnGuideBtn.addEventListener('click', function () {
            LF.settings._showGuide(
                'Giữ màn hình luôn bật',
                '<p>Để thiết bị hiển thị liên tục như đồng hồ treo tường:</p>' +
                '<ul>' +
                '<li><b>iOS:</b> Cài đặt &rarr; Màn hình &amp; Độ sáng &rarr; Tự động khoá &rarr; Không bao giờ</li>' +
                '<li><b>Android:</b> Cài đặt &rarr; Hiển thị &rarr; Thời gian chờ màn hình &rarr; 30 phút (hoặc dùng app "Stay Alive")</li>' +
                '</ul>' +
                '<p>Nên bật <b>Tiết kiệm điện</b> để giảm hao pin khi dùng lâu.</p>'
            );
        });
    }
};

/**
 * Mở guide dialog với tiêu đề và nội dung HTML
 * @param {string} title
 * @param {string} htmlContent
 */
LF.settings._showGuide = function (title, htmlContent) {
    var overlay = document.getElementById('guide-dialog');
    var titleEl = document.getElementById('guide-title');
    var contentEl = document.getElementById('guide-content');
    var closeBtn = document.getElementById('guide-close-btn');

    if (!overlay || !titleEl || !contentEl) { return; }

    titleEl.textContent = title;
    contentEl.innerHTML = htmlContent;

    if (overlay.className.indexOf('show') === -1) {
        overlay.className = overlay.className + ' show';
    }

    if (closeBtn) {
        closeBtn.onclick = function () {
            overlay.className = overlay.className.replace(/\s*show/g, '');
        };
    }
};
