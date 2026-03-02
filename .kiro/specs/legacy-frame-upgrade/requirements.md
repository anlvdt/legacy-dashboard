# Tài liệu Yêu cầu — Nâng cấp Legacy Frame

## Giới thiệu

Legacy Frame là ứng dụng dashboard dạng single-page HTML, được thiết kế để biến các thiết bị iOS/Android đời cũ (không còn được cập nhật) thành khung ảnh kỹ thuật số thông minh. Ứng dụng hiển thị đồng hồ, lịch âm dương Việt Nam, thời tiết, chất lượng không khí, tài chính (USD/VND, giá vàng), tin tức cuộn, cảnh báo thiên tai, ca dao/trích dẫn, và slideshow ảnh nền.

Dự án nâng cấp này nhằm: (1) audit toàn diện UI/UX/logic/spacing/responsive, (2) tối ưu cho thiết bị cũ, (3) nghiên cứu nhu cầu thông tin của người dùng Việt Nam, và (4) refactor trang chính để hiển thị đầy đủ thông tin hữu ích.

## Thuật ngữ

- **Legacy_Frame**: Ứng dụng dashboard single-page HTML chạy trên trình duyệt của thiết bị cũ
- **Thiết_Bị_Cũ**: Thiết bị iOS < 10, Android < 5, Chrome < 40 không còn nhận bản cập nhật hệ điều hành
- **Bố_Cục_Chính**: Layout hai cột chính (info-column và right-widget-column) của trang dashboard
- **Chế_Độ_Nhìn_Xa**: Chế độ hiển thị đồng hồ lớn tối ưu cho việc xem từ khoảng cách xa (clock-only mode)
- **Bảng_Cài_Đặt**: Panel settings cho phép người dùng bật/tắt các thành phần hiển thị
- **Widget_Tài_Chính**: Khối hiển thị tỷ giá USD/VND và giá vàng thế giới quy đổi VND
- **Thanh_Tin_Tức**: Thanh cuộn tin tức RSS từ các báo Việt Nam ở cuối màn hình
- **Widget_AQI**: Khối hiển thị chỉ số chất lượng không khí (Air Quality Index)
- **Lịch_Âm**: Lịch âm Việt Nam dựa trên thuật toán Hồ Ngọc Đức, hiển thị ngày âm, can chi, ngày lễ
- **Khối_Ca_Dao**: Widget hiển thị ca dao, tục ngữ, trích dẫn tiếng Việt
- **Cảnh_Báo_Thiên_Tai**: Banner cảnh báo thiên tai từ GDACS (UN)
- **Tiết_Kiệm_Điện**: Chế độ tắt ảnh nền và giảm hiệu ứng để tiết kiệm pin

## Yêu cầu

### Yêu cầu 1: Tách cấu trúc mã nguồn (Code Splitting)

**User Story:** Là nhà phát triển, tôi muốn tách file index.html (~2600 dòng) thành các module riêng biệt, để dễ bảo trì và mở rộng.

#### Tiêu chí chấp nhận

1. THE Legacy_Frame SHALL tách CSS inline thành file riêng (styles.css) và tải qua thẻ `<link>`.
2. THE Legacy_Frame SHALL tách JavaScript inline thành các file module riêng biệt theo chức năng (clock.js, calendar.js, weather.js, finance.js, news.js, settings.js, slideshow.js, disaster.js).
3. THE Legacy_Frame SHALL giữ file index.html chỉ chứa cấu trúc HTML và các thẻ tải tài nguyên.
4. WHEN tách mã nguồn xong, THE Legacy_Frame SHALL hoạt động giống hệt phiên bản hiện tại trên tất cả trình duyệt được hỗ trợ.
5. THE Legacy_Frame SHALL sử dụng cú pháp ES5 (var, function) trong tất cả file JavaScript để tương thích với Thiết_Bị_Cũ.

### Yêu cầu 2: Tối ưu hiệu năng cho thiết bị cũ

**User Story:** Là người dùng thiết bị cũ, tôi muốn ứng dụng chạy mượt mà không bị giật lag, để có thể sử dụng làm khung ảnh kỹ thuật số hàng ngày.

