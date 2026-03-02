/**
 * weather.js — Module thời tiết cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 2.4, 2.7, 4.6, 4.7, 5.6, 10.3
 */

var LF = LF || {};

LF.weather = {};

/** Cache TTL: 30 phút */
LF.weather.CACHE_TTL = 1800000;

/** Cache keys */
LF.weather.CACHE_KEY_CURRENT = 'weather';
LF.weather.CACHE_KEY_FORECAST = 'weather_forecast';
LF.weather.CACHE_KEY_AQI = 'aqi';
LF.weather.CACHE_KEY_UV = 'uv_index';

/** Lưu vị trí hiện tại để dùng lại */
LF.weather._city = '';
LF.weather._lat = null;
LF.weather._lon = null;

/**
 * SVG icons dùng chung cho weather
 */
LF.weather._svg = {
    sun: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
    rain: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM11 20l-2 2m4-2l-2 2m4-2l-2 2m-8-2l-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    snow: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><circle cx="9" cy="19" r="1.5"/><circle cx="12" cy="21" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>',
    storm: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM13 13l-4 5h3v4l5-6h-3z"/></svg>',
    fog: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M4 10h16v2H4zm0 4h16v2H4zm0 4h16v2H4zm0-12h16v2H4z"/></svg>',
    unknown: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
};

/**
 * Map WMO weather code (Open-Meteo) sang mô tả tiếng Việt + SVG icon
 * WMO codes: https://open-meteo.com/en/docs#weathervariables
 * @param {string|number} code - WMO weather code (0-99)
 * @returns {{ d: string, i: string }} - d: mô tả, i: SVG icon
 */
LF.weather.getWeatherInfo = function (code) {
    var svg = LF.weather._svg;
    var c = parseInt(code, 10);
    if (isNaN(c)) { return { d: 'Không xác định', i: svg.unknown }; }

    if (c === 0) { return { d: 'Trời quang', i: svg.sun }; }
    if (c === 1) { return { d: 'Gần như quang', i: svg.sun }; }
    if (c === 2) { return { d: 'Mây rải rác', i: svg.cloud }; }
    if (c === 3) { return { d: 'Nhiều mây', i: svg.cloud }; }
    if (c === 45 || c === 48) { return { d: 'Sương mù', i: svg.fog }; }
    if (c === 51) { return { d: 'Mưa phùn nhẹ', i: svg.rain }; }
    if (c === 53) { return { d: 'Mưa phùn', i: svg.rain }; }
    if (c === 55) { return { d: 'Mưa phùn dày', i: svg.rain }; }
    if (c === 56 || c === 57) { return { d: 'Mưa phùn lạnh', i: svg.rain }; }
    if (c === 61) { return { d: 'Mưa nhẹ', i: svg.rain }; }
    if (c === 63) { return { d: 'Mưa vừa', i: svg.rain }; }
    if (c === 65) { return { d: 'Mưa lớn', i: svg.rain }; }
    if (c === 66 || c === 67) { return { d: 'Mưa lạnh', i: svg.rain }; }
    if (c === 71) { return { d: 'Tuyết nhẹ', i: svg.snow }; }
    if (c === 73) { return { d: 'Tuyết vừa', i: svg.snow }; }
    if (c === 75) { return { d: 'Tuyết dày', i: svg.snow }; }
    if (c === 77) { return { d: 'Mưa đá nhỏ', i: svg.snow }; }
    if (c === 80) { return { d: 'Mưa rào nhẹ', i: svg.rain }; }
    if (c === 81) { return { d: 'Mưa rào vừa', i: svg.rain }; }
    if (c === 82) { return { d: 'Mưa rào lớn', i: svg.rain }; }
    if (c === 85) { return { d: 'Mưa tuyết nhẹ', i: svg.snow }; }
    if (c === 86) { return { d: 'Mưa tuyết dày', i: svg.snow }; }
    if (c === 95) { return { d: 'Dông', i: svg.storm }; }
    if (c === 96) { return { d: 'Dông kèm mưa đá nhẹ', i: svg.storm }; }
    if (c === 99) { return { d: 'Dông kèm mưa đá lớn', i: svg.storm }; }

    return { d: 'Không xác định', i: svg.unknown };
};

