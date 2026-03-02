# Kế hoạch Triển khai: Nâng cấp Legacy Frame

## Tổng quan

Triển khai theo thứ tự: tách CSS → tạo utils → tạo từng module JS → tích hợp vào index.html → kiểm thử. Tất cả code production dùng ES5, code test dùng ES6+. Sử dụng global namespace `LF` để giao tiếp giữa các module.

## Tasks

- [x] 1. Thiết lập cấu trúc dự án và framework kiểm thử
  - [x] 1.1 Tạo cấu trúc thư mục `public/css/` và `public/js/`
    - Tạo thư mục `public/css/` và `public/js/`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Cấu hình Vitest và fast-check cho kiểm thử
    - Tạo `package.json` với dependencies: vitest, fast-check, jsdom
    - Tạo `vitest.config.js` với environment jsdom
    - Tạo thư mục `tests/` cho test files
    - _Requirements: Chiến lược kiểm thử trong design_

  - [x] 1.3 Viết property test cho tuân thủ cú pháp ES5 (static analysis)
    - **Property 1: Tuân thủ cú pháp ES5**
    - Quét tất cả file trong `public/js/` để đảm bảo không chứa `let `, `const `, `=>`, backtick, `async `, `await `, `class `, `import `/`export `
    - **Validates: Requirements 1.5, 11.3**

