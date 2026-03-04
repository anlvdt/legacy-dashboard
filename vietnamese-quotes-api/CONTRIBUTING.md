# Hướng Dẫn Đóng Góp / Contributing Guide

Cảm ơn bạn quan tâm đến việc đóng góp cho **Vietnamese Quotes API**! 🎉

## Cách thêm quotes mới

### 1. Fork repo và tạo branch

```bash
git fork
git checkout -b add-quotes-[category]
```

### 2. Thêm quotes vào file category tương ứng

Mở file trong `api/v1/categories/[category].json` và thêm entry mới:

```json
{
    "id": 167,
    "text": "Nội dung câu ca dao / tục ngữ / danh ngôn",
    "author": "Tác giả hoặc thể loại (Ca dao / Tục ngữ / Tên người)",
    "category": "tên-category",
    "source": "Nguồn gốc rõ ràng — ghi rõ tài liệu, năm, bối cảnh"
}
```

### 3. Yêu cầu bắt buộc ⚠️

- **`source` PHẢI có** — Mỗi câu phải ghi rõ nguồn gốc:
  - Ca dao/tục ngữ dân gian: `"Ca dao Việt Nam — Truyền khẩu dân gian"`
  - Có nguồn cụ thể: `"Nguyễn Trãi — Bình Ngô đại cáo, 1428"`
  - Sách tham khảo: `"Tục ngữ phong dao (Nguyễn Văn Ngọc, 1928)"`
- **`id` phải duy nhất** — Kiểm tra ID chưa tồn tại
- **Không trùng lặp** — Kiểm tra câu chưa có trong collection
- **UTF-8** — File phải lưu dạng UTF-8

### 4. Chạy build + validate

```bash
node scripts/build.js
```

Script sẽ tự động kiểm tra schema. Nếu có lỗi sẽ báo cụ thể.

### 5. Tạo Pull Request

- Mô tả rõ số lượng câu thêm mới
- Ghi category nào
- Liệt kê nguồn tham khảo

## Categories hiện có

| ID | Mô tả |
|---|---|
| `gia-dinh` | Gia đình, cha mẹ, anh em |
| `hoc-tap` | Học hành, tri thức |
| `dao-duc` | Đạo đức, lối sống |
| `mua-vu` | Mùa vụ, nông nghiệp, thời tiết |
| `cuoc-song` | Cuộc sống, kinh nghiệm |
| `tinh-yeu` | Tình yêu, hôn nhân |
| `truyen-cam-hung` | Câu nói truyền cảm hứng từ danh nhân |
| `lich-su` | Câu nói lịch sử Việt Nam |

## Đề xuất category mới?

Mở Issue trên GitHub để thảo luận trước khi tạo category mới.

## Nguồn tham khảo gợi ý

- **Tục ngữ phong dao** — Nguyễn Văn Ngọc (1928)
- **Đại Việt sử ký toàn thư** — Ngô Sĩ Liên
- **Hoàng Lê nhất thống chí** — Ngô gia văn phái
- **Gia huấn ca** — Nguyễn Trãi
- **Kho tàng ca dao người Việt** — Nguyễn Xuân Kính (NXB Văn hóa Thông tin)
- **Từ điển thành ngữ và tục ngữ Việt Nam** — Nguyễn Lân (NXB Văn học)
