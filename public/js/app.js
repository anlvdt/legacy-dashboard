/**
 * app.js — Entry point và tích hợp cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 2.3, 2.8, 3.4, 4.4, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.5, 11.5, 11.6, 11.7
 */

var LF = LF || {};

LF.app = {};

/** Trạng thái ứng dụng */
LF.app._isLegacy = false;
LF.app._isOffline = false;
LF.app._clockOnlySettingsTimer = null;
LF.app._onlineRefreshTimer = null;

/** Danh sách interval IDs cần tạm dừng khi clock-only */
LF.app._pausedIntervals = [];

/**
 * Fallback requestAnimationFrame cho trình duyệt rất cũ
 * Requirement: 11.7
 */
LF.app._polyfillRAF = function () {
    if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
        window.requestAnimationFrame = function (fn) {
            return setTimeout(fn, 16);
        };
    }
    if (typeof window !== 'undefined' && !window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
};

/**
 * Tải Google Fonts không block rendering
 * Fonts Inter + Outfit đã được tải trong HTML head
 * Hàm này giữ lại cho backward compat nhưng không tải thêm font thừa
 * Requirements: 11.6, 11.7
 */
LF.app._loadGoogleFonts = function () {
    // Inter + Outfit đã được tải qua <link> trong app.html
    // Không cần tải thêm Roboto
};

/**
 * Phát hiện thiết bị cũ và bật chế độ tương thích
 * Tắt backdrop-filter, dùng background solid, giảm animation
 * Hiển thị thông báo phù hợp cho widget phụ thuộc API
 * Requirements: 2.3, 11.5
 */
LF.app._enableLegacyMode = function () {
    LF.app._isLegacy = true;
    var body = document.body;
    if (!body) { return; }

    if (body.className.indexOf('legacy-device') === -1) {
        body.className = body.className + ' legacy-device';
    }
};

/**
 * Áp dụng chế độ nhẹ (lite mode)
 * Tắt backdrop-filter, giảm animation, dùng nền đục
 * Dùng cho thiết bị cũ hoặc khi user chọn thủ công
 */
LF.app.applyLiteMode = function () {
    var current = LF.settings && LF.settings.current ? LF.settings.current : {};
    var body = document.body;
    if (!body) { return; }

    if (current.liteMode) {
        if (body.className.indexOf('lite-mode') === -1) {
            body.className = body.className + ' lite-mode';
        }
    } else {
        body.className = body.className.replace(/\s*lite-mode/g, '');
    }
};

/**
 * Hiển thị thông báo "không khả dụng" cho widget phụ thuộc API trên thiết bị cũ
 * Gọi sau khi DOM đã sẵn sàng
 */
LF.app._showLegacyMessages = function () {
    var msg = 'Không khả dụng trên thiết bị cũ';
    var pairs = [
        ['finance-gold-sjc-value', msg],
        ['finance-gold-world-value', msg],
        ['finance-usd-value', msg],
        ['fuel-ron95-value', msg],
        ['fuel-e5-value', msg],
        ['fuel-do-value', msg],
        ['weather-desc', msg],
        ['aqi-desc', msg]
    ];
    var i, el;
    for (i = 0; i < pairs.length; i++) {
        el = document.getElementById(pairs[i][0]);
        if (el) {
            el.textContent = pairs[i][1];
            el.className = (el.className || '') + ' legacy-unavailable';
        }
    }

    // KQXS rows
    var kqxsIds = ['kqxs-mb', 'kqxs-mt', 'kqxs-mn'];
    for (i = 0; i < kqxsIds.length; i++) {
        el = document.getElementById(kqxsIds[i]);
        if (el) {
            var valSpan = el.getElementsByTagName('span');
            var j;
            for (j = 0; j < valSpan.length; j++) {
                if (valSpan[j].className && valSpan[j].className.indexOf('kqxs-value') !== -1) {
                    valSpan[j].textContent = msg;
                    valSpan[j].className = valSpan[j].className + ' legacy-unavailable';
                }
            }
        }
    }

    // AQI value
    var aqiVal = document.getElementById('aqi-value');
    if (aqiVal) { aqiVal.textContent = '--'; }

    // Weather location
    var weatherLoc = document.getElementById('weather-location');
    if (weatherLoc) { weatherLoc.textContent = ''; }
    var weatherTemp = document.getElementById('weather-temp');
    if (weatherTemp) { weatherTemp.textContent = ''; }
    var weatherIcon = document.getElementById('weather-icon');
    if (weatherIcon) { weatherIcon.innerHTML = ''; }
};

