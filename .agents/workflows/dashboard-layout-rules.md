---
description: Nguyên tắc thiết kế layout cho Legacy Frame Dashboard — PHẢI tuân thủ khi sửa CSS/HTML
---

# Nguyên Tắc Thiết Kế Layout — Legacy Frame Dashboard

## ⚠️ NGUYÊN TẮC BẤT KHẢ XÂM PHẠM

### 1. Dashboard hiển thị TẤT CẢ trong 1 màn hình — KHÔNG BAO GIỜ cuộn

Dashboard là khung ảnh kỹ thuật số / màn hình treo tường. Người dùng **nhìn một cái thấy tất cả**.

- ❌ **TUYỆT ĐỐI KHÔNG** dùng `overflow-y: auto` hoặc `overflow-y: scroll` trên `.content-wrapper`
- ❌ **TUYỆT ĐỐI KHÔNG** để nội dung vượt quá viewport rồi yêu cầu người dùng cuộn
- ✅ Nếu nội dung không vừa → **thu nhỏ** widget, **giảm padding/margin/font**, hoặc **ẩn phần phụ**

### 2. Widget KHÔNG BAO GIỜ chồng chéo lên các thanh cố định

Các thanh cố định ở đáy viewport (theo thứ tự từ dưới lên):
- **FX Ticker**: `position: fixed; bottom: 0; height: 3.2vmin`
- **Radio Bar**: `position: fixed; bottom: 3.2vmin; height: ~7vmin`
- → Tổng vùng cấm: **~10.2vmin** từ đáy viewport

**Widget cuối cùng phải có gap dương với radio bar:**
```
lastWidgetBottom < radioBarTop   (gap >= 0)
```

### 3. Không ép `height` cố định lên `.content-wrapper`

- ❌ `height: calc(100vh - Xvmin)` → sẽ gây flex co top-row → chồng chéo clock/date/weather
- ✅ Sử dụng `padding-bottom` để đẩy nội dung lên, kết hợp `overflow: hidden`

### 4. Top-row và Mid-row KHÔNG BAO GIỜ bị co lại

```css
body.lite-mode #dashboard-top-row { flex-shrink: 0 !important; }
body.lite-mode #dashboard-mid-row { flex-shrink: 0 !important; }
```

Chỉ bottom-row được phép co (`flex-shrink: 1`).

---

## Cấu Trúc Layout 3 Hàng

```
┌─────────────────────────────────────────────┐
│                  TOP ROW                     │  flex-shrink: 0
│      Clock + Date/Weather                    │
├─────────────────────────────────────────────┤
│                  MID ROW                     │  flex-shrink: 0
│           Ca dao / Tục ngữ                   │
├─────────────────────────────────────────────┤
│                BOTTOM ROW                    │  flex-shrink: 1
│  [Vàng][Xăng][Lịch][XS][Cà phê][Tin tức]   │  1 hàng, nowrap
├─────────────────────────────────────────────┤
│  ██████████ RADIO BAR ██████████            │  position: fixed
│  ████████████ FX TICKER █████████████████   │  position: fixed
└─────────────────────────────────────────────┘
```

---

## Lite Mode — Chiến Lược "Compact, Không Cuộn"

Lite mode dành cho thiết bị cũ (iPad Mini 1, 1024×768). Nguyên tắc:

### Bottom Row: 1 Hàng Duy Nhất
```css
body.lite-mode #dashboard-bottom-row {
    flex-wrap: nowrap;       /* KHÔNG wrap xuống dòng 2 */
    align-items: flex-start; /* KHÔNG stretch theo block cao nhất */
}

body.lite-mode #dashboard-bottom-row .info-block {
    flex: 1 1 0;            /* Co giãn đều, basis = 0 */
    max-height: 40vh;       /* Giới hạn chiều cao */
    overflow: hidden;       /* Cắt nội dung thừa */
}
```

### Compact Spacing
- Clock margin: `0.3vmin`
- Date/Weather padding: `0.5vmin 1.5vmin`
- Widget padding: `0.6vmin 0.8vmin`
- Widget header font: `1.3vmin`

### Ẩn Phần Phụ
Trên màn hình nhỏ, ẩn dữ liệu phụ:
```css
body.lite-mode .agri-regions,
body.lite-mode .agri-row-world {
    display: none !important;
}
```

---

## Quy Tắc Khi Sửa Đổi

### Trước khi sửa CSS layout:
1. **Kiểm tra ở 1024×768** (iPad Mini 1) — viewport thực tế ~1024×681 do browser chrome
2. **Đo gap** giữa widget cuối và radio bar — phải dương
3. **Không scroll** — tất cả phải hiện trong 1 viewport

### Khi thêm widget mới:
1. Widget mới phải vừa vặn trong bottom-row 1 hàng
2. Nếu không đủ chỗ → cân nhắc thay thế widget cũ hoặc gộp dữ liệu
3. Kiểm tra `flex: 1 1 0` hoạt động đúng với widget mới

### Khi thêm nội dung vào widget hiện tại:
1. Nội dung mới sẽ bị cắt bởi `overflow: hidden` + `max-height: 40vh` trên lite mode
2. Dữ liệu phụ nên ẩn trong lite mode bằng `display: none !important`
3. Kiểm tra widget không bị kéo dài quá cao

---

## Kiểm Tra Nhanh Qua Console

```javascript
// Chạy trên browser ở 1024x768, lite mode bật
var blocks = document.querySelectorAll('#dashboard-bottom-row .info-block');
var rb = document.querySelector('.radio-bar');
var rbTop = Math.round(rb.getBoundingClientRect().top);
var maxBottom = 0;
for (var i = 0; i < blocks.length; i++) {
    var b = Math.round(blocks[i].getBoundingClientRect().bottom);
    if (b > maxBottom) maxBottom = b;
}
console.log('Widget bottom:', maxBottom, 'Radio top:', rbTop, 'Gap:', rbTop - maxBottom);
// Gap PHẢI >= 0
```

---

## Lịch Sử Các Sai Lầm (Tránh Lặp Lại)

| Sai lầm | Hậu quả | Fix đúng |
|---------|---------|----------|
| `overflow-y: auto` trên content-wrapper | Dashboard phải cuộn → mất ý nghĩa | `overflow: hidden` + compact widget |
| `height: calc(100vh - X)` trên content-wrapper | Flex co top-row → clock/date chồng chéo | Dùng `padding-bottom` thay vì ép height |
| `flex-wrap: wrap` trên bottom-row (lite mode) | Widget xuống 2 dòng → tràn radio bar | `flex-wrap: nowrap` + `flex: 1 1 0` |
| `align-items: stretch` trên bottom-row | Block cao nhất kéo tất cả → tràn | `align-items: flex-start` + `max-height` |
| Chỉ thêm `padding-bottom` (không compact) | Padding không đủ vì content vẫn quá cao | Compact widget + padding + ẩn phần phụ |
