# 🏸 SmashCourt Pro — Hệ Thống Quản Lý Sân Cầu Lông & Đặt Sân Trực Tuyến

Hệ thống web toàn diện phục vụ quản lý doanh thu, vận hành sân cầu lông, bán hàng POS dịch vụ tại quầy và cổng đặt lịch sân trực tuyến cho khách hàng.

---

## 🌟 Điểm nổi bật & Tính năng chính

### 1. Phân hệ Khách hàng (Customer Portal)
- **Bảng đặt lịch ma trận chuẩn Alobo**: Nhấp chọn trực tiếp khung giờ từ 05:00 đến 23:00, hỗ trợ chọn nhiều khung giờ liên tiếp.
- **Bảo mật thông tin khách hàng**: Các khung giờ đã có người đặt hiển thị `🔒 Đã đặt`, ẩn danh hoàn toàn thông tin cá nhân.
- **Menu nước & phụ kiện trực tuyến**: Đặt nước bù khoáng, cầu lông, quấn cán và yêu cầu giao ra tận sân hoặc nhận tại quầy.
- **Tối ưu Mobile-First**: Vuốt ngang mượt mà, cột tên sân ghim cố định (`sticky`), thanh điều hướng đáy dạng App tiện lợi.

### 2. Phân hệ Quản trị viên (Admin Workspace)
- **Sơ đồ 4 sân trực quan**:
  - Sân 1 & Sân 2: Sân thảm xanh BWF.
  - Sân 3 & Sân 4: Sân thảm xám cao cấp.
  - Đồng hồ đếm giờ đang chơi theo thời gian thực (*Live Elapsed Timer*).
  - Thêm dịch vụ nước uống, cầu lông trực tiếp vào hóa đơn của từng sân.
- **Bán hàng POS tại quầy**: Tìm kiếm sản phẩm, danh mục nước / quấn cán / ống cầu, giỏ hàng, in hóa đơn thanh toán tiền mặt & chuyển khoản QR.
- **Lịch đặt toàn hệ thống**: Bộ lọc theo sân, ngày, trạng thái, check-in và hủy lịch đặt.
- **Báo cáo doanh thu**: Biểu đồ Chart.js doanh thu theo khung giờ, tỉ lệ lấp đầy sân, phương thức thanh toán.

---

## 📂 Cấu trúc mã nguồn

```text
├── index.html          # Bản tổng hợp tự động thích ứng thiết bị (Responsive Master)
├── pc.html             # Bản chuyên dụng cho máy tính / laptop (Widescreen Dashboard)
├── mobile.html         # Bản chuyên dụng cho điện thoại smartphone (Mobile-First Web App)
├── GEMINI.md           # Quy chuẩn lập trình Frontend & UI/UX (Coding Standards)
├── .gitignore          # Cấu hình bỏ qua các tệp không cần thiết
└── tools_and_scripts/  # Bộ công cụ xây dựng, kiểm tra và bảo trì mã nguồn
```

---

## 🚀 Hướng dẫn sử dụng nhanh

1. Tải về hoặc clone repository:
   ```bash
   git clone https://github.com/hoangkttn711/websitequanlycaulong.git
   ```
2. Mở trực tiếp `index.html`, `pc.html` hoặc `mobile.html` trên bất kỳ trình duyệt web nào (Chrome, Safari, Edge, Firefox).
3. **Đăng nhập Quản lý (Admin)**:
   - Tài khoản: `admin`
   - Mật khẩu: `admin`

---

## 📐 Tiêu chuẩn kỹ thuật
- **Ngôn ngữ**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS 3.4 CDN, Chart.js.
- **Mã hóa**: Chuẩn UTF-8 Native, không vỡ font tiếng Việt.
- **Nguyên tắc Responsive**: Tuân thủ nghiêm ngặt theo quy chuẩn trong [`GEMINI.md`](./GEMINI.md).
