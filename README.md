# SmashCourt Pro — Quản lý sân cầu lông

Ứng dụng đặt sân và vận hành bốn sân, POS, tồn kho và báo cáo. Dùng HTML/JavaScript, Supabase Auth và các giao dịch PostgreSQL để xác nhận lịch, đơn hàng và thanh toán.

## Chạy tại máy

Cài Node.js 22 trở lên, sau đó:

```sh
npm ci
npm run check
npm start
```

Mở http://127.0.0.1:3000. Cần áp dụng database migration và tạo tài khoản quản trị trước khi ghi dữ liệu. Xem [hướng dẫn triển khai và đối chiếu dữ liệu cũ](DEPLOYMENT.md).

## Mã nguồn

- `templates/`: giao diện index/PC/mobile, không chứa bản sao logic.
- `tools_and_scripts/app_core.js`: quy tắc ngày giờ, giá, tồn kho và escape HTML.
- `tools_and_scripts/app_logic.js`: hiển thị và xử lý giao diện.
- `tools_and_scripts/cloud_module.js`: Auth, RPC, đối chiếu revision, retry và rollback.
- `tools_and_scripts/build.js`: build tái lập được, tạo `public/` và cập nhật ba HTML gốc.
- `supabase_schema.sql`: schema khởi tạo, không tạo lịch/phiên/hóa đơn mẫu.
- `migrations/`: nâng cấp database hiện có, giữ lịch sử.
- `tests/`: kiểm thử quy tắc, phân quyền/database, DOM và máy chủ HTTP.
- `archive/`: công cụ lịch sử chỉ để tham khảo, không chạy hoặc xuất bản.

Chỉ `public/` được triển khai. Thư viện JavaScript và Tailwind CSS được đóng gói cục bộ từ phiên bản khóa trong `package-lock.json`. Tài khoản quản trị là email Supabase Auth được cấp `app_metadata.role=admin`; không có mật khẩu mặc định.

[Báo cáo audit ban đầu](REPO_AUDIT.md) mô tả các lỗi trước khi sửa. [Hướng dẫn triển khai](DEPLOYMENT.md) mô tả hành vi mới và phần cần cấu hình trên môi trường thật.
