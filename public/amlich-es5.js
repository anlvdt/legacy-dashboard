/**
 * amlich-es5.js — Thư viện Âm Lịch Việt Nam (ES5)
 * Phiên bản ES5 thuần — tương thích iOS 9, Android 4, Chrome 30+
 * Thay thế amlich.js (ES6+) với cùng API: _calendar.SolarDate, _calendar.LunarDate
 *
 * Thuật toán: Ho Ngoc Duc (https://www.informatik.uni-leipzig.de/~duc/amlich/)
 * Chuyển sang ES5 bởi Antigravity
 */
(function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        factory(exports);
    } else if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else {
        global = typeof globalThis !== 'undefined' ? globalThis : global || self;
        factory(global._calendar = {});
    }
})(this, function (exports) {
    'use strict';

    var PI = Math.PI;

    function INT(d) { return Math.floor(d); }

    /* ==== Can - Chi - Tiết khí ==== */
    var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
    var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
    var DAY_NAMES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    var LUCKY_HOURS = [
        '110100101100',
        '001101001011',
        '110011010010',
        '101100110100',
        '001011001101',
        '010010110011'
    ];
    var SOLAR_TERMS = [
        'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ',
        'Tiểu mãn', 'Mang chủng', 'Hạ chí', 'Tiểu thử',
        'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
        'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông',
        'Tiểu tuyết', 'Đại tuyết', 'Đông chí', 'Tiểu hàn',
        'Đại hàn', 'Lập xuân', 'Vũ Thủy', 'Kinh trập'
    ];

    /* ==================================================================
     * Julian Day Number (JDN) — chuyển Gregorian sang số ngày Julian
     * ================================================================== */
    function jdn(dd, mm, yy) {
        var a = INT((14 - mm) / 12);
        var y = yy + 4800 - a;
        var m = mm + 12 * a - 3;
        var j = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
        if (j < 2299161) {
            j = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
        }
        return j;
    }

    /**
     * Chuyển JDN ngược lại thành Gregorian {day, month, year}
     */
    function jdnToGregorian(jd) {
        var A, B, C, D, E, day, month, year;
        if (jd < 2299161) {
            A = jd;
        } else {
            var alpha = INT((jd - 1867216.25) / 36524.25);
            A = jd + 1 + alpha - INT(alpha / 4);
        }
        B = A + 1524;
        C = INT((B - 122.1) / 365.25);
        D = INT(365.25 * C);
        E = INT((B - D) / 30.6001);
        day = INT(B - D - INT(30.6001 * E));
        month = E < 14 ? E - 1 : E - 13;
        year = month < 3 ? C - 4715 : C - 4716;
        return { day: day, month: month, year: year };
    }

    /* ==================================================================
     * Thiên Văn — tính New Moon và Sun Longitude
     * Thuật toán Jean Meeus (Astronomical Algorithms)
     * ================================================================== */

    /**
     * Tính JDN của ngày Sóc (New Moon) thứ k
     * @param {number} k - chỉ số Sóc
     * @returns {number} JDN
     */
    /**
     * Tính JDN of New Moon thứ k (chính xác, trả về JD thực)
     * @param {number} k - chỉ số Sóc
     * @returns {number} JD (thực, chưa làm tròn)
     */
    function newMoonJD(k) {
        var T = k / 1236.85;
        var T2 = T * T;
        var T3 = T2 * T;
        var dr = PI / 180;
        var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
        Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
        var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
        var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
        var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
        var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
        C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
        C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
        C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
        C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
        C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
        C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
        var JdNew;
        if (T < -11) {
            JdNew = Jd1 + 0.000297 - 0.00011 * T - 0.000001 * T2 + C1;
        } else {
            JdNew = Jd1 + C1;
        }
        return JdNew;
    }

    /**
     * Tính JDN của ngày Sóc có điều chỉnh múi giờ
     * @param {number} k - chỉ số Sóc
     * @param {number} timeZone - múi giờ (7 cho Việt Nam)
     * @returns {number} JDN (ngày địa phương)
     */
    function getNewMoonDay(k, timeZone) {
        return INT(newMoonJD(k) + 0.5 + timeZone / 24.0);
    }

    /**
     * Tính kinh độ Mặt Trời tại JDN (radian)
     */
    function sunLongitude(jd) {
        var T = (jd - 2451545.0) / 36525.0;
        var T2 = T * T;
        var dr = PI / 180;
        var M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
        var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
        var DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
        DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
        var theta = L0 + DL;
        var omega = 125.04 - 1934.136 * T;
        var L = theta - 0.00569 - 0.00478 * Math.sin(omega * dr);
        L = L * dr;
        L = L - PI * 2 * INT(L / (PI * 2));
        return L;
    }

    /**
     * Tính kinh độ Mặt Trời (đơn vị: 30 độ = 1 cung)
     * @returns {number} 0-11
     */
    function getSunLongitude(jd, timeZone) {
        return INT(sunLongitude(jd - 0.5 - timeZone / 24.0) / PI * 6);
    }

    /* ==================================================================
     * Chuyển đổi Dương → Âm lịch
     * ================================================================== */

    /**
     * Tìm ngày Sóc tháng 11 âm lịch của năm yy
     */
    function getLunarMonth11(yy, timeZone) {
        var off = jdn(31, 12, yy) - 2415021;
        var k = INT(off / 29.530588853);
        var nm = getNewMoonDay(k, timeZone);
        var sunLon = getSunLongitude(nm, timeZone);
        if (sunLon >= 9) {
            nm = getNewMoonDay(k - 1, timeZone);
        }
        return nm;
    }

    /**
     * Tìm offset tháng nhuận
     */
    function getLeapMonthOffset(a11, timeZone) {
        var k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        var last = 0;
        var i = 1;
        var arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        do {
            last = arc;
            i++;
            arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        } while (arc !== last && i < 14);
        return i - 1;
    }

    /**
     * Chuyển ngày dương lịch sang âm lịch
     * @param {number} dd - ngày
     * @param {number} mm - tháng
     * @param {number} yy - năm
     * @param {number} timeZone - múi giờ (mặc định 7 cho VN)
     * @returns {Object} { day, month, year, leap, jd }
     */
    function convertSolar2Lunar(dd, mm, yy, timeZone) {
        if (typeof timeZone === 'undefined') { timeZone = 7; }
        var dayNumber = jdn(dd, mm, yy);
        var k = INT((dayNumber - 2415021.076998695) / 29.530588853);
        var monthStart = getNewMoonDay(k + 1, timeZone);
        if (monthStart > dayNumber) {
            monthStart = getNewMoonDay(k, timeZone);
        }
        var a11 = getLunarMonth11(yy, timeZone);
        var b11 = a11;
        var lunarYear;
        if (a11 >= monthStart) {
            lunarYear = yy;
            a11 = getLunarMonth11(yy - 1, timeZone);
        } else {
            lunarYear = yy + 1;
            b11 = getLunarMonth11(yy + 1, timeZone);
        }
        var lunarDay = dayNumber - monthStart + 1;
        var diff = INT((monthStart - a11) / 29);
        var lunarLeap = 0;
        var lunarMonth = diff + 11;
        if (b11 - a11 > 365) {
            var leapMonthDiff = getLeapMonthOffset(a11, timeZone);
            if (diff >= leapMonthDiff) {
                lunarMonth = diff + 10;
                if (diff === leapMonthDiff) {
                    lunarLeap = 1;
                }
            }
        }
        if (lunarMonth > 12) { lunarMonth = lunarMonth - 12; }
        if (lunarMonth >= 11 && diff < 4) { lunarYear -= 1; }

        return {
            day: lunarDay,
            month: lunarMonth,
            year: lunarYear,
            leap: lunarLeap,
            jd: dayNumber
        };
    }

    /* ==================================================================
     * SolarDate — Constructor thay thế cho class SolarDate (ES6)
     * API tương thích: new _calendar.SolarDate({ day, month, year })
     * ================================================================== */

    /**
     * @constructor
     * @param {Object|Date} dateInput - { day, month, year } hoặc Date object
     */
    function SolarDate(dateInput) {
        if (dateInput instanceof Date) {
            this.day = dateInput.getDate();
            this.month = dateInput.getMonth() + 1;
            this.year = dateInput.getFullYear();
        } else {
            this.day = dateInput.day;
            this.month = dateInput.month;
            this.year = dateInput.year;
        }
        this.name = 'solar_calendar';
        this.jd = jdn(this.day, this.month, this.year);
        this.leap_year = (this.year % 100 !== 0 && this.year % 4 === 0) || (this.year % 400 === 0);
    }

    SolarDate.prototype.get = function () {
        return {
            name: this.name,
            day: this.day,
            month: this.month,
            year: this.year,
            leap_year: this.leap_year,
            julian: this.jd
        };
    };

    SolarDate.prototype.toLunarDate = function () {
        return LunarDate.fromSolarDate(this);
    };

    SolarDate.prototype.toDate = function () {
        return new Date(this.year, this.month - 1, this.day);
    };

    SolarDate.jdn = function (date) {
        if (date instanceof Date) {
            return jdn(date.getDate(), date.getMonth() + 1, date.getFullYear());
        }
        return jdn(date.day, date.month, date.year);
    };

    SolarDate.fromJd = function (jd) {
        var g = jdnToGregorian(jd);
        return new SolarDate(g);
    };

    /* ==================================================================
     * LunarDate — Constructor thay thế cho class LunarDate (ES6)
     * API tương thích: _calendar.LunarDate.fromSolarDate(solarDate)
     * ================================================================== */

    /**
     * @constructor
     * @param {Object} data - { day, month, year, leap, jd }
     */
    function LunarDate(data) {
        this.day = data.day;
        this.month = data.month;
        this.year = data.year;
        this.leap_month = !!data.leap;
        this.jd = data.jd || 0;
        this.name = 'lunar_calendar';
        this.leap_year = false;
    }

    /**
     * Chuyển dương lịch sang âm lịch
     * @param {SolarDate} solarDate
     * @returns {LunarDate}
     */
    LunarDate.fromSolarDate = function (solarDate) {
        var data = solarDate.get();
        var result = convertSolar2Lunar(data.day, data.month, data.year, 7);
        var lunar = new LunarDate({
            day: result.day,
            month: result.month,
            year: result.year,
            leap: result.leap,
            jd: result.jd
        });
        return lunar;
    };

    /**
     * Lấy thông tin đầy đủ
     * @returns {Object}
     */
    LunarDate.prototype.get = function () {
        return {
            name: this.name,
            day: this.day,
            month: this.month,
            year: this.year,
            leap_year: this.leap_year,
            julian: this.jd,
            year_name: this.getYearName(),
            leap_month: this.leap_month
        };
    };

    /**
     * Tên năm Can Chi (Ví dụ: "Bính Ngọ")
     */
    LunarDate.prototype.getYearName = function () {
        return CAN[(this.year + 6) % 10] + ' ' + CHI[(this.year + 8) % 12];
    };

    /**
     * Tên tháng Can Chi (Ví dụ: "Canh Dần")
     */
    LunarDate.prototype.getMonthName = function () {
        return CAN[(this.year * 12 + this.month + 3) % 10] + ' ' + CHI[(this.month + 1) % 12] + (this.leap_month ? ' (nhuận)' : '');
    };

    /**
     * Tên ngày Can Chi (Ví dụ: "Giáp Tý")
     */
    LunarDate.prototype.getDayName = function () {
        return CAN[(this.jd + 9) % 10] + ' ' + CHI[(this.jd + 1) % 12];
    };

    /**
     * Tên giờ đầu (Can Chi giờ Tý)
     */
    LunarDate.prototype.getHourName = function () {
        return CAN[((this.jd - 1) * 2) % 10] + ' ' + CHI[0];
    };

    /**
     * Thứ trong tuần
     */
    LunarDate.prototype.getDayOfWeek = function () {
        return DAY_NAMES[(this.jd + 1) % 7];
    };

    /**
     * Tiết khí (Solar Term)
     * @returns {string}
     */
    LunarDate.prototype.getSolarTerm = function () {
        return SOLAR_TERMS[getSunLongitude(this.jd + 1, 7)] || '';
    };

    /**
     * Giờ hoàng đạo
     * @returns {Array} [{ name: 'Tý', time: [23, 1] }, ...]
     */
    LunarDate.prototype.getLuckyHours = function () {
        var chiOfDay = (this.jd + 1) % 12;
        var gioHD = LUCKY_HOURS[chiOfDay % 6];
        var result = [];
        var i;
        for (i = 0; i < 12; i++) {
            if (gioHD.charAt(i) === '1') {
                result.push({
                    name: CHI[i],
                    time: [(i * 2 + 23) % 24, (i * 2 + 1) % 24]
                });
            }
        }
        return result;
    };

    /**
     * Chuyển ngược về SolarDate
     */
    LunarDate.prototype.toSolarDate = function () {
        return SolarDate.fromJd(this.jd);
    };

    /* ==== Export ==== */
    exports.SolarDate = SolarDate;
    exports.LunarDate = LunarDate;
});