/**
 * Áp dụng chế độ nhìn xa (clock-only mode)
 * Ẩn widget không thiết yếu, hiển thị tùy chọn ngày/thời tiết
 * Requirements: 9.2, 9.3
 */
LF.app.applyClockOnlyMode = function () {
    var current = LF.settings && LF.settings.current ? LF.settings.current : {};

    if (!current.clockOnlyMode) {
        // Thoát clock-only mode — khôi phục visibility theo settings bình thường
        LF.app._resumeIntervals();
        if (LF.settings && LF.settings.apply) {
            LF.settings.apply();
        }
        return;
    }

    // Ẩn tất cả widget không thiết yếu
    var widgetsToHide = [
        'calendar-widget',
        'finance-widget',
        'news-ticker',
        'news-widget',
        'quote-widget',
        'aqi-widget',
        'agriculture-widget',
        'fx-ticker',
        'radio-bar'
    ];

    var i, el;
    for (i = 0; i < widgetsToHide.length; i++) {
        el = document.getElementById(widgetsToHide[i]);
        if (el) {
            if (el.className.indexOf('hidden-force') === -1) {
                el.className = el.className + ' hidden-force';
            }
        }
    }

    // Hiển thị tùy chọn: ngày dương lịch
    LF.app._setClockOnlyVisibility('date-display', current.clockOnlyShowGregorian);

    // Hiển thị tùy chọn: ngày âm lịch
    LF.app._setClockOnlyVisibility('lunar-date-display', current.clockOnlyShowLunar);

    // Hiển thị tùy chọn: thời tiết
    LF.app._setClockOnlyVisibility('weather-widget', current.clockOnlyShowWeather);

    // Tạm dừng interval không liên quan (Requirement 2.8)
    LF.app._pauseNonEssentialIntervals();
};

/**
 * Ẩn/hiện phần tử trong chế độ clock-only
 * @param {string} elementId
 * @param {boolean} visible
 */
LF.app._setClockOnlyVisibility = function (elementId, visible) {
    var el = document.getElementById(elementId);
    if (!el) { return; }

    if (visible) {
        el.style.display = '';
        el.className = el.className.replace(/\s*hidden-force/g, '');
    } else {
        if (el.className.indexOf('hidden-force') === -1) {
            el.className = el.className + ' hidden-force';
        }
    }
};

/**
 * Áp dụng chế độ tiết kiệm điện
 * Tắt slideshow, nền đen, không glow/shadow
 * Requirements: 9.4
 */
LF.app.applyPowerSaveMode = function () {
    var current = LF.settings && LF.settings.current ? LF.settings.current : {};

    if (current.powerSaveMode) {
        // Tắt slideshow
        if (LF.slideshow && LF.slideshow.stop) {
            LF.slideshow.stop();
        }

        // Nền đen — CSS 'power-save' xử lý qua settings.apply()
        var bgEl = document.getElementById('background-slideshow');
        if (bgEl) {
            bgEl.style.backgroundImage = 'none';
            bgEl.style.backgroundColor = '#000';
        }
    } else {
        // Khôi phục slideshow nếu không ở clock-only mode và bật ảnh trực tuyến
        if (!current.clockOnlyMode && current.useOnlinePhotos && LF.slideshow && LF.slideshow.start) {
            var interval = current.slideshowInterval || 12000;
            if (!current.slideshowHidden) {
                LF.slideshow.start(interval);
            }
        }
    }
};

/**
 * Tạm dừng interval không liên quan khi ở chế độ nhìn xa
 * Requirement: 2.8
 */