/**
 * Lấy thông báo lỗi tiếng Việt cho từng loại widget
 * @param {string} widgetType - 'weather' | 'forecast' | 'aqi' | 'location'
 * @returns {string} thông báo lỗi tiếng Việt
 */
LF.weather.getErrorMessage = function (widgetType) {
    var messages = {
        'weather': 'Không thể tải thời tiết',
        'forecast': 'Không thể tải dự báo',
        'aqi': 'Lỗi tải chất lượng không khí',
        'location': 'Không thể xác định vị trí',
        'network': 'Lỗi kết nối mạng',
        'timeout': 'Hết thời gian chờ phản hồi',
        'parse': 'Lỗi xử lý dữ liệu thời tiết',
        'unknown': 'Đã xảy ra lỗi không xác định'
    };
    var msg = messages.hasOwnProperty(widgetType) ? messages[widgetType] : null;
    return (typeof msg === 'string') ? msg : messages['unknown'];
};

/**
 * Format thời gian cập nhật cuối
 * @param {number} timestamp
 * @returns {string}
 */
LF.weather._formatLastUpdate = function (timestamp) {
    if (!timestamp) { return ''; }
    var d = new Date(timestamp);
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
};

/**
 * Áp dụng dữ liệu thời tiết lên DOM
 * @param {string} city - tên thành phố
 * @param {{ d: string, i: string }} info - mô tả + icon
 * @param {string|number} tempC - nhiệt độ (°C)
 */
LF.weather.applyWeatherData = function (city, info, tempC) {
    var weatherLocation = document.getElementById('weather-location');
    var weatherIcon = document.getElementById('weather-icon');
    var weatherTemp = document.getElementById('weather-temp');
    var weatherDesc = document.getElementById('weather-desc');
    var weatherLocationOverlay = document.getElementById('weather-location-overlay');
    var weatherIconOverlay = document.getElementById('weather-icon-overlay');
    var weatherTempOverlay = document.getElementById('weather-temp-overlay');

    if (weatherLocation) { weatherLocation.textContent = city; }
    if (weatherIcon) { weatherIcon.innerHTML = info.i; }
    if (weatherTemp) { weatherTemp.textContent = tempC + '°C'; }
    if (weatherDesc) { weatherDesc.textContent = info.d; }
    if (weatherLocationOverlay) { weatherLocationOverlay.textContent = city; }
    if (weatherIconOverlay) { weatherIconOverlay.innerHTML = info.i; }
    if (weatherTempOverlay) { weatherTempOverlay.textContent = tempC + '°C'; }
};

/**
 * Lấy tên thứ viết tắt tiếng Việt
 * @param {number} dayOfWeek - 0 (CN) đến 6 (T7)
 * @returns {string}
 */
LF.weather._getDayName = function (dayOfWeek) {
    var names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return names[dayOfWeek] || '';
};

/**
 * Render dự báo 24h theo giờ lên DOM
 * @param {Array} forecastHours - mảng các giờ dự báo {hour, temp, desc, icon}
 */
LF.weather._renderForecast = function (forecastHours) {
    var container = document.getElementById('forecast-container');
    if (!container) { return; }

    container.innerHTML = '';

    var i, item, hourEl, timeEl, iconEl, tempEl;
    for (i = 0; i < forecastHours.length; i++) {
        item = forecastHours[i];

        hourEl = document.createElement('div');
        hourEl.className = 'forecast-hour';

        timeEl = document.createElement('div');
        timeEl.className = 'forecast-time';
        timeEl.textContent = item.hour;

        iconEl = document.createElement('div');
        iconEl.className = 'forecast-icon';
        iconEl.innerHTML = item.icon;

        tempEl = document.createElement('div');
        tempEl.className = 'forecast-temp';
        tempEl.textContent = item.temp + '°';

        hourEl.appendChild(timeEl);
        hourEl.appendChild(iconEl);
        hourEl.appendChild(tempEl);
        container.appendChild(hourEl);
    }
};

/**
 * Tải thời tiết hiện tại qua Open-Meteo (backend proxy)
 * Dùng cache TTL 30 phút, fallback cache khi offline
 */
