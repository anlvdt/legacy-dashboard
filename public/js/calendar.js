/**
 * calendar.js — Module lịch âm dương và vạn niên cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Tích hợp với amlich-es5.js (global _calendar: SolarDate, LunarDate)
 *
 * Requirements: 1.2, 2.6, 5.1, 5.2, 5.3, 5.8
 */

var LF = LF || {};

LF.calendar = {};

/**
 * Danh sách 24 tiết khí hợp lệ (dùng để validate)
 */
LF.calendar.VALID_SOLAR_TERMS = [
    "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
    "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
    "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
    "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ Thủy", "Kinh trập"
];

/**
 * Bảng ngày lễ dương lịch Việt Nam (key: "dd/mm")
 */
LF.calendar._solarHolidays = {
    '1/1': 'Tết Dương lịch',
    '30/4': 'Giải phóng miền Nam',
    '1/5': 'Quốc tế Lao động',
    '2/9': 'Quốc khánh',
    '20/11': 'Nhà giáo VN',
    '22/12': 'Quân đội nhân dân VN'
};

/**
 * Bảng ngày lễ âm lịch Việt Nam (key: "dd/mm")
 */
LF.calendar._lunarHolidays = {
    '1/1': 'Tết Nguyên Đán',
    '15/1': 'Tết Nguyên Tiêu',
    '10/3': 'Giỗ Tổ Hùng Vương',
    '5/5': 'Tết Đoan Ngọ',
    '15/7': 'Vu Lan',
    '15/8': 'Trung Thu',
    '23/12': 'Ông Táo'
};


/**
 * Bảng hướng xuất hành tốt theo Chi của ngày
 */
LF.calendar._directionMap = {
    'Tý': 'Đông Nam',
    'Ngọ': 'Đông Nam',
    'Sửu': 'Đông',
    'Mùi': 'Đông',
    'Dần': 'Nam',
    'Thân': 'Nam',
    'Mão': 'Tây Nam',
    'Dậu': 'Tây Nam',
    'Thìn': 'Bắc',
    'Tuất': 'Bắc',
    'Tỵ': 'Tây Bắc',
    'Hợi': 'Tây Bắc'
};

/**
 * Trích xuất Chi từ chuỗi can chi (ví dụ: "Giáp Tý" → "Tý")
 * @param {string} canChiStr
 * @returns {string}
 */
LF.calendar._extractChi = function (canChiStr) {
    if (!canChiStr || typeof canChiStr !== 'string') {
        return '';
    }
    var parts = canChiStr.split(' ');
    if (parts.length >= 2) {
        return parts[parts.length - 1];
    }
    return canChiStr;
};

/**
 * 1. solarToLunar(dd, mm, yy) — Chuyển đổi dương lịch sang âm lịch
 * Sử dụng amlich-es5.js (_calendar.SolarDate, _calendar.LunarDate)
 *
 * @param {number} dd - ngày dương lịch
 * @param {number} mm - tháng dương lịch
 * @param {number} yy - năm dương lịch
 * @returns {Object} {day, lunarMonth, lunarYear, isLeap, dayCanChi, monthCanChi, yearName, monthName, holiday}
 */
LF.calendar.solarToLunar = function (dd, mm, yy) {
    try {
        var solarDate = new _calendar.SolarDate({ day: dd, month: mm, year: yy });
        var lunarDate = _calendar.LunarDate.fromSolarDate(solarDate);
        var lunarData = lunarDate.get();

        var dayCanChi = lunarDate.getDayName();
        var monthCanChi = lunarDate.getMonthName();
        var yearName = lunarDate.getYearName();
        var monthName = 'tháng ' + lunarData.month + (lunarData.leap_month ? ' nhuận' : '');

        var holiday = LF.calendar.getHoliday(dd, mm, yy, lunarData.day, lunarData.month);

        return {
            day: lunarData.day,
            lunarMonth: lunarData.month,
            lunarYear: lunarData.year,
            isLeap: !!lunarData.leap_month,
            dayCanChi: dayCanChi,
            monthCanChi: monthCanChi,
            yearName: yearName,
            monthName: monthName,
            holiday: holiday
        };
    } catch (e) {
        return {
            day: '?',
            lunarMonth: '?',
            lunarYear: '?',
            isLeap: false,
            dayCanChi: 'Lỗi',
            monthCanChi: 'Lỗi',
            yearName: 'Lỗi',
            monthName: 'Lỗi',
            holiday: ''
        };
    }
};