#### Tiêu chí chấp nhận

1. THE Legacy_Frame SHALL giới hạn số lượng DOM reflow xuống tối đa 1 lần mỗi chu kỳ cập nhật đồng hồ (1 giây).
2. THE Legacy_Frame SHALL sử dụng `requestAnimationFrame` thay vì `setInterval` cho tất cả animation (ticker tin tức, slideshow).
3. WHEN chạy trên Thiết_Bị_Cũ, THE Legacy_Frame SHALL tắt backdrop-filter, box-shadow phức tạp, và CSS animation không thiết yếu.
4. THE Legacy_Frame SHALL lazy-load các widget không hiển thị trên viewport ban đầu (AQI, tin tức, cảnh báo thiên tai).
5. WHEN chạy trên Thiết_Bị_Cũ, THE Legacy_Frame SHALL giảm kích thước ảnh nền xuống tối đa 640x480 pixel.
6. THE Legacy_Frame SHALL sử dụng `document.createDocumentFragment()` khi tạo nhiều phần tử DOM cùng lúc (lịch, ticker tin tức).
7. THE Legacy_Frame SHALL cache kết quả API (thời tiết, tài chính, tin tức) trong localStorage với thời gian hết hạn rõ ràng để giảm số lần gọi mạng.
8. WHILE ở Chế_Độ_Nhìn_Xa, THE Legacy_Frame SHALL tạm dừng tất cả interval không liên quan (slideshow, tin tức, tài chính) để giảm tải CPU.

### Yêu cầu 3: Sửa lỗi và cải thiện Responsive Layout

**User Story:** Là người dùng, tôi muốn ứng dụng hiển thị đúng trên mọi kích thước màn hình (từ điện thoại 4 inch đến tablet 10 inch), để thông tin luôn dễ đọc.

#### Tiêu chí chấp nhận

1. THE Bố_Cục_Chính SHALL chuyển từ layout hai cột sang một cột khi chiều rộng viewport nhỏ hơn 800px.
2. WHEN chiều rộng viewport nhỏ hơn 480px, THE Legacy_Frame SHALL hiển thị font đồng hồ tối thiểu 18vw để đảm bảo đọc được từ khoảng cách 1 mét.
3. THE Legacy_Frame SHALL sử dụng đơn vị `vmin` cho font-size và spacing của các widget chính để tỷ lệ nhất quán giữa landscape và portrait.
4. WHEN thiết bị xoay từ portrait sang landscape (hoặc ngược lại), THE Legacy_Frame SHALL tự động điều chỉnh layout trong vòng 300ms mà không cần reload trang.
5. THE Bảng_Cài_Đặt SHALL hiển thị toàn chiều rộng màn hình (width: 90vw) trên thiết bị có chiều rộng viewport nhỏ hơn 480px.
6. THE Thanh_Tin_Tức SHALL có chiều cao tối thiểu 44px trên thiết bị cảm ứng để đảm bảo vùng chạm đủ lớn.
7. THE Legacy_Frame SHALL đảm bảo không có nội dung bị cắt (overflow hidden) trên bất kỳ kích thước màn hình nào từ 320px đến 1920px chiều rộng.
8. WHEN ở chế độ portrait trên điện thoại, THE Widget_Tài_Chính SHALL hiển thị dạng xếp dọc (column) thay vì ngang (row) để tránh tràn nội dung.

### Yêu cầu 4: Cải thiện UI/UX và Spacing

**User Story:** Là người dùng, tôi muốn giao diện có khoảng cách đều đặn, dễ nhìn, và các thành phần được phân cấp rõ ràng, để trải nghiệm sử dụng thoải mái.

#### Tiêu chí chấp nhận