LF.weather.loadCurrent = function () {
    var cached = LF.utils.cacheGet(LF.weather.CACHE_KEY_CURRENT);
    var weatherDesc = document.getElementById('weather-desc');

    // Hiển thị cache tạm thời trong khi fetch mới
    if (cached && cached.city && cached.info && cached.tempC) {
        LF.weather.applyWeatherData(cached.city, cached.info, cached.tempC);
        LF.weather._city = cached.city;
    } else if (weatherDesc) {
        weatherDesc.textContent = 'Đang tải thời tiết...';
    }

    // Luôn detect vị trí mới qua IP để đảm bảo city chính xác
    LF.weather._detectLocation(function (err, city, lat, lon) {
        if (err || !city) {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_CURRENT, 'weather');
            return;
        }

        LF.weather._city = city;
        LF.weather._lat = lat;
        LF.weather._lon = lon;

        LF.weather._fetchOpenMeteoWeather(city, lat, lon);
    });
};

/**
 * Xác định vị trí người dùng qua IP
 * @param {function} callback - function(err, city, lat, lon)
 */
LF.weather._detectLocation = function (callback) {
    // Primary: ipinfo.io (HTTPS support)
    LF.utils.makeRequest('https://ipinfo.io/json', function (err, data) {
        if (!err && data && data.loc && data.city) {
            var parts = data.loc.split(',');
            var lat = parseFloat(parts[0]);
            var lon = parseFloat(parts[1]);
            callback(null, data.city, lat, lon);
            return;
        }
        // Fallback: ipapi.co (HTTPS support free tier)
        LF.utils.makeRequest('https://ipapi.co/json/', function (err2, data2) {
            if (err2 || !data2 || !data2.city || typeof data2.latitude !== 'number' || typeof data2.longitude !== 'number') {
                callback(new Error('location'), null, null, null);
                return;
            }
            callback(null, data2.city, data2.latitude, data2.longitude);
        });
    });
};

/**
 * Fetch thời tiết từ Open-Meteo qua backend proxy
 * @param {string} city
 * @param {number} lat
 * @param {number} lon
 */
LF.weather._fetchOpenMeteoWeather = function (city, lat, lon) {
    var weatherUrl = '/api/weather?lat=' + lat + '&lon=' + lon + '&city=' + encodeURIComponent(city);

    LF.utils.makeRequest(weatherUrl, function (err, data) {
        if (err || !data || !data.weather) {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_CURRENT, 'weather');
            return;
        }

        try {
            var location = data.location || city;
            var weatherCode = data.weather.weather_code;
            var tempC = Math.round(data.weather.temperature_2m);
            var info = LF.weather.getWeatherInfo(weatherCode);

            LF.weather.applyWeatherData(location, info, tempC);
            LF.weather._city = location;

            // Lưu cache
            LF.utils.cacheSet(LF.weather.CACHE_KEY_CURRENT, {
                city: location,
                info: info,
                tempC: tempC,
                ts: Date.now()
            }, LF.weather.CACHE_TTL);
        } catch (e) {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_CURRENT, 'weather');
        }
    }, 10000);
};

/**
 * Tải dự báo 24h theo giờ từ Open-Meteo
 */