/**
 * 2. getSolarTerm(dd, mm, yy) — Lấy tiết khí cho ngày
 *
 * @param {number} dd
 * @param {number} mm
 * @param {number} yy
 * @returns {string} Tên tiết khí hoặc "" nếu không phải ngày tiết khí
 */
LF.calendar.getSolarTerm = function (dd, mm, yy) {
    try {
        var solarDate = new _calendar.SolarDate({ day: dd, month: mm, year: yy });
        var lunarDate = _calendar.LunarDate.fromSolarDate(solarDate);
        var term = lunarDate.getSolarTerm();
        return (term && typeof term === 'string') ? term : '';
    } catch (e) {
        return '';
    }
};

/**
 * 3. getLuckyHours(dd, mm, yy) — Lấy giờ hoàng đạo
 *
 * @param {number} dd
 * @param {number} mm
 * @param {number} yy
 * @returns {Array} Mảng tên Chi (ví dụ: ["Tý", "Sửu", "Mão", "Ngọ", "Thân", "Dậu"])
 */
LF.calendar.getLuckyHours = function (dd, mm, yy) {
    try {
        var solarDate = new _calendar.SolarDate({ day: dd, month: mm, year: yy });
        var lunarDate = _calendar.LunarDate.fromSolarDate(solarDate);
        var hours = lunarDate.getLuckyHours();
        var result = [];
        var i;
        if (hours && hours.length) {
            for (i = 0; i < hours.length; i++) {
                if (hours[i] && hours[i].name) {
                    result.push(hours[i].name);
                }
            }
        }
        return result;
    } catch (e) {
        return [];
    }
};


/**
 * 4. getGoodDirection(dayCanChi) — Lấy hướng xuất hành tốt
 *
 * @param {string} dayCanChi - Chuỗi can chi ngày (ví dụ: "Giáp Tý")
 * @returns {string} Hướng tốt (ví dụ: "Đông Nam")
 */
LF.calendar.getGoodDirection = function (dayCanChi) {
    var chi = LF.calendar._extractChi(dayCanChi);
    var direction = LF.calendar._directionMap[chi];
    return direction || '';
};

/**
 * 5. getDaySummary(dd, mm, yy) — Lấy thông tin vạn niên tóm tắt
 *
 * @param {number} dd
 * @param {number} mm
 * @param {number} yy
 * @returns {Object} {dayCanChi, monthCanChi, yearCanChi, solarTerm, luckyHours, goodDirection, holiday}
 */
LF.calendar.getDaySummary = function (dd, mm, yy) {
    var lunar = LF.calendar.solarToLunar(dd, mm, yy);
    var solarTerm = LF.calendar.getSolarTerm(dd, mm, yy);
    var luckyHours = LF.calendar.getLuckyHours(dd, mm, yy);
    var goodDirection = LF.calendar.getGoodDirection(lunar.dayCanChi);

    return {
        dayCanChi: lunar.dayCanChi,
        monthCanChi: lunar.monthCanChi,
        yearCanChi: lunar.yearName,
        solarTerm: solarTerm,
        luckyHours: luckyHours,
        goodDirection: goodDirection,
        holiday: lunar.holiday
    };
};

