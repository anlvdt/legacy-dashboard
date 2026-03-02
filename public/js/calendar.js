/**
 * calendar.js — Module lịch âm dương và vạn niên cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Tích hợp với amlich.js (global _calendar: SolarDate, LunarDate)
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
 * Sử dụng amlich.js (_calendar.SolarDate, _calendar.LunarDate)
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
 * 7. render(baseDate) — Render lịch tháng/tuần
 * Dùng DocumentFragment cho hiệu năng
 *
 * @param {Date} baseDate - Ngày cơ sở để render lịch
 */
LF.calendar.render = function (baseDate) {
    var isVertical = window.innerWidth <= 800;
    if (isVertical) {
        LF.calendar._renderMonthly(baseDate);
    } else {
        LF.calendar._renderWeekly(baseDate);
    }
};

/**
 * Render lịch tuần (landscape)
 * @param {Date} baseDate
 */
LF.calendar._renderWeekly = function (baseDate) {
    var grid = document.getElementById('calendar-grid');
    if (!grid) { return; }

    var today = new Date();
    var dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    var weekStart = new Date(baseDate);
    weekStart.setDate(baseDate.getDate() - baseDate.getDay());
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    var titleEl = document.getElementById('calendar-title');
    if (titleEl) {
        titleEl.textContent = 'Tuần: ' + weekStart.getDate() + '/' + (weekStart.getMonth() + 1) +
            ' - ' + weekEnd.getDate() + '/' + (weekEnd.getMonth() + 1);
    }

    var frag = document.createDocumentFragment();
    var i, dayEl, currentDay, solarDay, lunar, lunarDisplay;

    // Header row
    for (i = 0; i < dayNames.length; i++) {
        dayEl = document.createElement('div');
        dayEl.className = 'calendar-cell day-name';
        dayEl.innerHTML = '<div class="cell-content">' + dayNames[i] + '</div>';
        frag.appendChild(dayEl);
    }

    // Day cells
    for (i = 0; i < 7; i++) {
        currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        solarDay = currentDay.getDate();
        lunar = LF.calendar.solarToLunar(solarDay, currentDay.getMonth() + 1, currentDay.getFullYear());
        lunarDisplay = (lunar.day === 1) ? lunar.day + '/' + lunar.lunarMonth : lunar.day;

        dayEl = document.createElement('div');
        dayEl.className = 'calendar-cell';
        if (currentDay.getDate() === today.getDate() &&
            currentDay.getMonth() === today.getMonth() &&
            currentDay.getFullYear() === today.getFullYear()) {
            dayEl.className += ' today';
        }
        dayEl.innerHTML = '<div class="calendar-cell-inner"><div class="cell-content">' +
            '<span class="solar-day">' + solarDay + '</span>' +
            '<span class="lunar-day">' + lunarDisplay + '</span>' +
            '</div></div>';
        frag.appendChild(dayEl);
    }

    grid.innerHTML = '';
    grid.appendChild(frag);
};


/**
 * Render lịch tháng (portrait / mobile)
 * @param {Date} baseDate
 */
LF.calendar._renderMonthly = function (baseDate) {
    var grid = document.getElementById('calendar-grid');
    if (!grid) { return; }

    var today = new Date();
    var year = baseDate.getFullYear();
    var month = baseDate.getMonth();
    var dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    var titleEl = document.getElementById('calendar-title');
    if (titleEl) {
        titleEl.textContent = 'Tháng ' + (month + 1) + ' ' + year;
    }

    var firstDayOfMonth = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var frag = document.createDocumentFragment();
    var i, dayEl, solarDay, lunar, lunarDisplay;

    // Header row
    for (i = 0; i < dayNames.length; i++) {
        dayEl = document.createElement('div');
        dayEl.className = 'calendar-cell day-name';
        dayEl.innerHTML = '<div class="cell-content">' + dayNames[i] + '</div>';
        frag.appendChild(dayEl);
    }

    // Empty cells before first day
    for (i = 0; i < firstDayOfMonth; i++) {
        dayEl = document.createElement('div');
        dayEl.className = 'calendar-cell other-month';
        frag.appendChild(dayEl);
    }

    // Day cells
    for (i = 1; i <= daysInMonth; i++) {
        solarDay = i;
        lunar = LF.calendar.solarToLunar(solarDay, month + 1, year);
        lunarDisplay = (lunar.day === 1) ? lunar.day + '/' + lunar.lunarMonth : lunar.day;

        dayEl = document.createElement('div');
        dayEl.className = 'calendar-cell';
        if (solarDay === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()) {
            dayEl.className += ' today';
        }
        dayEl.innerHTML = '<div class="calendar-cell-inner"><div class="cell-content">' +
            '<span class="solar-day">' + solarDay + '</span>' +
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