LF.weather.loadForecast = function () {
    var cached = LF.utils.cacheGet(LF.weather.CACHE_KEY_FORECAST);

    if (cached && cached.forecast && cached.forecast.length > 0) {
        LF.weather._renderForecast(cached.forecast);
        if (cached.sunrise && cached.sunset) {
            LF.weather._applySunriseSunset(cached.sunrise, cached.sunset);
        }
        return;
    }

    var lat = LF.weather._lat;
    var lon = LF.weather._lon;

    if (lat === null || lon === null) {
        var retryTimer = setTimeout(function () {
            clearTimeout(retryTimer);
            if (LF.weather._lat !== null && LF.weather._lon !== null) {
                LF.weather.loadForecast();
            } else {
                LF.weather._showCachedOrError(LF.weather.CACHE_KEY_FORECAST, 'forecast');
            }
        }, 3000);
        return;
    }

    var forecastUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&hourly=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=2';

    LF.utils.makeRequest(forecastUrl, function (err, data) {
        if (err || !data || !data.hourly || !data.hourly.time) {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_FORECAST, 'forecast');
            return;
        }

        try {
            var forecast = [];
            var hourly = data.hourly;
            var now = new Date();
            var currentHour = now.getHours();
            var i, timeStr, h, code, info, temp;

            // Tìm giờ hiện tại trong mảng, lấy 24 giờ tiếp theo, mỗi 3 giờ
            var startIdx = -1;
            for (i = 0; i < hourly.time.length; i++) {
                var d = new Date(hourly.time[i]);
                if (d.getHours() >= currentHour && d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
                    startIdx = i;
                    break;
                }
            }
            if (startIdx === -1) { startIdx = 0; }

            for (i = startIdx; i < hourly.time.length && forecast.length < 8; i += 3) {
                h = new Date(hourly.time[i]).getHours();
                temp = Math.round(hourly.temperature_2m[i]);
                code = hourly.weather_code[i];
                info = LF.weather.getWeatherInfo(code);

                forecast.push({
                    hour: (h < 10 ? '0' : '') + h + ':00',
                    temp: temp,
                    desc: info.d,
                    icon: info.i
                });
            }

            LF.weather._renderForecast(forecast);

            // Render sunrise/sunset từ daily data
            if (data.daily && data.daily.sunrise && data.daily.sunset) {
                LF.weather._applySunriseSunset(data.daily.sunrise[0], data.daily.sunset[0]);
            }

            LF.utils.cacheSet(LF.weather.CACHE_KEY_FORECAST, {
                forecast: forecast,
                sunrise: (data.daily && data.daily.sunrise) ? data.daily.sunrise[0] : null,
                sunset: (data.daily && data.daily.sunset) ? data.daily.sunset[0] : null,
                ts: Date.now()
            }, LF.weather.CACHE_TTL);
        } catch (e) {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_FORECAST, 'forecast');
        }
    }, 10000);
};

/**
 * Tải AQI từ open-meteo (lazy-load)
 * Chỉ gọi khi widget AQI không bị ẩn
 */
LF.weather.loadAQI = function () {
    var cached = LF.utils.cacheGet(LF.weather.CACHE_KEY_AQI);
    var valEl = document.getElementById('aqi-value');
    var descEl = document.getElementById('aqi-desc');
    var box = document.getElementById('aqi-wrapper');

    if (cached && typeof cached.value === 'number') {
        LF.weather._applyAQI(cached.value);
        return;
    }

    // Hiển thị "Đang tải..." khi chờ API
    if (descEl) { descEl.textContent = 'Đang tải...'; }

    var lat = LF.weather._lat;
    var lon = LF.weather._lon;

    if (lat === null || lon === null) {
        // Chưa có tọa độ, thử xác định vị trí
        LF.weather._detectLocation(function (err, city, lat2, lon2) {
            if (err || lat2 === null || lon2 === null) {
                LF.weather._showCachedOrError(LF.weather.CACHE_KEY_AQI, 'aqi');
                return;
            }
            LF.weather._lat = lat2;
            LF.weather._lon = lon2;
            LF.weather._fetchAQI(lat2, lon2);
        });
        return;
    }

    LF.weather._fetchAQI(lat, lon);
};

/**
 * Fetch AQI từ open-meteo
 * @param {number} lat
 * @param {number} lon
 */
LF.weather._fetchAQI = function (lat, lon) {
    var url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon + '&current=european_aqi';

    LF.utils.makeRequest(url, function (err, data) {
        if (err || !data || !data.current || typeof data.current.european_aqi === 'undefined') {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_AQI, 'aqi');
            return;
        }

        var aqi = data.current.european_aqi;
        LF.weather._applyAQI(aqi);

        // Lưu cache
        LF.utils.cacheSet(LF.weather.CACHE_KEY_AQI, {
            value: aqi,
            ts: Date.now()
        }, LF.weather.CACHE_TTL);
    });
};

/**
 * Áp dụng giá trị AQI lên DOM
 * @param {number} aqi
 */
