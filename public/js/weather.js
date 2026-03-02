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

/** Lưu vị trí hiện tại để dùng lại */
LF.weather._city = '';
LF.weather._lat = null;
LF.weather._lon = null;

/**
 * Map weather code (wttr.in) sang mô tả tiếng Việt + icon emoji
 * @param {string|number} code - weather code từ wttr.in
 * @returns {{ d: string, i: string }} - d: mô tả, i: icon
 */
LF.weather.getWeatherInfo = function (code) {
    var svg = {
        sun: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>',
        cloud: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
        rain: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM11 20l-2 2m4-2l-2 2m4-2l-2 2m-8-2l-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        snow: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><circle cx="9" cy="19" r="1.5"/><circle cx="12" cy="21" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>',
        storm: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM13 13l-4 5h3v4l5-6h-3z"/></svg>',
        fog: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M4 10h16v2H4zm0 4h16v2H4zm0 4h16v2H4zm0-12h16v2H4z"/></svg>',
        unknown: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.15em"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
    };

    var map = {
        '395': { d: 'Tuyết và dông', i: svg.storm },
        '392': { d: 'Tuyết nhẹ, dông', i: svg.storm },
        '389': { d: 'Mưa và dông', i: svg.storm },
        '386': { d: 'Mưa nhẹ và dông', i: svg.storm },
        '377': { d: 'Mưa đá', i: svg.snow },
        '374': { d: 'Mưa đá nhỏ', i: svg.snow },
        '371': { d: 'Mưa tuyết vừa', i: svg.snow },
        '368': { d: 'Mưa tuyết nhẹ', i: svg.snow },
        '365': { d: 'Mưa tuyết vừa', i: svg.snow },
        '362': { d: 'Mưa tuyết nhẹ', i: svg.snow },
        '359': { d: 'Mưa lớn', i: svg.rain },
        '356': { d: 'Mưa rào lớn', i: svg.rain },
        '353': { d: 'Mưa rào nhẹ', i: svg.rain },
        '350': { d: 'Mưa đá', i: svg.snow },
        '338': { d: 'Tuyết dày', i: svg.snow },
        '335': { d: 'Tuyết rơi dày', i: svg.snow },
        '332': { d: 'Tuyết', i: svg.snow },
        '329': { d: 'Tuyết vừa', i: svg.snow },
        '326': { d: 'Tuyết nhẹ', i: svg.snow },
        '323': { d: 'Tuyết nhẹ', i: svg.snow },
        '320': { d: 'Mưa tuyết', i: svg.snow },
        '317': { d: 'Mưa tuyết nhẹ', i: svg.snow },
        '314': { d: 'Mưa phùn lạnh', i: svg.rain },
        '311': { d: 'Mưa phùn lạnh', i: svg.rain },
        '308': { d: 'Mưa lớn', i: svg.rain },
        '305': { d: 'Mưa lớn', i: svg.rain },
        '302': { d: 'Mưa vừa', i: svg.rain },
        '299': { d: 'Mưa vừa', i: svg.rain },
        '296': { d: 'Mưa nhẹ', i: svg.rain },
        '293': { d: 'Mưa nhẹ', i: svg.rain },
        '284': { d: 'Mưa phùn lạnh', i: svg.rain },
        '281': { d: 'Mưa phùn lạnh', i: svg.rain },
        '266': { d: 'Mưa phùn nhẹ', i: svg.rain },
        '263': { d: 'Mưa phùn nhẹ', i: svg.rain },
        '260': { d: 'Sương mù', i: svg.fog },
        '248': { d: 'Sương mù', i: svg.fog },
        '230': { d: 'Bão tuyết', i: svg.storm },
        '227': { d: 'Tuyết bay', i: svg.snow },
        '200': { d: 'Dông', i: svg.storm },
        '185': { d: 'Mưa phùn lạnh', i: svg.rain },
        '182': { d: 'Mưa tuyết nhẹ', i: svg.snow },
        '179': { d: 'Tuyết nhẹ', i: svg.snow },
        '176': { d: 'Mưa rào', i: svg.rain },
        '143': { d: 'Sương mù', i: svg.fog },
        '122': { d: 'Nhiều mây', i: svg.cloud },
        '119': { d: 'Nhiều mây', i: svg.cloud },
        '116': { d: 'Mây rải rác', i: svg.cloud },
        '113': { d: 'Trời quang', i: svg.sun }
    };

    var key = String(code);
    return map[key] || { d: 'Không xác định', i: svg.unknown };
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
    if (weatherIcon) { weatherIcon.textContent = info.i; }
    if (weatherTemp) { weatherTemp.textContent = tempC + '°C'; }
    if (weatherDesc) { weatherDesc.textContent = info.d; }
    if (weatherLocationOverlay) { weatherLocationOverlay.textContent = city; }
    if (weatherIconOverlay) { weatherIconOverlay.textContent = info.i; }
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
 * Render dự báo 3 ngày lên DOM
 * @param {Array} forecastDays - mảng 3 ngày dự báo
 */
LF.weather._renderForecast = function (forecastDays) {
    var container = document.getElementById('forecast-container');
    if (!container) { return; }

    container.innerHTML = '';

    var i, day, dayEl, dateEl, iconEl, tempEl, descEl, info, dateObj;
    for (i = 0; i < forecastDays.length; i++) {
        day = forecastDays[i];

        dayEl = document.createElement('div');
        dayEl.className = 'forecast-day';

        dateEl = document.createElement('div');
        dateEl.className = 'forecast-date';
        dateEl.textContent = day.date;

        iconEl = document.createElement('div');
        iconEl.className = 'forecast-icon';
        iconEl.textContent = day.icon;

        tempEl = document.createElement('div');
        tempEl.className = 'forecast-temp';
        tempEl.textContent = day.low + '°/' + day.high + '°';

        descEl = document.createElement('div');
        descEl.className = 'forecast-desc';
        descEl.textContent = day.desc;

        dayEl.appendChild(dateEl);
        dayEl.appendChild(iconEl);
        dayEl.appendChild(tempEl);
        dayEl.appendChild(descEl);
        container.appendChild(dayEl);
    }
};

/**
 * Tải thời tiết hiện tại qua wttr.in
 * Dùng cache TTL 30 phút, fallback cache khi offline
 */
LF.weather.loadCurrent = function () {
    var cached = LF.utils.cacheGet(LF.weather.CACHE_KEY_CURRENT);
    var weatherDesc = document.getElementById('weather-desc');

    // Hiển thị "Đang tải..." khi chờ API
    if (!cached && weatherDesc) {
        weatherDesc.textContent = 'Đang tải thời tiết...';
    }

    // Nếu có cache hợp lệ, dùng luôn
    if (cached && cached.city && cached.info && cached.tempC) {
        LF.weather.applyWeatherData(cached.city, cached.info, cached.tempC);
        LF.weather._city = cached.city;
        return;
    }

    // Xác định vị trí qua ip-api.com, fallback ipinfo.io
    LF.weather._detectLocation(function (err, city, lat, lon) {
        if (err || !city) {
            // Thử dùng cache cũ (bỏ qua TTL) khi offline
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_CURRENT, 'weather');
            return;
        }

        LF.weather._city = city;
        LF.weather._lat = lat;
        LF.weather._lon = lon;

        LF.weather._fetchWttrWeather(city);
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
 * Fetch thời tiết từ wttr.in
 * @param {string} city
 */
LF.weather._fetchWttrWeather = function (city) {
    var weatherUrl = 'https://wttr.in/' + encodeURIComponent(city) + '?format=j1';

    LF.utils.makeRequest(weatherUrl, function (err, weatherData) {
        if (err || !weatherData) {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_CURRENT, 'weather');
            return;
        }

        try {
            var current = weatherData.current_condition[0];
            var info = LF.weather.getWeatherInfo(current.weatherCode);
            var tempC = current.temp_C;

            LF.weather.applyWeatherData(city, info, tempC);

            // Lưu cache
            LF.utils.cacheSet(LF.weather.CACHE_KEY_CURRENT, {
                city: city,
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
 * Tải dự báo 3 ngày tới (nhiệt độ cao/thấp, mô tả)
 * Dùng dữ liệu từ wttr.in format=j1 (trường weather[])
 */
LF.weather.loadForecast = function () {
    var cached = LF.utils.cacheGet(LF.weather.CACHE_KEY_FORECAST);

    if (cached && cached.forecast && cached.forecast.length > 0) {
        LF.weather._renderForecast(cached.forecast);
        return;
    }

    var city = LF.weather._city;
    if (!city) {
        // Chưa có city — chờ loadCurrent xong rồi thử lại sau 3 giây
        var retryTimer = setTimeout(function () {
            clearTimeout(retryTimer);
            var retryCity = LF.weather._city;
            if (retryCity) {
                LF.weather.loadForecast();
            } else {
                LF.weather._showCachedOrError(LF.weather.CACHE_KEY_FORECAST, 'forecast');
            }
        }, 3000);
        return;
    }

    var weatherUrl = 'https://wttr.in/' + encodeURIComponent(city) + '?format=j1';

    LF.utils.makeRequest(weatherUrl, function (err, weatherData) {
        if (err || !weatherData || !weatherData.weather) {
            LF.weather._showCachedOrError(LF.weather.CACHE_KEY_FORECAST, 'forecast');
            return;
        }

        try {
            var forecast = [];
            var days = weatherData.weather;
            var i, dayData, dateStr, dateObj, dayName, dd, mm, high, low, code, info;

            // Bỏ ngày đầu (hôm nay), lấy tối đa 3 ngày tiếp theo
            for (i = 1; i < days.length && forecast.length < 3; i++) {
                dayData = days[i];
                dateStr = dayData.date; // "YYYY-MM-DD"
                dateObj = new Date(dateStr + 'T00:00:00');
                dayName = LF.weather._getDayName(dateObj.getDay());
                dd = dateObj.getDate();
                mm = dateObj.getMonth() + 1;

                high = dayData.maxtempC;
                low = dayData.mintempC;
                code = dayData.hourly && dayData.hourly[4] ? dayData.hourly[4].weatherCode : '113';
                info = LF.weather.getWeatherInfo(code);

                forecast.push({
                    date: dayName + ' ' + dd + '/' + mm,
                    high: high,
                    low: low,
                    desc: info.d,
                    icon: info.i
                });
            }

            LF.weather._renderForecast(forecast);

            // Lưu cache
            LF.utils.cacheSet(LF.weather.CACHE_KEY_FORECAST, {
                forecast: forecast,
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
