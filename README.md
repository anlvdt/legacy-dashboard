# Legacy Frame - Biến Thiết Bị Cũ Thành Khung Ảnh Thông Minh

Bạn có một chiếc máy tính bảng hoặc điện thoại cũ không còn dùng đến? Đừng vội bỏ đi! **Legacy Frame** là một ứng dụng web gọn nhẹ, được thiết kế để "hồi sinh" những thiết bị này, biến chúng thành một khung ảnh kỹ thuật số đa chức năng, sang trọng và hữu ích cho gia đình hoặc cửa hàng của bạn.

Dự án này được viết bằng HTML, CSS và JavaScript thuần túy, không phụ thuộc vào bất kỳ thư viện nào, đảm bảo hiệu suất mượt mà ngay cả trên các thiết bị có cấu hình yếu nhất.

**➡️ [Xem Demo Trực Tuyến](https://legacyframe.netlify.app/) ⬅️**

### ✨ Các Tính Năng Nổi Bật

*   **⏰ Đồng Hồ & Lịch Đa Năng:**
    *   Hiển thị đồng hồ số với cỡ chữ lớn, dễ nhìn.
    *   Tích hợp lịch Âm - Dương đầy đủ, tự động cập nhật thông tin Can Chi cho ngày, tháng, năm.
    *   Thông báo các ngày đặc biệt trong tháng Âm lịch như Mùng 1 và Ngày Rằm.

*   **🌦️ Thời Tiết Thông Minh:**
    *   Tự động xác định vị trí của bạn và hiển thị thông tin thời tiết hiện tại (nhiệt độ, biểu tượng, mô tả).
    *   *(Lưu ý: Tính năng này sẽ tự động bị vô hiệu hóa trên các thiết bị chạy iOS 9 trở về trước do hạn chế bảo mật của hệ điều hành).*

*   **🖼️ Trình Chiếu Ảnh Linh Hoạt:**
    *   **Ảnh Online:** Lấy ảnh nền ngẫu nhiên, chất lượng cao từ dịch vụ Picsum Photos.
    *   **Ảnh Cá Nhân:** Dễ dàng tùy chỉnh để trình chiếu album ảnh của riêng bạn thông qua một file cấu hình đơn giản trên GitHub Gist.

*   **🏪 Hữu Ích Cho Cửa Hàng:**
    *   Hiển thị thông tin cửa hàng, địa chỉ và mã QR Code để khách hàng tiện theo dõi hoặc thanh toán.

*   **⚙️ Tùy Biến Mạnh Mẽ:**
    *   **Chế độ nhìn xa (Clock-Only):** Phóng to đồng hồ lên tối đa, lý tưởng khi đặt thiết bị ở xa.
    *   **Ẩn/Hiện các thành phần:** Toàn quyền kiểm soát việc hiển thị Lịch, Thời tiết, Ngày tháng, Thông tin Shop, Mã QR...
    *   Chế độ toàn màn hình, tiết kiệm điện và nhiều cài đặt hữu ích khác.

---

## 🚀 Cách Triển Khai Lên Internet

Để chia sẻ ứng dụng của bạn với người khác một cách dễ dàng, bạn nên đưa nó lên mạng. Dưới đây là hướng dẫn chi tiết sử dụng GitHub và Netlify.

### Bước 1: Tạo Kho Chứa (Repository) trên GitHub

1.  **Đăng nhập** vào tài khoản [GitHub](https://github.com/) của bạn.
2.  Nhấn vào dấu `+` ở góc trên cùng bên phải và chọn **New repository**.
3.  **Đặt tên cho kho chứa:** Ví dụ: `legacy-frame`.
4.  Chọn **Public** để mọi người có thể truy cập.
5.  **Không** tick vào ô "Add a README file".
6.  Nhấn nút **Create repository**.

### Bước 2: Tải Mã Nguồn Lên GitHub

1.  Trong trang kho chứa bạn vừa tạo, nhấn vào link **uploading an existing file**.
2.  Kéo file `index.html` của bạn vào khu vực tải lên.
3.  Chờ file được tải lên xong, sau đó nhấn nút **Commit changes**.

### Bước 3: Kết Nối và Triển Khai với Netlify (Khuyên dùng)

Netlify rất mạnh mẽ và sẽ tự động cập nhật trang web mỗi khi bạn thay đổi mã nguồn trên GitHub.

1.  **Đăng ký Netlify:**
    *   Truy cập [Netlify](https://www.netlify.com/) và chọn **Sign up**.
    *   Cách dễ nhất là đăng ký bằng tài khoản GitHub của bạn.

2.  **Tạo một trang web mới:**
    *   Sau khi đăng nhập, trong trang tổng quan (dashboard), nhấn vào **Add new site** -> **Import an existing project**.

3.  **Kết nối với GitHub:**
    *   Chọn **GitHub** làm nhà cung cấp. Netlify sẽ yêu cầu bạn cấp quyền truy cập vào tài khoản GitHub của mình.

4.  **Chọn kho chứa:**
    *   Tìm và chọn kho chứa `legacy-frame` (hoặc tên bạn đã đặt) từ danh sách.

5.  **Cấu hình triển khai:**
    *   Netlify sẽ hiển thị trang cài đặt. Vì đây là một dự án HTML tĩnh đơn giản, bạn **không cần thay đổi bất cứ thứ gì**.
    *   Nhấn nút **Deploy site**.

6.  **Hoàn tất!**
    *   Netlify sẽ mất khoảng một phút để triển khai trang web của bạn.
    *   Sau khi hoàn tất, Netlify sẽ cung cấp cho bạn một đường link công khai.
    *   **Để đổi tên:** Vào **Site settings** -> **Change site name** để có một đường link đẹp hơn, ví dụ: `https://khung-anh-so.netlify.app`.

Bây giờ bạn có thể chia sẻ đường link Netlify này cho bất kỳ ai!

---

## 📖 Hướng Dẫn Sử Dụng

### Giao Diện Chính

*   **Cột bên trái:** Hiển thị thông tin chính bao gồm Đồng hồ, Ngày tháng Âm/Dương và Lịch.
*   **Cột bên phải:** Hiển thị thông tin Shop và Mã QR.

### Bảng Cài Đặt

Nhấn vào **biểu tượng ba gạch ngang (☰)** ở góc trên cùng bên phải màn hình để mở bảng điều khiển và tùy chỉnh các tính năng theo ý muốn.

---

## 🛠️ Hướng Dẫn Tùy Chỉnh Nâng Cao

Bạn có thể cá nhân hóa hoàn toàn phần hình ảnh và thông tin QR Code bằng cách sử dụng dịch vụ miễn phí [GitHub Gist](https://gist.github.com/).

### 1. Tùy Chỉnh Danh Sách Ảnh Cá Nhân

1.  **Tạo Gist:**
    *   Truy cập [GitHub Gist](https://gist.github.com/).
    *   Đặt tên file là `slideshow_images.json`.
    *   Dán nội dung sau vào và thay thế bằng các URL ảnh của bạn:
        ```json
        [
          "https://images.unsplash.com/photo-1542051841857-5f90071e7989",
          "https://images.unsplash.com/photo-1528181304800-259b08848526"
        ]
        ```
    *   Nhấn vào nút `Create secret gist`.

2.  **Lấy URL "Raw":**
    *   Sau khi tạo xong, nhấn vào nút `Raw` và sao chép đường dẫn (URL) trên thanh địa chỉ.

3.  **Cập nhật mã nguồn:**
    *   Mở file `index.html`, tìm đến biến `REMOTE_IMAGE_MANIFEST_URL` và dán URL "Raw" bạn vừa sao chép vào đó.

### 2. Tùy Chỉnh Thông Tin Shop & Mã QR

1.  **Tạo Gist:**
    *   Tạo một Gist mới với tên file là `config.json`.
    *   Dán nội dung sau và thay đổi thông tin theo ý bạn:
        ```json
        {
          "qrImageUrl": "URL_DEN_ANH_MA_QR_CUA_BAN",
          "shopName": "Tên Cửa Hàng Của Bạn",
          "shopAddress": "Địa chỉ cửa hàng"
        }
        ```

2.  **Lấy URL "Raw"** và **Cập nhật mã nguồn** tương tự như bước trên, nhưng lần này bạn sẽ thay thế URL cho biến `REMOTE_CONFIG_URL`.

*(Lưu ý: Sau khi thay đổi mã nguồn `index.html`, bạn cần tải lại file này lên GitHub để Netlify tự động cập nhật phiên bản mới).*

### 💡 Mẹo: Tích Hợp Mã QR Động Với VietQR QuickLink

Để biến mã QR thành một công cụ thanh toán chuyên nghiệp, bạn có thể sử dụng dịch vụ **QuickLink** miễn phí của VietQR.

1.  Truy cập trang tạo QuickLink của VietQR tại: **[https://my.vietqr.io/](https://my.vietqr.io/)**
2.  Điền đầy đủ thông tin: Ngân hàng, Số tài khoản, Tên chủ tài khoản.
3.  Sau khi tạo xong, sao chép lại đường link **QuickLink** được cung cấp. Link này có dạng `https://my.vietqr.io/BANK-ID/ACCOUNT-NO/ACCOUNT-NAME`.
4.  Mở file Gist `config.json` của bạn và dán đường link này vào trường `qrImageUrl`. File của bạn sẽ trông giống như sau:
    ```json
    {
      "qrImageUrl": "https://my.vietqr.io/MB/0123456789/NGUYEN VAN A",
      "shopName": "Tên Cửa Hàng Của Bạn",
      "shopAddress": "Địa chỉ cửa hàng"
    }
    ```
5.  Lưu lại Gist. Ứng dụng sẽ tự động lấy link này và hiển thị mã QR tương ứng. Khách hàng chỉ cần quét mã là có thể mở ứng dụng ngân hàng và chuyển khoản ngay lập tức!

---

## 🙏 Lời Cảm Ơn:

*   **Ý tưởng & khởi xướng dự án:** **ẨN LÊ** từ **LAPTOP LÊ ẨN**.
*   **Hỗ trợ viết và hoàn thiện mã nguồn:** **Gemini** (Google AI).
*   **Thuật toán chuyển đổi Âm lịch:** Dựa trên thuật toán chính xác và đáng tin cậy của tác giả **Hồ Ngọc Đức**.

---

## 📱 Khả Năng Tương Thích

*   Ứng dụng được tối ưu để hoạt động trên hầu hết các trình duyệt hiện đại và cả các trình duyệt cũ.
*   **Lưu ý quan trọng cho iOS 9 trở về trước:** Do hạn chế về công nghệ bảo mật cũ, các tính năng yêu cầu kết nối mạng tới các dịch vụ mới như **Thời tiết** và **Ảnh online (Picsum Photos)** sẽ không hoạt động. Ứng dụng sẽ tự động phát hiện và ẩn các tính năng này để đảm bảo trải nghiệm ổn định. Bạn vẫn có thể sử dụng chế độ "Ảnh cá nhân" một cách bình thường.