LF.app._pauseNonEssentialIntervals = function () {
    // Dừng slideshow
    if (LF.slideshow && LF.slideshow.stop) {
        LF.slideshow.stop();
    }

    // Dừng FX ticker
    if (LF.fxticker && LF.fxticker.stop) {
        LF.fxticker.stop();
    }

    // Dừng news ticker animation và refresh
    if (LF.news && LF.news.stopAnimation) {
        LF.news.stopAnimation();
    }
    if (LF.news && LF.news.stopRefresh) {
        LF.news.stopRefresh();
    }

    // Dừng radio
    if (LF.radio && LF.radio.stop) {
        LF.radio.stop();
    }
};

/**
 * Khôi phục interval khi thoát chế độ nhìn xa
 */
LF.app._resumeIntervals = function () {
    var current = LF.settings && LF.settings.current ? LF.settings.current : {};

    // Khôi phục slideshow nếu không ở power save mode và bật ảnh trực tuyến
    if (!current.powerSaveMode && current.useOnlinePhotos && !current.slideshowHidden && LF.slideshow && LF.slideshow.start) {
        LF.slideshow.start(current.slideshowInterval || 12000);
    }

    // Khôi phục news ticker
    if (current.showNewsTicker && LF.news) {
        if (LF.news.startAnimation) { LF.news.startAnimation(); }
        if (LF.news.scheduleRefresh) { LF.news.scheduleRefresh(); }
    }
};

/**
 * Xử lý offline: lắng nghe online/offline events
 * Hiển thị indicator, refresh khi online (trong 30s)
 * Requirements: 10.1, 10.2, 10.5
 */
LF.app._setupOfflineHandling = function () {
    if (typeof window === 'undefined') { return; }

    window.addEventListener('offline', function () {
        LF.app._isOffline = true;
        LF.app._showOfflineIndicator(true);
    });

    window.addEventListener('online', function () {
        LF.app._isOffline = false;
        LF.app._showOfflineIndicator(false);

        // Refresh tất cả dữ liệu API trong vòng 30 giây (stagger)
        LF.app._refreshAllAPIs();
    });

    // Kiểm tra trạng thái ban đầu
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        LF.app._isOffline = true;
        LF.app._showOfflineIndicator(true);
    }
};

/**
 * Hiển thị/ẩn offline indicator
 * @param {boolean} show
 */
LF.app._showOfflineIndicator = function (show) {
    var indicator = document.getElementById('offline-indicator');
    if (!indicator) { return; }

    if (show) {
        indicator.style.display = 'block';
        indicator.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.1em;margin-right:0.3em"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> Offline';
    } else {
        indicator.style.display = 'none';
    }
};

/**
 * Refresh tất cả API khi online trở lại (stagger trong 30s)
 * Requirement: 10.5
 */
LF.app._refreshAllAPIs = function () {
    // Xóa timer cũ nếu có
    if (LF.app._onlineRefreshTimer) {
        clearTimeout(LF.app._onlineRefreshTimer);
    }

    // Stagger các API calls để tránh burst
    // Thời tiết: ngay lập tức
    if (LF.weather && LF.weather.loadCurrent) {
        LF.weather.loadCurrent();
    }

    // Tài chính, Xăng, Xổ số: sau 5 giây
    setTimeout(function () {
        if (LF.finance && LF.finance.render) LF.finance.render();
        if (LF.fuel && LF.fuel.init) LF.fuel.init();
        if (LF.kqxs && LF.kqxs.init) LF.kqxs.init();
        if (LF.agriculture && LF.agriculture.init) LF.agriculture.init();
        if (LF.fxticker && LF.fxticker.init) LF.fxticker.init();
    }, 5000);

    // Tin tức: sau 10 giây
    setTimeout(function () {
        if (LF.news && LF.news.loadMultiSource) {
            LF.news.loadMultiSource();
        }
    }, 10000);

    // Dự báo + AQI: sau 15 giây
    setTimeout(function () {
        if (LF.weather && LF.weather.loadForecast) {
            LF.weather.loadForecast();
        }
    }, 15000);

    setTimeout(function () {
        if (LF.weather && LF.weather.loadAQI) {
            LF.weather.loadAQI();
        }
    }, 20000);

    // UV Index: sau 22 giây
    setTimeout(function () {
        if (LF.weather && LF.weather.loadUV) {
            LF.weather.loadUV();
        }
    }, 22000);

    // Thiên tai: sau 25 giây
    LF.app._onlineRefreshTimer = setTimeout(function () {
        if (LF.disaster && LF.disaster.load) {
            LF.disaster.load();
        }
    }, 25000);
};

