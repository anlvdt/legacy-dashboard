/**
 * clock.js — Module đồng hồ cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Requirements: 1.2, 2.1, 9.1
 *
 * DOM structure:
 *   #digital-clock
 *     .clock-segment > span#clock-hours
 *     .clock-separator#main-colon
 *     .clock-segment > span#clock-minutes
 *     .clock-seconds
 *       .clock-separator
 *       .clock-segment > span#clock-seconds
 *
 * Seconds visibility: toggle "seconds-visible" CSS on #digital-clock
 */

var LF = LF || {};

LF.clock = {
    /** Cached last displayed values to avoid unnecessary DOM writes */
    lastTime: { h: '', m: '', s: '' },

    /** Reference to the setInterval timer */
    _intervalId: null,

    /** Cached DOM element references (populated on init) */
    _els: null,

    /**
     * Khởi tạo đồng hồ — cache DOM refs, gọi update ngay, bắt đầu interval 1 giây
     */
    init: function () {
        var self = this;

        // Cache DOM elements once to avoid repeated lookups
        this._els = {
            hours: document.getElementById('clock-hours'),
            minutes: document.getElementById('clock-minutes'),
            seconds: document.getElementById('clock-seconds'),
            clock: document.getElementById('digital-clock')
        };

        // Update immediately so the clock shows correct time on load
        this.update();

        // Start 1-second interval
        this._intervalId = setInterval(function () {
            self.update();
        }, 1000);
    },

    /**
     * Cập nhật hiển thị giờ:phút:giây
     * Chỉ thay đổi DOM khi giá trị thay đổi (giảm reflow)
     * Dùng LF.utils.batchUpdate() để gom tất cả DOM writes vào 1 reflow
     */
    update: function () {
        var now = new Date();
        var h = ('0' + now.getHours()).slice(-2);
        var m = ('0' + now.getMinutes()).slice(-2);
        var s = ('0' + now.getSeconds()).slice(-2);

        var lastTime = this.lastTime;
        var els = this._els;

        // Determine what changed before touching the DOM
        var hChanged = lastTime.h !== h;
        var mChanged = lastTime.m !== m;
        var sChanged = lastTime.s !== s;

        // Nothing changed — skip entirely
        if (!hChanged && !mChanged && !sChanged) {
            return;
        }

        // Batch all DOM mutations into a single reflow via requestAnimationFrame
        LF.utils.batchUpdate(function () {
            if (hChanged && els.hours) {
                els.hours.textContent = h;
            }
            if (mChanged && els.minutes) {
                els.minutes.textContent = m;
            }
            if (sChanged && els.seconds) {
                els.seconds.textContent = s;
            }
        });

        // Update cached values after scheduling the DOM write
        if (hChanged) { lastTime.h = h; }
        if (mChanged) { lastTime.m = m; }
        if (sChanged) { lastTime.s = s; }
    },

    /**
     * Bật/tắt hiển thị giây bằng toggle "seconds-visible" trên #digital-clock
     * @param {boolean} visible - true để hiện giây, false để ẩn
     */
    toggleSeconds: function (visible) {
        var clockEl = this._els && this._els.clock;
        if (!clockEl) {
            clockEl = document.getElementById('digital-clock');
        }
        if (!clockEl) {
            return;
        }

        if (visible) {
            clockEl.className = clockEl.className.indexOf('seconds-visible') === -1
                ? clockEl.className + ' seconds-visible'
                : clockEl.className;
        } else {
            clockEl.className = clockEl.className.replace(/\s*seconds-visible/g, '');
        }
    }
};