LF.weather._applyAQI = function (aqi) {
    var valEl = document.getElementById('aqi-value');
    var descEl = document.getElementById('aqi-desc');
    var box = document.getElementById('aqi-wrapper');

    if (!valEl || !descEl) { return; }

    valEl.textContent = aqi;
    valEl.className = 'aqi-value';

    if (aqi <= 20) {
        descEl.textContent = 'Rất tốt';
        valEl.className = 'aqi-value aqi-good';
    } else if (aqi <= 40) {
        descEl.textContent = 'Tốt';
        valEl.className = 'aqi-value aqi-good';
    } else if (aqi <= 60) {
        descEl.textContent = 'Trung bình';
        valEl.className = 'aqi-value aqi-moderate';
    } else if (aqi <= 80) {
        descEl.textContent = 'Kém';
        valEl.className = 'aqi-value aqi-unhealthy';
    } else if (aqi <= 100) {
        descEl.textContent = 'Rất kém';
        valEl.className = 'aqi-value aqi-unhealthy';
    } else {
        descEl.textContent = 'Nguy hại';
        valEl.className = 'aqi-value aqi-hazardous';
    }

    if (box) { box.className = 'aqi-wrapper loaded'; }
};

/**
 * Hiển thị dữ liệu cache cũ (bỏ qua TTL) hoặc thông báo lỗi tiếng Việt
 * Dùng khi API fail hoặc offline
 * @param {string} cacheKey
 * @param {string} widgetType - 'weather' | 'forecast' | 'aqi'
 */
LF.weather._showCachedOrError = function (cacheKey, widgetType) {
    // Thử đọc cache trực tiếp từ localStorage (bỏ qua TTL)
    var raw = null;
    try {
        raw = localStorage.getItem('lf_cache_' + cacheKey);
    } catch (e) {
        // localStorage không khả dụng
    }

    if (raw) {
        try {
            var entry = JSON.parse(raw);
            if (entry && entry.data) {
                var lastUpdate = LF.weather._formatLastUpdate(entry.data.ts || entry.ts);

                if (widgetType === 'weather' && entry.data.city && entry.data.info) {
                    LF.weather.applyWeatherData(entry.data.city, entry.data.info, entry.data.tempC);
                    var weatherDesc = document.getElementById('weather-desc');
                    if (weatherDesc && lastUpdate) {
                        weatherDesc.textContent = entry.data.info.d + ' (cập nhật lúc ' + lastUpdate + ')';
                    }
                    return;
                }

                if (widgetType === 'forecast' && entry.data.forecast) {
                    LF.weather._renderForecast(entry.data.forecast);
                    return;
                }

                if (widgetType === 'aqi' && typeof entry.data.value === 'number') {
                    LF.weather._applyAQI(entry.data.value);
                    var aqiDesc = document.getElementById('aqi-desc');
                    if (aqiDesc && lastUpdate) {
                        aqiDesc.textContent = aqiDesc.textContent + ' (cập nhật lúc ' + lastUpdate + ')';
                    }
                    return;
                }
            }
        } catch (e) {
            // JSON parse lỗi — hiển thị lỗi
        }
    }

    // Không có cache — hiển thị lỗi tiếng Việt
    var errorMsg = LF.weather.getErrorMessage(widgetType);

    if (widgetType === 'weather') {
        var weatherDescEl = document.getElementById('weather-desc');
        if (weatherDescEl) {
            weatherDescEl.textContent = errorMsg;
            weatherDescEl.setAttribute('data-error', 'true');
        }
        var weatherWidget = document.getElementById('weather-widget');
        if (weatherWidget) { weatherWidget.setAttribute('data-error', 'true'); }
    } else if (widgetType === 'forecast') {
        var forecastContainer = document.getElementById('forecast-container');
        if (forecastContainer) {
            forecastContainer.innerHTML = '<span style="font-size:1.1vmin;color:rgba(255,255,255,0.35);font-weight:400">' + errorMsg + '</span>';
        }
    } else if (widgetType === 'aqi') {
        var aqiValEl = document.getElementById('aqi-value');
        var aqiDescEl = document.getElementById('aqi-desc');
        if (aqiValEl) { aqiValEl.textContent = '--'; }
        if (aqiDescEl) { aqiDescEl.textContent = errorMsg; }
    }
};