/**
 * Xử lý orientation change
 * Điều chỉnh layout trong 300ms mà không cần reload
 * Requirement: 3.4
 */
LF.app._setupOrientationChange = function () {
    if (typeof window === 'undefined') { return; }

    var handler = function () {
        // Dùng setTimeout 300ms để đảm bảo viewport đã cập nhật
        setTimeout(function () {
            // Re-render calendar nếu có
            if (LF.calendar && LF.calendar.render) {
                LF.calendar.render(new Date());
            }

            // Cập nhật kích thước Picsum nếu slideshow đang chạy
            if (LF.slideshow && LF.slideshow._running) {
                LF.slideshow.preloadNext();
            }

            // Re-apply settings để cập nhật layout
            if (LF.settings && LF.settings.apply) {
                LF.settings.apply();
            }

            // Re-apply clock-only mode nếu đang bật
            var current = LF.settings && LF.settings.current ? LF.settings.current : {};
            if (current.clockOnlyMode) {
                LF.app.applyClockOnlyMode();
            }
        }, 300);
    };

    // Ưu tiên orientationchange, fallback resize
    if ('onorientationchange' in window) {
        window.addEventListener('orientationchange', handler);
    } else {
        window.addEventListener('resize', handler);
    }
};

/**
 * Hiển thị tạm thời Bảng Cài Đặt khi chạm màn hình ở chế độ nhìn xa (5 giây)
 * Requirement: 9.5
 */
LF.app._setupClockOnlyTouch = function () {
    if (typeof document === 'undefined') { return; }

    document.addEventListener('click', function () {
        var current = LF.settings && LF.settings.current ? LF.settings.current : {};
        if (!current.clockOnlyMode) { return; }

        // Hiển thị settings panel
        if (LF.settings && LF.settings.openPanel) {
            LF.settings.openPanel();
        }

        // Xóa timer cũ nếu có
        if (LF.app._clockOnlySettingsTimer) {
            clearTimeout(LF.app._clockOnlySettingsTimer);
        }

        // Tự động ẩn sau 5 giây
        LF.app._clockOnlySettingsTimer = setTimeout(function () {
            if (LF.settings && LF.settings.closePanel) {
                LF.settings.closePanel();
            }
            LF.app._clockOnlySettingsTimer = null;
        }, 5000);
    });
};

/**
 * Khởi tạo ứng dụng — entry point chính
 * Phát hiện legacy device, tải settings, init tất cả module
 */