1. THE Legacy_Frame SHALL sử dụng hệ thống spacing nhất quán dựa trên bội số của 0.5vmin (0.5, 1, 1.5, 2, 2.5, 3 vmin) cho tất cả margin và padding.
2. THE Legacy_Frame SHALL đảm bảo tất cả nút bấm và vùng tương tác có kích thước tối thiểu 44x44px theo hướng dẫn Apple HIG và Material Design.
3. THE Legacy_Frame SHALL sử dụng tỷ lệ tương phản màu tối thiểu 4.5:1 giữa text và background cho tất cả nội dung đọc được (theo WCAG AA).
4. WHEN người dùng mở Bảng_Cài_Đặt, THE Bảng_Cài_Đặt SHALL hiển thị với animation mượt (opacity + translateY) trong 250ms.
5. THE Legacy_Frame SHALL nhóm các widget liên quan bằng khoảng cách và đường phân cách trực quan (ngày/thời tiết cùng nhóm, tài chính riêng nhóm, lịch riêng nhóm).
6. THE Legacy_Frame SHALL hiển thị trạng thái loading rõ ràng (skeleton hoặc text "Đang tải...") cho mỗi widget đang chờ dữ liệu từ API.
7. WHEN dữ liệu API bị lỗi, THE Legacy_Frame SHALL hiển thị thông báo lỗi ngắn gọn bằng tiếng Việt tại vị trí của widget tương ứng thay vì để trống.

### Yêu cầu 5: Mở rộng thông tin cho người dùng Việt Nam

**User Story:** Là người dùng Việt Nam, tôi muốn xem đầy đủ các thông tin hữu ích hàng ngày (lịch âm chi tiết, giờ hoàng đạo, tiết khí, ngày lễ, thông tin thực tế), để ứng dụng thực sự hữu ích trong cuộc sống.

#### Tiêu chí chấp nhận

1. THE Lịch_Âm SHALL hiển thị thông tin tiết khí (Solar Term) của ngày hiện tại bên cạnh ngày âm lịch.
2. THE Lịch_Âm SHALL hiển thị giờ hoàng đạo của ngày hiện tại dưới dạng danh sách các khung giờ tốt.
3. THE Legacy_Frame SHALL hiển thị danh sách đầy đủ các ngày lễ Việt Nam (cả dương lịch và âm lịch) bao gồm: Tết Nguyên Đán, Giỗ Tổ Hùng Vương, 30/4, 1/5, 2/9, Quốc Khánh, Trung Thu, Vu Lan, và các ngày lễ truyền thống khác.
4. THE Widget_Tài_Chính SHALL hiển thị thêm giá vàng SJC trong nước (ngoài giá vàng thế giới hiện có).
5. THE Widget_Tài_Chính SHALL hiển thị xu hướng tăng/giảm (mũi tên ▲▼) so với lần cập nhật trước cho mỗi chỉ số tài chính.
6. THE Legacy_Frame SHALL hiển thị widget dự báo thời tiết 3 ngày tới (ngoài thời tiết hiện tại) bao gồm nhiệt độ cao/thấp và mô tả ngắn.
7. THE Khối_Ca_Dao SHALL mở rộng bộ sưu tập lên tối thiểu 50 câu ca dao, tục ngữ, danh ngôn tiếng Việt, phân loại theo chủ đề (gia đình, học tập, đạo đức, mùa vụ).
8. THE Legacy_Frame SHALL hiển thị widget lịch vạn niên tóm tắt cho ngày hiện tại bao gồm: ngày can chi, tháng can chi, năm can chi, tiết khí, giờ hoàng đạo, và hướng xuất hành tốt.

### Yêu cầu 6: Cải thiện hệ thống tin tức và cảnh báo

**User Story:** Là người dùng Việt Nam, tôi muốn nhận tin tức cập nhật và cảnh báo thời tiết/thiên tai kịp thời, để nắm bắt thông tin quan trọng.

#### Tiêu chí chấp nhận

