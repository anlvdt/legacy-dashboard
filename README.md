# Legacy Frame - Biến Thiết Bị Cũ Thành Khung Ảnh Thông Minh

Bạn có một chiếc máy tính bảng hoặc điện thoại cũ không còn dùng đến? Đừng vội bỏ đi! **Legacy Frame** là một ứng dụng web gọn nhẹ, được thiết kế để "hồi sinh" những thiết bị này, biến chúng thành một khung ảnh kỹ thuật số đa chức năng, sang trọng và hữu ích cho gia đình hoặc cửa hàng của bạn.

**Demo:** [https://legacyframe.netlify.app/](https://legacyframe.netlify.app/)

---

## Giới thiệu / Introduction

**VI:** Dự án này được viết bằng HTML, CSS và JavaScript thuần túy (ES5), không phụ thuộc vào bất kỳ thư viện hay framework nào, đảm bảo hiệu suất mượt mà ngay cả trên các thiết bị có cấu hình yếu nhất như iOS 9, Android 4.x, Chrome < 40.

**EN:** This project is written in pure HTML, CSS and ES5 JavaScript, with zero dependencies, ensuring smooth performance even on the oldest devices (iOS 9, Android 4.x, Chrome < 40). Transform your old tablets and phones into a smart digital photo frame.

---

## Tính năng / Features

### Đồng Hồ và Lịch / Clock & Calendar
- Hiển thị đồng hồ số với cỡ chữ lớn, dễ nhìn (có/không giây)
- Tích hợp lịch Âm - Dương đầy đủ, tự động cập nhật thông tin Can Chi
- Thông báo các ngày lễ, ngày đặc biệt trong tháng Âm lịch
- Đếm ngược đến ngày lễ gần nhất

### Thời Tiết / Weather
- Tự động xác định vị trí qua IP và hiển thị thời tiết hiện tại
- Dự báo 24 giờ theo từng 3 giờ (qua Open-Meteo API)
- Chỉ số chất lượng không khí (AQI) với phân loại màu
- Chỉ số UV với cảnh báo mức độ
- Giờ mặt trời mọc / lặn

### Trình Chiếu Ảnh / Slideshow
- **Ảnh Online:** Lấy ảnh nền ngẫu nhiên, chất lượng cao từ Picsum Photos
- **Ảnh Cá Nhân:** Tùy chỉnh album ảnh riêng thông qua GitHub Gist
- Tự động cache ảnh cho chế độ offline
- Tùy chỉnh thời gian chuyển ảnh (10s / 12s / 15s / 30s / 60s)

### Tài Chính & Giá Cả / Finance & Prices
- Giá vàng SJC, vàng thế giới, tỷ giá USD (Vietcombank)
- Giá xăng dầu Petrolimex (RON 95, E5, DO) với biến động giá
- Giá nông sản: cà phê Robusta (Tây Nguyên + ICE London), Arabica, hồ tiêu, gạo
- Ticker tỷ giá ngoại tệ chạy ngang (USD, EUR, JPY, GBP, CNY, KRW, THB, AUD, SGD, TWD)
- Kết quả xổ số 3 miền (Bắc, Trung, Nam)

### Tin Tức & Giọng Nói / News & TTS
- Tin tức đa nguồn (VnExpress, Thanh Niên, Dân Trí, Tuổi Trẻ)
- Đọc tin bằng giọng nói tiếng Việt (Microsoft Edge TTS) — giọng Nam/Nữ
- Hẹn giờ đọc tin tự động buổi sáng
- Lọc tin nhạy cảm tự động

### Cảnh Báo Thiên Tai / Disaster Alerts
- Cảnh báo thiên tai Đông Nam Á thời gian thực (GDACS)
- Banner đỏ cho cảnh báo mức Red
- Lọc theo khu vực biển Đông

### Radio Cải Lương / Traditional Music Radio
- Nghe cải lương xưa qua YouTube (không cần cài app)
- Điều khiển phát/dừng, chuyển bài, âm lượng, thanh tiến trình

### Ca Dao, Tục Ngữ / Vietnamese Proverbs
- 500+ câu ca dao, tục ngữ, danh ngôn Việt Nam chọn lọc
- Tự động đổi câu mỗi 60 giây

### Tùy Biến / Customization
- Chế độ nhìn xa (Clock-Only): Phóng to đồng hồ, tùy chọn hiện ngày/thời tiết
- Chế độ nhẹ (Lite Mode): Tắt hiệu ứng nặng cho thiết bị cũ
- Chế độ tiết kiệm điện: Nền đen, tắt slideshow
- Ẩn/Hiện từng thành phần theo ý muốn (iOS-style toggle)
- Chế độ toàn màn hình
- Xuất/Nhập cài đặt qua clipboard
- Tự động phát hiện và tối ưu cho thiết bị cũ

---

## Tương thích thiết bị / Device Compatibility

| Thiết bị | Phiên bản tối thiểu |
|----------|---------------------|
| iOS (Safari) | iOS 9.x+ |
| Android (Chrome) | Android 4.x+ (Chrome < 40) |
| Desktop Chrome | Chrome 30+ |
| Desktop Firefox | Firefox 30+ |

**Nguyên tắc kỹ thuật:**
- Toàn bộ JavaScript client-side viết bằng ES5 (`var`, `function`, không `let/const/arrow/template literals`)
- CSS có đầy đủ `-webkit-` prefix cho flexbox, animation, backdrop-filter
- `backdrop-filter` wrap trong `@supports`, tự động tắt trên thiết bị cũ (Lite Mode)
- Không dùng CSS custom properties (`var(--...)`)
- Không dùng ES6+ Array methods (`.includes()`, `.find()`, `.startsWith()`, v.v.)

---

## Kiến trúc / Architecture

```
public/
├── app.html            # Giao diện chính (3-row layout)
├── css/styles.css      # Stylesheet duy nhất (responsive, -webkit- prefixed)
├── js/
│   ├── app.js          # Entry point, khởi tạo tất cả module
│   ├── clock.js        # Đồng hồ số
│   ├── calendar.js     # Lịch Âm-Dương
│   ├── weather.js      # Thời tiết, dự báo, AQI, UV
│   ├── slideshow.js    # Trình chiếu ảnh nền
│   ├── finance.js      # Giá vàng, tỷ giá
│   ├── kqxs_fuel.js    # Xổ số, xăng dầu
│   ├── agriculture.js  # Giá nông sản
│   ├── fxticker.js     # Ticker tỷ giá (CSS animation)
│   ├── news.js         # Tin tức đa nguồn
│   ├── tts.js          # Text-to-Speech
│   ├── disaster.js     # Cảnh báo thiên tai
│   ├── radio.js        # Radio cải lương (YouTube)
│   ├── quotes.js       # Ca dao, tục ngữ
│   ├── quotes-data.js  # Dữ liệu 500+ câu
│   ├── settings.js     # Bảng cài đặt
│   └── utils.js        # Cache, XHR, legacy detection
├── amlich-es5.js       # Thuật toán Âm lịch (Hồ Ngọc Đức)
└── bg/                 # Ảnh nền fallback offline

functions/              # Netlify Functions (backend proxy)
├── weather.js          # Proxy thời tiết hiện tại
├── weather-forecast.js # Proxy dự báo 24h
├── weather-aqi.js      # Proxy AQI
├── weather-uv.js       # Proxy UV Index
├── proxy.js            # Proxy RSS tin tức (whitelist domain)
├── agriculture.js      # Proxy giá nông sản
├── fuel.js             # Proxy giá xăng dầu
├── kqxs.js             # Proxy xổ số
├── tts-proxy.js        # Proxy TTS (rate limited)
├── image-proxy.js      # Proxy ảnh
└── youtube-search.js   # Proxy tìm kiếm YouTube
```

**Namespace:** Tất cả module client-side dùng global namespace `LF` (VD: `LF.weather`, `LF.clock`, `LF.settings`).

**Caching:** `LF.utils.cacheGet/cacheSet` lưu dữ liệu API vào `localStorage` với TTL, tự động hiển thị dữ liệu cũ khi offline.

**Offline:** Tự động phát hiện offline/online, hiển thị indicator, stagger refresh khi có mạng trở lại.

---

## Cách sử dụng / How to Use

1. Mở ứng dụng trong trình duyệt / Open the app in browser
2. Nhấn biểu tượng ⚙️ để mở bảng cài đặt / Click gear icon to open settings
3. Tùy chỉnh các thành phần theo nhu cầu / Customize components as needed
4. Để thiết bị ở vị trí mong muốn / Place device in desired location

---

## Triển khai / Deployment

### GitHub + Netlify (Khuyên dùng / Recommended)

```bash
# Clone repository
git clone https://github.com/anlvdt/legacy-dashboard.git

# Cài dependencies (chỉ cần cho dev/test)
npm install

# Chạy test
npx vitest --run

# Upload to your GitHub
# Connect to Netlify for automatic deployment
```

Netlify sẽ tự động build và deploy khi push code. Các API route được cấu hình trong `netlify.toml`.

---

## Tech Stack

- HTML5, CSS3, JavaScript ES5 (Vanilla — zero dependencies)
- Thuật toán Âm lịch của Hồ Ngọc Đức
- Picsum Photos API (ảnh nền)
- Open-Meteo API (thời tiết, dự báo, AQI)
- currentuvindex.com (UV Index)
- er-api.com (tỷ giá), gold-api.com (giá vàng)
- GDACS (cảnh báo thiên tai)
- Microsoft Edge TTS (đọc tin giọng nói)
- Netlify Functions (backend proxy, rate limiting)
- Vitest (testing)

---

## Tác giả

**Le Van An** (Vietnam IT)

[![GitHub](https://img.shields.io/badge/GitHub-anlvdt-181717?style=for-the-badge&logo=github)](https://github.com/anlvdt)

## Ủng hộ dự án

Nếu bạn thấy dự án hữu ích, hãy cân nhắc ủng hộ tác giả.

### Chuyển khoản

| Phương thức | Số tài khoản | Chủ tài khoản |
|------------|-------------|---------------|
| MB Bank | `0360126996868` | LE VAN AN |
| Momo | `0976896621` | LE VAN AN |

### Shopee Affiliate

Mình làm Affiliate Shopee, nếu thấy sản phẩm hữu ích hãy ủng hộ mình một click nhé. Chỉ cần click không cần mua cũng được!

[![Shopee](https://img.shields.io/badge/Shopee-EE4D2D?style=for-the-badge&logo=shopee&logoColor=white)](https://s.shopee.vn/7AYWh5NzOB)

**[Xem sản phẩm trên Shopee](https://s.shopee.vn/7AYWh5NzOB)** — Xin cảm ơn!

### Ủng hộ khác

- Star repo trên GitHub
- Chia sẻ dự án cho bạn bè, đồng nghiệp
- Báo bug hoặc đề xuất tính năng mới qua Issues
- Đóng góp code qua Pull Requests

---

## License

MIT License — Copyright (c) 2026 Le An (Vietnam IT)
