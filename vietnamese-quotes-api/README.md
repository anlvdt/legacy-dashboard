# 🇻🇳 Vietnamese Quotes API

**Bộ sưu tập ca dao, tục ngữ, danh ngôn Việt Nam** — Static JSON API miễn phí, mã nguồn mở.

Free, open-source static JSON API for Vietnamese proverbs, folk sayings, and inspirational quotes.

---

## 📊 Thống kê / Stats

| Category | Tiếng Việt | Count |
|---|---|---|
| `gia-dinh` | Gia đình | 20 |
| `hoc-tap` | Học tập | 20 |
| `dao-duc` | Đạo đức | 25 |
| `mua-vu` | Mùa vụ | 18 |
| `cuoc-song` | Cuộc sống | 30 |
| `tinh-yeu` | Tình yêu | 18 |
| `truyen-cam-hung` | Truyền cảm hứng | 20 |
| `lich-su` | Lịch sử | 15 |
| **Tổng cộng** | | **166** |

---

## 🔗 API Endpoints

Base URL: `https://<username>.github.io/vietnamese-quotes-api`

| Endpoint | Mô tả |
|---|---|
| `/api/v1/quotes.json` | Tất cả quotes |
| `/api/v1/categories.json` | Danh sách categories |
| `/api/v1/categories/gia-dinh.json` | Quotes về gia đình |
| `/api/v1/categories/hoc-tap.json` | Quotes về học tập |
| `/api/v1/categories/dao-duc.json` | Quotes về đạo đức |
| `/api/v1/categories/mua-vu.json` | Quotes về mùa vụ |
| `/api/v1/categories/cuoc-song.json` | Quotes về cuộc sống |
| `/api/v1/categories/tinh-yeu.json` | Quotes về tình yêu |
| `/api/v1/categories/truyen-cam-hung.json` | Quotes truyền cảm hứng |
| `/api/v1/categories/lich-su.json` | Quotes lịch sử |

---

## 📦 Schema

Mỗi quote có cấu trúc:

```json
{
    "id": 1,
    "text": "Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra.",
    "author": "Ca dao",
    "category": "gia-dinh",
    "source": "Ca dao Việt Nam — Truyền khẩu dân gian"
}
```

| Field | Type | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | number | ✅ | ID duy nhất |
| `text` | string | ✅ | Nội dung câu |
| `author` | string | ✅ | Tác giả / Thể loại |
| `category` | string | ✅ | Category ID |
| `source` | string | ✅ | **Nguồn gốc rõ ràng** |

> ⚠️ **Tất cả quotes PHẢI có nguồn gốc** (`source`) rõ ràng, ghi rõ xuất xứ tài liệu hoặc truyền thống.

---

## 🚀 Sử dụng / Usage

### JavaScript (Fetch)
```javascript
fetch('https://<username>.github.io/vietnamese-quotes-api/api/v1/quotes.json')
    .then(r => r.json())
    .then(quotes => {
        const random = quotes[Math.floor(Math.random() * quotes.length)];
        console.log(random.text + ' — ' + random.author);
    });
```

### JavaScript (Random từ 1 category)
```javascript
fetch('https://<username>.github.io/vietnamese-quotes-api/api/v1/categories/lich-su.json')
    .then(r => r.json())
    .then(quotes => {
        const random = quotes[Math.floor(Math.random() * quotes.length)];
        console.log(random.text);
        console.log('— ' + random.author);
        console.log('Nguồn: ' + random.source);
    });
```

---

## 🤝 Đóng góp / Contributing

Xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết cách đóng góp thêm câu ca dao, tục ngữ, danh ngôn.

**Yêu cầu bắt buộc:** Mỗi câu phải có `source` — nguồn gốc rõ ràng.

---

## 🛠 Build

```bash
# Gộp tất cả category thành quotes.json + categories.json
node scripts/build.js
```

---

## 📄 License

MIT License — Sử dụng tự do cho mục đích cá nhân và thương mại.

Dữ liệu ca dao, tục ngữ thuộc văn hóa dân gian Việt Nam, không có bản quyền cá nhân.