1. THE Thanh_Tin_Tức SHALL hỗ trợ hiển thị đồng thời tin từ nhiều nguồn (VnExpress, Tuổi Trẻ, Dân Trí) thay vì chỉ một nguồn tại một thời điểm.
2. WHEN người dùng chạm vào một tin tức trên Thanh_Tin_Tức, THE Legacy_Frame SHALL mở liên kết bài viết trong tab mới.
3. THE Cảnh_Báo_Thiên_Tai SHALL lọc và ưu tiên hiển thị các sự kiện ảnh hưởng đến khu vực Đông Nam Á và Việt Nam.
4. WHEN có cảnh báo thiên tai mức Red từ GDACS, THE Cảnh_Báo_Thiên_Tai SHALL hiển thị banner nổi bật với màu đỏ và icon cảnh báo.
5. THE Thanh_Tin_Tức SHALL tự động làm mới danh sách tin tức mỗi 15 phút khi ứng dụng đang hoạt động.
6. IF nguồn RSS không phản hồi trong 10 giây, THEN THE Thanh_Tin_Tức SHALL hiển thị tin tức từ cache gần nhất và thông báo "Đang dùng tin cũ".
7. THE Legacy_Frame SHALL hỗ trợ thêm nguồn tin tức từ Báo Chính Phủ và VTV News trong danh sách nguồn tin.

### Yêu cầu 7: Cải thiện hệ thống cài đặt và lưu trữ

**User Story:** Là người dùng, tôi muốn cài đặt của tôi được lưu lại đáng tin cậy và dễ dàng quản lý, để không phải cấu hình lại mỗi khi mở ứng dụng.

#### Tiêu chí chấp nhận

1. THE Bảng_Cài_Đặt SHALL nhóm các tùy chọn thành các section rõ ràng với tiêu đề: "Hiển thị", "Thành phần", "Nguồn ảnh", "Tin tức & Cảnh báo", "Hướng dẫn".
2. WHEN người dùng thay đổi bất kỳ cài đặt nào, THE Legacy_Frame SHALL lưu vào localStorage trong vòng 100ms.
3. IF localStorage không khả dụng (private browsing mode), THEN THE Legacy_Frame SHALL hiển thị thông báo "Cài đặt sẽ không được lưu trong chế độ duyệt riêng tư" và tiếp tục hoạt động với cài đặt mặc định.
4. THE Bảng_Cài_Đặt SHALL hiển thị trạng thái hiện tại (bật/tắt) của mỗi tùy chọn bằng text rõ ràng trên nút bấm.
5. WHEN người dùng nhấn "Đặt lại cài đặt", THE Legacy_Frame SHALL hiển thị dialog xác nhận trước khi xóa tất cả cài đặt đã lưu.
6. THE Legacy_Frame SHALL hỗ trợ xuất/nhập cài đặt dưới dạng chuỗi text (base64) để người dùng có thể sao chép cài đặt sang thiết bị khác.

### Yêu cầu 8: Tối ưu quản lý ảnh nền và slideshow

**User Story:** Là người dùng, tôi muốn slideshow ảnh nền hoạt động mượt mà và tiết kiệm băng thông, để ứng dụng không bị chậm khi tải ảnh.

#### Tiêu chí chấp nhận

1. THE Legacy_Frame SHALL preload ảnh tiếp theo trong khi đang hiển thị ảnh hiện tại để chuyển ảnh không bị giật.
2. WHEN ảnh không tải được sau 10 giây, THE Legacy_Frame SHALL bỏ qua ảnh đó và chuyển sang ảnh tiếp theo.
3. THE Legacy_Frame SHALL hiển thị hiệu ứng chuyển ảnh fade (opacity transition) trong 1.5 giây.
4. WHILE ở chế độ Tiết_Kiệm_Điện, THE Legacy_Frame SHALL tắt hoàn toàn slideshow và hiển thị nền đen.
5. THE Legacy_Frame SHALL cho phép người dùng cấu hình thời gian chuyển ảnh (10s, 15s, 30s, 60s) qua Bảng_Cài_Đặt.
6. WHEN sử dụng nguồn ảnh online (Picsum), THE Legacy_Frame SHALL chọn kích thước ảnh phù hợp với độ phân giải màn hình thiết bị (640x480 cho mobile, 1280x720 cho tablet, 1920x1080 cho desktop).

### Yêu cầu 9: Cải thiện Chế độ nhìn xa (Clock-Only Mode)

**User Story:** Là người dùng đặt thiết bị ở xa (trên kệ, treo tường), tôi muốn chế độ nhìn xa hiển thị thông tin thiết yếu với font cực lớn, để đọc được từ khoảng cách 3-5 mét.

#### Tiêu chí chấp nhận