/**
 * 6. getHoliday(dd, mm, yy, lunarDay, lunarMonth) — Kiểm tra ngày lễ Việt Nam
 *
 * @param {number} dd - ngày dương lịch
 * @param {number} mm - tháng dương lịch
 * @param {number} yy - năm dương lịch
 * @param {number} lunarDay - ngày âm lịch
 * @param {number} lunarMonth - tháng âm lịch
 * @returns {string} Tên ngày lễ hoặc ""
 */
LF.calendar.getHoliday = function (dd, mm, yy, lunarDay, lunarMonth) {
    // Kiểm tra ngày lễ dương lịch
    var solarKey = dd + '/' + mm;
    if (LF.calendar._solarHolidays[solarKey]) {
        return LF.calendar._solarHolidays[solarKey];
    }

    // Kiểm tra ngày lễ âm lịch
    if (typeof lunarDay === 'number' && typeof lunarMonth === 'number') {
        var lunarKey = lunarDay + '/' + lunarMonth;
        if (LF.calendar._lunarHolidays[lunarKey]) {
            return LF.calendar._lunarHolidays[lunarKey];
        }
    }

    return '';
};

/**
 * 7. render(baseDate) — Render lịch tháng đầy đủ
 * Luôn hiển thị full tháng, T2 là ngày đầu tuần
 *
 * @param {Date} baseDate - Ngày cơ sở để render lịch
 */
LF.calendar.render = function (baseDate) {
    LF.calendar._renderMonthly(baseDate);
};

/**
 * Render lịch tuần (legacy — không còn dùng, giữ backward compat)
 * @param {Date} baseDate
 */
LF.calendar._renderWeekly = function (baseDate) {
    // Delegate sang monthly
    LF.calendar._renderMonthly(baseDate);
};


/**
 * Render lịch tháng đầy đủ — T2 là ngày đầu tuần
 * Hiển thị ngày tháng trước/sau để lấp đầy grid
 * @param {Date} baseDate
 */
LF.calendar._renderMonthly = function (baseDate) {
    var grid = document.getElementById('calendar-grid');
    if (!grid) { return; }

    var today = new Date();
    var year = baseDate.getFullYear();
    var month = baseDate.getMonth();
    // T2 đầu tuần: T2, T3, T4, T5, T6, T7, CN
    var dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    var titleEl = document.getElementById('calendar-title');
    if (titleEl) {
        titleEl.textContent = 'Tháng ' + (month + 1) + ' ' + year;
    }

    var daysInMonth = new Date(year, month + 1, 0).getDate();
    // getDay() trả 0=CN, chuyển sang Monday-based: T2=0, T3=1, ..., CN=6
    var firstDayJS = new Date(year, month, 1).getDay();
    var firstDayMon = (firstDayJS === 0) ? 6 : firstDayJS - 1;

    // Số ngày tháng trước cần hiện
    var prevMonthDays = new Date(year, month, 0).getDate();

    var frag = document.createDocumentFragment();
    var i, dayEl, solarDay, lunar, lunarDisplay, cellDate, cellMonth, cellYear;

    // Header row
    for (i = 0; i < dayNames.length; i++) {
        dayEl = document.createElement('div');
        dayEl.className = 'calendar-cell day-name';
        dayEl.innerHTML = '<div class="cell-content">' + dayNames[i] + '</div>';
        frag.appendChild(dayEl);
    }

    // Tổng ô cần render (6 hàng x 7 cột = 42, hoặc 5 hàng nếu đủ)
    var totalCells = firstDayMon + daysInMonth;
    var rows = Math.ceil(totalCells / 7);
    if (rows < 5) { rows = 5; }
    var totalSlots = rows * 7;

    for (i = 0; i < totalSlots; i++) {
        var dayNum = i - firstDayMon + 1;
        var isOtherMonth = false;

        if (dayNum < 1) {
            // Ngày tháng trước (month là 0-based, cellMonth cần 1-based cho solarToLunar)
            cellDate = prevMonthDays + dayNum;
            cellYear = year;
            if (month === 0) { cellMonth = 12; cellYear = year - 1; }
            else { cellMonth = month; } // month (0-based) = tháng trước (1-based)
            isOtherMonth = true;
            lunar = LF.calendar.solarToLunar(cellDate, cellMonth, cellYear);
        } else if (dayNum > daysInMonth) {
            // Ngày tháng sau
            cellDate = dayNum - daysInMonth;
            cellMonth = month + 2; // JS month 0-based + 1 for display + 1 for next
            cellYear = year;
            if (cellMonth > 12) { cellMonth = 1; cellYear = year + 1; }
            isOtherMonth = true;
            lunar = LF.calendar.solarToLunar(cellDate, cellMonth, cellYear);
        } else {
            // Ngày trong tháng hiện tại
            cellDate = dayNum;
            cellMonth = month + 1;
            cellYear = year;
            isOtherMonth = false;
            lunar = LF.calendar.solarToLunar(cellDate, cellMonth, cellYear);
        }

        lunarDisplay = (lunar.day === 1) ? lunar.day + '/' + lunar.lunarMonth : lunar.day;

        dayEl = document.createElement('div');
        dayEl.className = 'calendar-cell';
        if (isOtherMonth) {
            dayEl.className += ' other-month';
        }
        if (!isOtherMonth &&
            cellDate === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()) {
            dayEl.className += ' today';
        }
        dayEl.innerHTML = '<div class="calendar-cell-inner"><div class="cell-content">' +
            '<span class="solar-day">' + cellDate + '</span>' +
            '<span class="lunar-day">' + lunarDisplay + '</span>' +
            '</div></div>';
        frag.appendChild(dayEl);
    }

    grid.innerHTML = '';
    grid.appendChild(frag);
};