LF.app.init = function () {
    // 1. Polyfill requestAnimationFrame
    LF.app._polyfillRAF();

    // 2. Tải Google Fonts không block rendering
    LF.app._loadGoogleFonts();

    // 3. Phát hiện thiết bị cũ
    if (LF.utils && LF.utils.isLegacyDevice && LF.utils.isLegacyDevice()) {
        LF.app._enableLegacyMode();
    }

    // 4. Tải settings
    if (LF.settings && LF.settings.load) {
        LF.settings.load();
    }

    // 4.5. Auto-enable lite mode cho thiết bị cũ (lần đầu tiên)
    if (LF.app._isLegacy) {
        var hasExplicitSetting = false;
        try {
            var saved = localStorage.getItem(LF.settings._storageKey);
            if (saved) {
                var parsed = JSON.parse(saved);
                if (parsed && typeof parsed.liteMode === 'boolean') {
                    hasExplicitSetting = true;
                }
            }
        } catch (e) { /* ignore */ }

        if (!hasExplicitSetting) {
            LF.settings.current.liteMode = true;
            LF.settings.save();
        }
    }

    // 5. Áp dụng settings lên DOM
    if (LF.settings && LF.settings.apply) {
        LF.settings.apply();
    }

    // 5.3. Áp dụng lite mode
    LF.app.applyLiteMode();

    // 5.5 Bind settings event listeners
    if (LF.settings && LF.settings.bindEvents) {
        LF.settings.bindEvents();
    }

    // 5.6 Bind news panel events
    if (LF.news && LF.news.bindPanelEvents) {
        LF.news.bindPanelEvents();
    }

    // 6. Init đồng hồ (luôn chạy — offline OK)
    if (LF.clock && LF.clock.init) {
        LF.clock.init();
    }

    // 7. Init lịch (offline OK)
    if (LF.calendar && LF.calendar.updateMainDate) {
        LF.calendar.updateMainDate();
    }
    if (LF.calendar && LF.calendar.render) {
        LF.calendar.render(new Date());
    }
    if (LF.calendar && LF.calendar.renderHolidayCountdown) {
        LF.calendar.renderHolidayCountdown();
    }

    // 8. Init ca dao (offline OK)
    if (LF.quotes && LF.quotes.rotate) {
        LF.quotes.rotate();
    }

    // 9. Áp dụng chế độ đặc biệt
    var current = LF.settings && LF.settings.current ? LF.settings.current : {};

    // Chế độ nhìn xa
    if (current.clockOnlyMode) {
        LF.app.applyClockOnlyMode();
    }

    // Chế độ tiết kiệm điện
    if (current.powerSaveMode) {
        LF.app.applyPowerSaveMode();
    }

    // 9.5. Setup offline handling SỚM — trước khi gọi API
    LF.app._setupOfflineHandling();

    // 10. Init slideshow (nếu không ở power save hoặc clock-only, và bật ảnh trực tuyến)
    if (!current.powerSaveMode && !current.clockOnlyMode) {
        if (LF.slideshow && LF.slideshow.init) {
            LF.slideshow.init();
        }
        if (current.useOnlinePhotos && !current.slideshowHidden && LF.slideshow && LF.slideshow.start) {
            LF.slideshow.start(current.slideshowInterval);
        }
    }

    // 11. Tải dữ liệu từ API — tất cả thiết bị đều gọi API bình thường
    // iOS 9.3 hỗ trợ TLS 1.2 nên API qua HTTPS hoạt động được
    if (!LF.app._isOffline) {
        // Thời tiết
        if (LF.weather && LF.weather.loadCurrent) {
            LF.weather.loadCurrent();
        }

        // Dự báo (delay nhẹ để không burst)
        setTimeout(function () {
            if (LF.weather && LF.weather.loadForecast) {
                LF.weather.loadForecast();
            }
        }, 3000);

        // Tài chính, Xăng Dầu, Xổ Số
        if (!current.clockOnlyMode) {
            if (current.showFinanceWidget && LF.finance && LF.finance.render) {
                LF.finance.render();
            }
            if (LF.fuel && LF.fuel.init) {
                LF.fuel.init();
            }
            if (LF.kqxs && LF.kqxs.init) {
                LF.kqxs.init();
            }
            if (current.showAgriWidget && LF.agriculture && LF.agriculture.init) {
                LF.agriculture.init();
            }

            // FX Ticker (tỷ giá + vàng)
            if (LF.fxticker && LF.fxticker.init) {
                setTimeout(function () {
                    LF.fxticker.init();
                }, 6000);
            }
        }

        // AQI (lazy-load — chỉ khi widget không ẩn)
        if (!current.aqiHidden && !current.clockOnlyMode && LF.weather && LF.weather.loadAQI) {
            setTimeout(function () {
                LF.weather.loadAQI();
            }, 5000);
        }

        // UV Index (lazy-load — sau AQI)
        if (!current.clockOnlyMode && LF.weather && LF.weather.loadUV) {
            setTimeout(function () {
                LF.weather.loadUV();
            }, 7000);
        }

        // Tin tức (lazy-load)
        if (!current.clockOnlyMode && current.showNewsTicker && LF.news && LF.news.init) {
            setTimeout(function () {
                LF.news.init();
            }, 4000);
        }

        // TTS — luôn init để nút TTS hiện khi có tin tức
        if (LF.tts && LF.tts.init) {
            setTimeout(function () {
                LF.tts.init();
            }, 5000);
        }

        // Thiên tai (lazy-load)
        if (current.showDisasterAlerts && LF.disaster && LF.disaster.init) {
            setTimeout(function () {
                LF.disaster.init();
            }, 6000);
        }
    } else {
        // OFFLINE: hiển thị dữ liệu cache cũ (bỏ qua TTL) cho các widget
        LF.app._loadStaleCache(current);
    }

    // Radio cải lương — init luôn (không cần mạng cho đến khi nhấn Play)
    if (current.showRadio && LF.radio && LF.radio.init) {
        LF.radio.init();
    }

    // 12. Setup event handlers
    LF.app._setupOrientationChange();
    LF.app._setupClockOnlyTouch();

    // 13. Đồng hồ giây
    if (LF.clock && LF.clock.toggleSeconds) {
        LF.clock.toggleSeconds(!!current.secondsVisible);
    }
};