1. WHILE ở Chế_Độ_Nhìn_Xa, THE Legacy_Frame SHALL hiển thị đồng hồ với font-size tối thiểu 25vmin trên landscape và 30vw trên portrait.
2. WHILE ở Chế_Độ_Nhìn_Xa, THE Legacy_Frame SHALL cho phép hiển thị tùy chọn: ngày dương lịch, ngày âm lịch, thời tiết hiện tại, và nhiệt độ.
3. WHILE ở Chế_Độ_Nhìn_Xa, THE Legacy_Frame SHALL ẩn tất cả widget không thiết yếu (lịch, tài chính, tin tức, ca dao, AQI).
4. WHILE ở Chế_Độ_Nhìn_Xa và chế độ Tiết_Kiệm_Điện, THE Legacy_Frame SHALL hiển thị đồng hồ màu trắng trên nền đen thuần, không có hiệu ứng glow hay shadow.
5. WHEN người dùng chạm vào màn hình trong Chế_Độ_Nhìn_Xa, THE Legacy_Frame SHALL hiển thị tạm thời Bảng_Cài_Đặt trong 5 giây rồi tự động ẩn.

### Yêu cầu 10: Xử lý lỗi mạng và offline

**User Story:** Là người dùng thiết bị cũ với kết nối mạng không ổn định, tôi muốn ứng dụng vẫn hoạt động tốt khi mất mạng, để luôn xem được đồng hồ và lịch.

#### Tiêu chí chấp nhận

1. WHEN mất kết nối mạng, THE Legacy_Frame SHALL tiếp tục hiển thị đồng hồ, lịch âm dương, và ca dao/trích dẫn (các tính năng offline).
2. WHEN mất kết nối mạng, THE Legacy_Frame SHALL hiển thị indicator nhỏ (icon hoặc text) cho biết trạng thái offline.
3. IF API thời tiết không phản hồi, THEN THE Legacy_Frame SHALL hiển thị dữ liệu thời tiết từ cache gần nhất kèm thời gian cập nhật cuối.
4. IF API tài chính không phản hồi, THEN THE Widget_Tài_Chính SHALL hiển thị dữ liệu từ cache gần nhất kèm nhãn "Cập nhật lúc [thời gian]".
5. WHEN kết nối mạng được khôi phục, THE Legacy_Frame SHALL tự động làm mới tất cả dữ liệu từ API trong vòng 30 giây.
6. THE Legacy_Frame SHALL sử dụng timeout 12 giây cho tất cả request API và hiển thị thông báo lỗi phù hợp khi timeout.

### Yêu cầu 11: Tối ưu tương thích trình duyệt cũ

**User Story:** Là người dùng thiết bị iOS/Android đời cũ, tôi muốn ứng dụng hoạt động đúng trên trình duyệt cũ (Safari iOS 9, Chrome 39, Android Browser 4.4), để tận dụng thiết bị không còn được hỗ trợ.

#### Tiêu chí chấp nhận

1. THE Legacy_Frame SHALL sử dụng prefix `-webkit-` cho tất cả thuộc tính CSS cần thiết (flexbox, transition, transform, animation, filter).
2. THE Legacy_Frame SHALL không sử dụng CSS Grid, CSS Variables (custom properties), hoặc CSS `clamp()` vì không được hỗ trợ trên Thiết_Bị_Cũ.
3. THE Legacy_Frame SHALL không sử dụng ES6+ syntax (let, const, arrow functions, template literals, Promise, async/await, destructuring) trong code chạy trực tiếp trên trình duyệt.
4. THE Legacy_Frame SHALL sử dụng `XMLHttpRequest` thay vì `fetch()` cho tất cả request API.
5. WHEN phát hiện Thiết_Bị_Cũ qua User-Agent, THE Legacy_Frame SHALL tự động bật chế độ tương thích (tắt backdrop-filter, dùng background solid, giảm animation).
6. THE Legacy_Frame SHALL sử dụng fallback font stack (`-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`) khi Google Fonts không tải được.
7. THE Legacy_Frame SHALL tải Google Fonts với thuộc tính `media="print" onload="this.media='all'"` để không block rendering.