/**
 * 8. updateMainDate() — Cập nhật hiển thị ngày trên dashboard
 * Cập nhật #gregorian-date-p, #lunar-date-p, #lunar-event
 */
LF.calendar.updateMainDate = function () {
    var now = new Date();
    var dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    var day = ('0' + now.getDate()).slice(-2);
    var month = ('0' + (now.getMonth() + 1)).slice(-2);
    var year = now.getFullYear();
    var gregorianText = dayOfWeek[now.getDay()] + ', ' + day + '/' + month + '/' + year;

    var lunar = LF.calendar.solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
    var lunarDatePart = 'ÂL: ' + lunar.day + '/' + lunar.lunarMonth +
        (lunar.isLeap ? ' nhuận' : '') + ' (' + lunar.dayCanChi + ')';

    var gregorianEl = document.getElementById('gregorian-date-p');
    var lunarEl = document.getElementById('lunar-date-p');
    var eventEl = document.getElementById('lunar-event');

    if (gregorianEl) {
        gregorianEl.textContent = gregorianText;
    }
    if (lunarEl) {
        lunarEl.textContent = lunarDatePart;
    }
    if (eventEl) {
        eventEl.textContent = lunar.holiday || '';
    }
};


/**
 * Danh sách ngày nghỉ lễ chính thức (có nghỉ) — dùng cho countdown
 * Bao gồm cả dương lịch và âm lịch
 */
LF.calendar._officialHolidays = {
    solar: {
        '1/1': 'Tết Dương lịch',
        '30/4': 'Giải phóng miền Nam',
        '1/5': 'Quốc tế Lao động',
        '2/9': 'Quốc khánh'
    },
    lunar: {
        '1/1': 'Tết Nguyên Đán',
        '10/3': 'Giỗ Tổ Hùng Vương',
        '15/1': 'Tết Nguyên Tiêu'
    }
};

/**
 * Chuyển ngày âm lịch sang dương lịch (tìm ngày dương tương ứng)
 * Duyệt từ ngày bắt đầu, tìm ngày dương có âm lịch khớp
 * @param {number} lunarDay
 * @param {number} lunarMonth
 * @param {number} year - năm dương lịch để tìm
 * @returns {Date|null}
 */