/**
 * Khi offline: hiển thị dữ liệu cache cũ (bỏ qua TTL)
 * Đảm bảo user thấy dữ liệu gần nhất thay vì "Đang tải..." mãi
 */
LF.app._loadStaleCache = function (current) {
    // Ảnh nền: khôi phục từ cache
    if (!current.slideshowHidden && LF.slideshow && LF.slideshow.restoreCached) {
        LF.slideshow.restoreCached();
    }

    // Thời tiết
    if (LF.weather && LF.weather.applyWeatherData) {
        var weatherData = LF.utils.cacheGetStale('weather');
        if (weatherData && weatherData.city && weatherData.info && weatherData.tempC) {
            LF.weather.applyWeatherData(weatherData.city, weatherData.info, weatherData.tempC);
        }
    }

    // Dự báo
    if (LF.weather && LF.weather._renderForecast) {
        var forecastData = LF.utils.cacheGetStale('weather_forecast');
        if (forecastData && forecastData.forecast && forecastData.forecast.length > 0) {
            LF.weather._renderForecast(forecastData.forecast);
            if (forecastData.sunrise && forecastData.sunset && LF.weather._applySunriseSunset) {
                LF.weather._applySunriseSunset(forecastData.sunrise, forecastData.sunset);
            }
        }
    }

    // AQI
    if (!current.aqiHidden && LF.weather && LF.weather._applyAQI) {
        var aqiData = LF.utils.cacheGetStale('aqi');
        if (aqiData && typeof aqiData.value === 'number') {
            LF.weather._applyAQI(aqiData.value);
        }
    }

    // UV
    if (LF.weather && LF.weather._applyUV) {
        var uvData = LF.utils.cacheGetStale('uv_index');
        if (uvData && typeof uvData.uvi === 'number') {
            LF.weather._applyUV(uvData.uvi);
        }
    }

    // Tin tức
    if (current.showNewsTicker && LF.news && LF.news._renderInline) {
        var newsData = LF.utils.cacheGetStale('news');
        if (newsData && newsData.length > 0) {
            LF.news._renderInline(newsData, true);
        }
    }

    // FX Ticker
    if (LF.fxticker && LF.fxticker._render) {
        var fxData = LF.utils.cacheGetStale('fx_ticker');
        if (fxData && fxData.items && fxData.items.length > 0) {
            LF.fxticker._render(fxData.items);
        }
    }
};

/**
 * Tự động khởi tạo khi DOM sẵn sàng
 */
(function () {
    if (typeof document === 'undefined') { return; }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            LF.app.init();
        });
    } else {
        LF.app.init();
    }
})();