/**
 * UV Index SVG icon (mặt trời nhỏ)
 */
LF.weather._uvSvg = '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>';

/**
 * Lấy mô tả + màu cho mức UV
 * @param {number} uvi
 * @returns {{ desc: string, color: string }}
 */
LF.weather._getUVLevel = function (uvi) {
    if (uvi <= 2) { return { desc: 'Th\u1EA5p', color: '#2ecc71' }; }
    if (uvi <= 5) { return { desc: 'TB', color: '#f1c40f' }; }
    if (uvi <= 7) { return { desc: 'Cao', color: '#e67e22' }; }
    if (uvi <= 10) { return { desc: 'R\u1EA5t cao', color: '#e74c3c' }; }
    return { desc: 'Nguy hi\u1EC3m', color: '#8e44ad' };
};

/**
 * Tải UV Index từ currentuvindex.com
 * Gọi sau khi có tọa độ từ weather
 */
LF.weather.loadUV = function () {
    var cached = LF.utils.cacheGet(LF.weather.CACHE_KEY_UV);
    if (cached && typeof cached.uvi === 'number') {
        LF.weather._applyUV(cached.uvi);
        return;
    }

    var lat = LF.weather._lat;
    var lon = LF.weather._lon;

    if (lat === null || lon === null) {
        // Chờ tọa độ, thử lại sau 5s
        setTimeout(function () {
            if (LF.weather._lat !== null && LF.weather._lon !== null) {
                LF.weather.loadUV();
            }
        }, 5000);
        return;
    }

    LF.weather._fetchUV(lat, lon);
};

/**
 * Fetch UV từ API
 * @param {number} lat
 * @param {number} lon
 */
LF.weather._fetchUV = function (lat, lon) {
    var url = 'https://currentuvindex.com/api/v1/uvi?latitude=' + lat + '&longitude=' + lon;

    LF.utils.makeRequest(url, function (err, data) {
        if (err || !data || !data.ok || !data.now || typeof data.now.uvi !== 'number') {
            return;
        }

        var uvi = data.now.uvi;
        LF.weather._applyUV(uvi);

        LF.utils.cacheSet(LF.weather.CACHE_KEY_UV, {
            uvi: uvi,
            ts: Date.now()
        }, LF.weather.CACHE_TTL);
    }, 8000);
};

/**
 * Áp dụng UV Index lên DOM
 * @param {number} uvi
 */
LF.weather._applyUV = function (uvi) {
    var el = document.getElementById('weather-uv');
    if (!el) { return; }

    var level = LF.weather._getUVLevel(uvi);
    var rounded = Math.round(uvi * 10) / 10;

    el.innerHTML = LF.weather._uvSvg + ' UV ' + rounded + ' (' + level.desc + ')';
    el.style.color = level.color;
    el.style.display = '';
};


/**
 * Áp dụng giờ mặt trời mọc/lặn lên DOM
 * @param {string} sunrise - ISO datetime string
 * @param {string} sunset - ISO datetime string
 */
LF.weather._applySunriseSunset = function (sunrise, sunset) {
    var el = document.getElementById('weather-sun');
    if (!el) { return; }

    var riseTime = '';
    var setTime = '';

    if (sunrise) {
        var r = new Date(sunrise);
        riseTime = (r.getHours() < 10 ? '0' : '') + r.getHours() + ':' + (r.getMinutes() < 10 ? '0' : '') + r.getMinutes();
    }
    if (sunset) {
        var s = new Date(sunset);
        setTime = (s.getHours() < 10 ? '0' : '') + s.getHours() + ':' + (s.getMinutes() < 10 ? '0' : '') + s.getMinutes();
    }

    if (riseTime && setTime) {
        el.innerHTML = '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="#f39c12" style="vertical-align:-0.15em"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/><path d="M2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1z" opacity=".6"/></svg> ' + riseTime + '  <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="#e67e22" style="vertical-align:-0.15em"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/><path d="M2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 22v-2c0-.55-.45-1-1-1s-1 .45-1 1v2c0 .55.45 1 1 1s1-.45 1-1z" opacity=".6"/></svg> ' + setTime;
        el.style.display = '';
    }
};