LF.calendar._lunarToSolar = function (lunarDay, lunarMonth, year) {
    // Duyệt từ tháng 1 đến tháng 12 của năm, tìm ngày dương có âm lịch khớp
    var d, m, lunar;
    for (m = 1; m <= 12; m++) {
        var daysInMonth = new Date(year, m, 0).getDate();
        for (d = 1; d <= daysInMonth; d++) {
            try {
                lunar = LF.calendar.solarToLunar(d, m, year);
                if (lunar.day === lunarDay && lunar.lunarMonth === lunarMonth && !lunar.isLeap) {
                    return new Date(year, m - 1, d);
                }
            } catch (e) {
                // skip
            }
        }
    }
    return null;
};

/**
 * Lấy ngày nghỉ lễ tiếp theo và số ngày còn lại
 * @returns {Object} {name, date, daysLeft} hoặc null
 */
LF.calendar.getNextHoliday = function () {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var year = now.getFullYear();
    var candidates = [];
    var key, parts, d, m, solarDate;

    // Thu thập tất cả ngày lễ dương lịch trong năm nay và năm sau
    var years = [year, year + 1];
    var yi;
    for (yi = 0; yi < years.length; yi++) {
        var y = years[yi];
        for (key in LF.calendar._officialHolidays.solar) {
            if (!LF.calendar._officialHolidays.solar.hasOwnProperty(key)) { continue; }
            parts = key.split('/');
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            solarDate = new Date(y, m - 1, d);
            if (solarDate >= today) {
                candidates.push({
                    name: LF.calendar._officialHolidays.solar[key],
                    date: solarDate
                });
            }
        }

        // Thu thập ngày lễ âm lịch — chuyển sang dương lịch
        for (key in LF.calendar._officialHolidays.lunar) {
            if (!LF.calendar._officialHolidays.lunar.hasOwnProperty(key)) { continue; }
            parts = key.split('/');
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            solarDate = LF.calendar._lunarToSolar(d, m, y);
            if (solarDate && solarDate >= today) {
                candidates.push({
                    name: LF.calendar._officialHolidays.lunar[key],
                    date: solarDate
                });
            }
        }
    }

    if (candidates.length === 0) { return null; }

    // Sắp xếp theo ngày gần nhất
    candidates.sort(function (a, b) {
        return a.date.getTime() - b.date.getTime();
    });

    var next = candidates[0];
    var diff = next.date.getTime() - today.getTime();
    var daysLeft = Math.ceil(diff / 86400000);

    return {
        name: next.name,
        date: next.date,
        daysLeft: daysLeft
    };
};

/**
 * Render countdown nghỉ lễ vào DOM
 * Hiển thị trong #holiday-countdown (nằm dưới calendar widget)
 */
LF.calendar.renderHolidayCountdown = function () {
    var el = document.getElementById('holiday-countdown');
    if (!el) { return; }

    var info = LF.calendar.getNextHoliday();
    if (!info) {
        el.style.display = 'none';
        return;
    }

    var dateStr = ('0' + info.date.getDate()).slice(-2) + '/' +
        ('0' + (info.date.getMonth() + 1)).slice(-2);

    var html = '';
    if (info.daysLeft === 0) {
        html = '<span class="holiday-icon"><svg viewBox="0 0 24 24" width="1.6vmin" height="1.6vmin" fill="#e74c3c"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>' +
            '<span class="holiday-name">' + info.name + '</span>' +
            '<span class="holiday-today">H\u00F4m nay!</span>';
    } else {
        html = '<span class="holiday-icon"><svg viewBox="0 0 24 24" width="1.6vmin" height="1.6vmin" fill="#f39c12"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg></span>' +
            '<span class="holiday-name">' + info.name + ' (' + dateStr + ')</span>' +
            '<span class="holiday-days">' + info.daysLeft + ' ng\u00E0y</span>';
    }

    el.innerHTML = html;
    el.style.display = '';
};