- [x] 2. Tách CSS và tạo file styles.css
  - [x] 2.1 Tách toàn bộ CSS inline từ index.html sang `public/css/styles.css`
    - Trích xuất ~1080 dòng CSS inline từ thẻ `<style>` trong index.html
    - Thêm `-webkit-` prefix cho flexbox, transition, transform, animation, filter
    - Không dùng CSS Grid, CSS Variables, `clamp()`
    - Triển khai hệ thống spacing nhất quán dựa trên bội số 0.5vmin
    - Đảm bảo tỷ lệ tương phản màu tối thiểu 4.5:1 (WCAG AA)
    - Thêm responsive breakpoints: 800px (2 cột → 1 cột), 480px (mobile)
    - Đảm bảo nút bấm/vùng tương tác tối thiểu 44x44px
    - Thanh tin tức chiều cao tối thiểu 44px trên thiết bị cảm ứng
    - Widget tài chính dạng column trên portrait mobile
    - Bảng cài đặt width 90vw trên viewport < 480px
    - Thêm CSS cho loading states ("Đang tải...") và error states
    - Thêm CSS cho offline indicator
    - Thêm CSS cho chế độ nhìn xa (font-size 25vmin landscape, 30vw portrait)
    - Thêm CSS cho chế độ tiết kiệm điện (nền đen, không glow/shadow)
    - Thêm CSS cho banner cảnh báo thiên tai mức Red (màu đỏ #ff4444)
    - Thêm CSS cho dự báo 3 ngày và widget vạn niên
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.4, 11.1, 11.2_

- [x] 3. Checkpoint — Kiểm tra CSS
  - Đảm bảo styles.css tải đúng, layout responsive hoạt động. Hỏi người dùng nếu có thắc mắc.

- [x] 4. Triển khai utils.js — Module tiện ích dùng chung
  - [x] 4.1 Tạo `public/js/utils.js` với các hàm tiện ích cốt lõi
    - Khởi tạo global namespace `var LF = LF || {};`
    - Triển khai `LF.utils.makeRequest(url, callback, timeoutMs)` dùng XMLHttpRequest với timeout mặc định 12000ms
    - Triển khai `LF.utils.cacheSet(key, data, ttlMs)` và `LF.utils.cacheGet(key)` với localStorage
    - Triển khai `LF.utils.createFragment(elements)` dùng `document.createDocumentFragment()`
    - Triển khai `LF.utils.isLegacyDevice()` phát hiện iOS < 10, Android < 5, Chrome < 40 qua User-Agent
    - Triển khai `LF.utils.batchUpdate(updateFn)` gom DOM updates vào 1 reflow
    - Tất cả dùng cú pháp ES5 (var, function)
    - _Requirements: 1.5, 2.1, 2.6, 2.7, 10.6, 11.3, 11.4, 11.5_

  - [x] 4.2 Viết property test cho cache round-trip với TTL
    - **Property 4: Cache API round-trip với TTL**
    - Test cacheSet rồi cacheGet trả về dữ liệu giống hệt; cache hết hạn trả null
    - **Validates: Requirements 2.7**

  - [x] 4.3 Viết property test cho timeout mặc định API request
    - **Property 19: Timeout mặc định cho API request**
    - Test makeRequest không truyền timeout → XHR.timeout === 12000
    - **Validates: Requirements 10.6**

  - [x] 4.4 Viết property test cho phát hiện thiết bị cũ
    - **Property 2: Phát hiện thiết bị cũ kích hoạt chế độ tương thích**
    - Test isLegacyDevice() trả true cho UA thiết bị cũ, false cho thiết bị hiện đại
    - **Validates: Requirements 2.3, 11.5**

- [x] 5. Triển khai clock.js — Module đồng hồ
  - [x] 5.1 Tạo `public/js/clock.js`
    - Triển khai `LF.clock.init()`, `LF.clock.update()`, `LF.clock.toggleSeconds()`
    - Chỉ cập nhật DOM khi giá trị thay đổi (giảm reflow)
    - Giới hạn tối đa 1 DOM reflow mỗi chu kỳ 1 giây
    - _Requirements: 1.2, 2.1, 9.1_

- [x] 6. Triển khai calendar.js — Module lịch âm dương và vạn niên
  - [x] 6.1 Tạo `public/js/calendar.js`
    - Triển khai `LF.calendar.solarToLunar()` dùng thuật toán Hồ Ngọc Đức (tích hợp với amlich.js)
    - Triển khai `LF.calendar.getSolarTerm()` — tiết khí cho ngày hiện tại
    - Triển khai `LF.calendar.getLuckyHours()` — giờ hoàng đạo
    - Triển khai `LF.calendar.getGoodDirection()` — hướng xuất hành tốt
    - Triển khai `LF.calendar.getDaySummary()` — thông tin vạn niên tóm tắt
    - Triển khai `LF.calendar.getHoliday()` — ngày lễ VN (Tết, Giỗ Tổ, 30/4, 1/5, 2/9, Trung Thu, Vu Lan, v.v.)
    - Triển khai `LF.calendar.render()` — render lịch tuần/tháng
    - Triển khai `LF.calendar.updateMainDate()` — cập nhật ngày trên dashboard
    - Dùng DocumentFragment khi tạo nhiều phần tử DOM
    - _Requirements: 1.2, 2.6, 5.1, 5.2, 5.3, 5.8_

  - [x] 6.2 Viết property test cho thông tin vạn niên đầy đủ
    - **Property 6: Thông tin vạn niên đầy đủ cho mọi ngày**
    - Test getDaySummary() cho ngày ngẫu nhiên 1900-2100 trả về đầy đủ dayCanChi, monthCanChi, yearCanChi, solarTerm, luckyHours, goodDirection
    - **Validates: Requirements 5.1, 5.2, 5.8**

  - [x] 6.3 Viết property test cho tính năng offline
    - **Property 18: Tính năng offline hoạt động không cần mạng**
    - Test clock.update(), calendar.solarToLunar(), calendar.getDaySummary(), quotes.showRandom() không gọi makeRequest
    - **Validates: Requirements 10.1**

  - [x] 6.4 Viết unit tests cho ngày lễ và ngày đặc biệt
    - Test Tết Nguyên Đán (1/1 âm), Giỗ Tổ Hùng Vương (10/3 âm), 30/4, 1/5, 2/9
    - Test năm nhuận, tháng nhuận âm lịch, ngày 29/30 tháng 2
    - _Requirements: 5.3_

- [x] 7. Triển khai weather.js — Module thời tiết
  - [x] 7.1 Tạo `public/js/weather.js`
    - Triển khai `LF.weather.loadCurrent()` — tải thời tiết qua wttr.in
    - Triển khai `LF.weather.loadForecast()` — dự báo 3 ngày (nhiệt độ cao/thấp, mô tả)
    - Triển khai `LF.weather.loadAQI()` — AQI từ open-meteo (lazy-load)
    - Triển khai `LF.weather.applyWeatherData()` — render lên DOM
    - Triển khai `LF.weather.getWeatherInfo()` — map code sang mô tả tiếng Việt + icon
    - Dùng `LF.utils.makeRequest()` với cache (TTL 30 phút)
    - Hiển thị "Đang tải..." khi chờ API, lỗi tiếng Việt khi API fail
    - Dùng cache khi offline, hiển thị thời gian cập nhật cuối
    - _Requirements: 1.2, 2.4, 2.7, 4.6, 4.7, 5.6, 10.3_

  - [x] 7.2 Viết property test cho thông báo lỗi API bằng tiếng Việt
    - **Property 5: Thông báo lỗi API bằng tiếng Việt**
    - Test hàm xử lý lỗi trả về chuỗi tiếng Việt có dấu, không chứa "Error"/"Failed"
    - **Validates: Requirements 4.7**

- [x] 8. Triển khai finance.js — Module tài chính
  - [x] 8.1 Tạo `public/js/finance.js`
    - Triển khai `LF.finance.loadUSD()` — tỷ giá USD/VND
    - Triển khai `LF.finance.loadGoldWorld()` — giá vàng thế giới quy đổi VND/lượng
    - Triển khai `LF.finance.loadGoldSJC()` — giá vàng SJC trong nước
    - Triển khai `LF.finance.getTrend()` — xu hướng ▲▼ so với lần trước
    - Triển khai `LF.finance.render()` — render widget với xu hướng
    - Lưu previousValues để tính trend
    - Dùng cache (TTL 30 phút), hiển thị "Cập nhật lúc HH:MM" khi offline
    - _Requirements: 1.2, 2.7, 4.6, 4.7, 5.4, 5.5, 10.4_

  - [x] 8.2 Viết property test cho tính toán xu hướng tài chính
    - **Property 7: Tính toán xu hướng tài chính**
    - Test getTrend() trả "up"/"down"/"stable" và ký hiệu ▲/▼/"" đúng
    - **Validates: Requirements 5.5**

- [x] 9. Checkpoint — Kiểm tra các module cốt lõi
  - Đảm bảo tất cả tests pass. Hỏi người dùng nếu có thắc mắc.

- [x] 10. Triển khai news.js — Module tin tức
  - [x] 10.1 Tạo `public/js/news.js`
    - Triển khai `LF.news.loadMultiSource()` — tải tin từ nhiều nguồn đồng thời (VnExpress, Tuổi Trẻ, Dân Trí, Báo Chính Phủ, VTV News)
    - Triển khai `LF.news.parseRSS()` — parse RSS XML thành mảng items
    - Triển khai `LF.news.buildTickerDOM()` — build DOM dùng DocumentFragment, hiển thị tên nguồn
    - Triển khai `LF.news.startAnimation()` — animation ticker bằng requestAnimationFrame
    - Triển khai `LF.news.scheduleRefresh()` — tự động refresh mỗi 15 phút
    - Mở link bài viết trong tab mới khi chạm
    - Fallback: hiển thị cache + "Đang dùng tin cũ" khi RSS timeout 10 giây
    - Lazy-load (không tải ngay khi khởi động)
    - _Requirements: 1.2, 2.2, 2.4, 2.6, 6.1, 6.2, 6.5, 6.6, 6.7_

  - [x] 10.2 Viết property test cho ticker tin tức đa nguồn
    - **Property 9: Ticker tin tức hiển thị đa nguồn**
    - Test buildTickerDOM() output chứa ít nhất 1 item từ mỗi nguồn
    - **Validates: Requirements 6.1**

- [x] 11. Triển khai disaster.js — Module cảnh báo thiên tai
  - [x] 11.1 Tạo `public/js/disaster.js`
    - Triển khai `LF.disaster.load()` — tải alerts từ GDACS
    - Triển khai `LF.disaster.filterSEAsia()` — lọc theo bounding box ĐNA (lat: -11~28.5, lon: 92~142)
    - Triển khai `LF.disaster.renderBanner()` — banner cảnh báo, mức Red có màu đỏ #ff4444
    - Triển khai `LF.disaster.removeBanner()`
    - Lazy-load, cache kết quả
    - _Requirements: 1.2, 2.4, 6.3, 6.4_

  - [x] 11.2 Viết property test cho lọc cảnh báo theo khu vực ĐNA
    - **Property 10: Lọc cảnh báo thiên tai theo khu vực Đông Nam Á**
    - Test filterSEAsia() chỉ trả về events trong bounding box ĐNA
    - **Validates: Requirements 6.3**

  - [x] 11.3 Viết property test cho banner cảnh báo mức Red
    - **Property 11: Banner cảnh báo mức Red có styling đỏ**
    - Test renderBanner() cho event Red chứa màu đỏ trong style
    - **Validates: Requirements 6.4**

- [x] 12. Triển khai quotes.js — Module ca dao, tục ngữ
  - [x] 12.1 Tạo `public/js/quotes.js`
    - Tạo bộ sưu tập 50+ câu ca dao, tục ngữ, danh ngôn tiếng Việt
    - Phân loại theo chủ đề: gia-dinh, hoc-tap, dao-duc, mua-vu, cuoc-song, tinh-yeu
    - Triển khai `LF.quotes.showRandom()` và `LF.quotes.rotate()`
    - _Requirements: 1.2, 5.7_

  - [x] 12.2 Viết property test cho bộ sưu tập ca dao
    - **Property 8: Bộ sưu tập ca dao đầy đủ và có cấu trúc**
    - Test collection >= 50 phần tử, mỗi phần tử có text, author, category hợp lệ
    - **Validates: Requirements 5.7**

- [x] 13. Triển khai slideshow.js — Module ảnh nền
  - [x] 13.1 Tạo `public/js/slideshow.js`
    - Triển khai `LF.slideshow.init()`, `LF.slideshow.preloadNext()`, `LF.slideshow.changeImage()`
    - Triển khai `LF.slideshow.getPicsumSize()` — chọn kích thước theo viewport (640x480 mobile, 1280x720 tablet, 1920x1080 desktop)
    - Triển khai `LF.slideshow.start(intervalMs)` và `LF.slideshow.stop()`
    - Fade transition 1.5s bằng opacity
    - Preload ảnh tiếp theo trong khi hiển thị ảnh hiện tại
    - Bỏ qua ảnh lỗi sau 10 giây, chuyển ảnh tiếp
    - Tắt slideshow + nền đen khi chế độ tiết kiệm điện
    - Chỉ chấp nhận interval trong {10000, 15000, 30000, 60000}, mặc định 12000
    - _Requirements: 1.2, 2.2, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 13.2 Viết property test cho validation thời gian chuyển ảnh
    - **Property 15: Validation thời gian chuyển ảnh slideshow**
    - Test chỉ {10000, 15000, 30000, 60000} được chấp nhận, giá trị khác → 12000
    - **Validates: Requirements 8.5**

  - [x] 13.3 Viết property test cho kích thước Picsum theo màn hình
    - **Property 16: Kích thước Picsum theo độ phân giải màn hình**
    - Test getPicsumSize() trả đúng kích thước theo chiều rộng viewport
    - **Validates: Requirements 8.6**

  - [x] 13.4 Viết property test cho giới hạn kích thước ảnh trên thiết bị cũ
    - **Property 3: Giới hạn kích thước ảnh trên thiết bị cũ**
    - Test getPicsumSize() trả "640/480" khi là legacy device
    - **Validates: Requirements 2.5**

- [x] 14. Triển khai settings.js — Module cài đặt
  - [x] 14.1 Tạo `public/js/settings.js`
    - Triển khai `LF.settings.load()`, `LF.settings.save()`, `LF.settings.apply()`
    - Triển khai `LF.settings.reset()` — đặt lại với dialog xác nhận
    - Triển khai `LF.settings.exportSettings()` và `LF.settings.importSettings()` — xuất/nhập base64
    - Triển khai `LF.settings.isStorageAvailable()` — kiểm tra localStorage
    - Nhóm tùy chọn thành sections: "Hiển thị", "Thành phần", "Nguồn ảnh", "Tin tức & Cảnh báo", "Hướng dẫn"
    - Lưu vào localStorage trong vòng 100ms khi thay đổi
    - Hiển thị thông báo khi localStorage không khả dụng
    - Text nút phản ánh trạng thái (Bật/Tắt, Hiện/Ẩn)
    - Cấu hình thời gian chuyển ảnh (10s, 15s, 30s, 60s)
    - Animation mở panel: opacity + translateY trong 250ms
    - _Requirements: 1.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.5_

  - [x] 14.2 Viết property test cho fallback khi localStorage không khả dụng
    - **Property 12: Fallback khi localStorage không khả dụng**
    - Test load() trả defaults khi localStorage ném exception
    - **Validates: Requirements 7.3**

  - [x] 14.3 Viết property test cho text nút phản ánh trạng thái
    - **Property 13: Text nút phản ánh trạng thái cài đặt**
    - Test text nút chứa "Tắt"/"Ẩn" khi bật, "Hiện"/"Bật" khi tắt
    - **Validates: Requirements 7.4**

  - [x] 14.4 Viết property test cho xuất/nhập cài đặt round-trip
    - **Property 14: Xuất/nhập cài đặt round-trip**
    - Test exportSettings() rồi importSettings() trả object deep-equal
    - **Validates: Requirements 7.6**

- [x] 15. Checkpoint — Kiểm tra tất cả module
  - Đảm bảo tất cả tests pass. Hỏi người dùng nếu có thắc mắc.

- [x] 16. Triển khai app.js — Entry point và tích hợp
  - [x] 16.1 Tạo `public/js/app.js`
    - Triển khai logic khởi tạo: phát hiện legacy device, tải settings, init tất cả module
    - Triển khai chế độ nhìn xa (clock-only): ẩn widget không thiết yếu, hiển thị tùy chọn ngày/thời tiết
    - Triển khai chế độ tiết kiệm điện: tắt slideshow, nền đen, không glow/shadow
    - Triển khai tạm dừng interval không liên quan khi ở chế độ nhìn xa
    - Triển khai xử lý offline: lắng nghe online/offline events, hiển thị indicator, refresh khi online (trong 30s)
    - Triển khai xử lý orientation change (điều chỉnh layout trong 300ms)
    - Triển khai hiển thị tạm thời Bảng Cài Đặt khi chạm màn hình ở chế độ nhìn xa (5 giây)
    - Bật chế độ tương thích trên thiết bị cũ (tắt backdrop-filter, dùng background solid, giảm animation)
    - Tải Google Fonts với `media="print" onload="this.media='all'"` để không block rendering
    - Fallback font stack: `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`
    - Fallback `requestAnimationFrame` → `setTimeout(fn, 16)`
    - _Requirements: 2.3, 2.8, 3.4, 4.4, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.5, 11.5, 11.6, 11.7_

  - [x] 16.2 Viết property test cho chế độ nhìn xa ẩn widget
    - **Property 17: Chế độ nhìn xa ẩn widget không thiết yếu**
    - Test applySettings() với clockOnlyMode=true ẩn lịch, tài chính, tin tức, ca dao, AQI
    - **Validates: Requirements 9.2, 9.3**

- [x] 17. Cập nhật index.html — Tích hợp tất cả module
  - [x] 17.1 Refactor `public/index.html`
    - Xóa toàn bộ CSS inline, thay bằng `<link rel="stylesheet" href="css/styles.css">`
    - Xóa toàn bộ JavaScript inline
    - Thêm các thẻ `<script>` theo đúng thứ tự dependency: amlich.js → utils.js → clock.js → calendar.js → weather.js → finance.js → news.js → slideshow.js → disaster.js → quotes.js → settings.js → app.js
    - Cập nhật HTML structure cho các widget mới: dự báo 3 ngày, vạn niên, vàng SJC, multi-source news
    - Thêm HTML cho loading states, error states, offline indicator
    - Thêm HTML cho sections cài đặt mới
    - Đảm bảo không có nội dung bị cắt (overflow) trên 320px-1920px
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.7, 4.5, 4.6_

- [x] 18. Checkpoint cuối — Đảm bảo tất cả tests pass
  - Chạy toàn bộ test suite (unit tests + property tests). Đảm bảo tất cả tests pass. Hỏi người dùng nếu có thắc mắc.

## Ghi chú

- Các task đánh dấu `*` là tùy chọn và có thể bỏ qua để triển khai MVP nhanh hơn
- Mỗi task tham chiếu đến requirements cụ thể để đảm bảo truy vết
- Checkpoints đảm bảo kiểm tra tăng dần sau mỗi nhóm module
- Property tests kiểm tra tính đúng đắn phổ quát, unit tests kiểm tra ví dụ cụ thể và edge cases
- Code production dùng ES5, code test dùng ES6+ (chạy trên Node.js)
