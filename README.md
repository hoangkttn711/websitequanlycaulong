# SmashCourt Pro — Quản lý sân cầu lông

Ứng dụng đặt sân và vận hành bốn sân, POS, tồn kho và báo cáo. Dùng HTML, TypeScript/JavaScript, Supabase Auth và các giao dịch PostgreSQL để xác nhận lịch, đơn hàng và thanh toán.

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
- `src/app_core.ts`: quy tắc ngày giờ, giá, tồn kho, tổng thanh toán và escape HTML.
- `src/booking_rules.ts`: kiểm tra lịch trùng, giờ bắt đầu/đã chơi và phí thanh toán.
- `src/cloud_models.ts`: ánh xạ dữ liệu RPC và kiểm tra vai trò quản trị.
- `src/domain.ts`, `src/supabase_types.ts`: kiểu dữ liệu nghiệp vụ và payload Supabase hiện tại.
- `tools_and_scripts/app_core.js`: cầu nối CommonJS cho công cụ/test cũ; cần build trước khi require.
- `tools_and_scripts/app_logic.js`: hiển thị và xử lý giao diện.
- `tools_and_scripts/cloud_module.js`: Auth, RPC, đối chiếu revision, retry và rollback.
- `tools_and_scripts/build.js`: build tái lập được, tạo `public/` và cập nhật ba HTML gốc.
- `supabase_schema.sql`: schema khởi tạo, không tạo lịch/phiên/hóa đơn mẫu.
- `migrations/`: nâng cấp database hiện có, giữ lịch sử.
- `tests/`: kiểm thử quy tắc, phân quyền/database, DOM và máy chủ HTTP.
- `archive/`: công cụ lịch sử chỉ để tham khảo, không chạy hoặc xuất bản.

Chỉ `public/` được triển khai. Thư viện JavaScript và Tailwind CSS được đóng gói cục bộ từ phiên bản khóa trong `package-lock.json`. Tài khoản quản trị là email Supabase Auth được cấp `app_metadata.role=admin`; không có mật khẩu mặc định.

## Migration TypeScript từng bước

`npm run typecheck` kiểm tra strict toàn bộ `src/**/*.ts`. `npm run build` biên dịch vào `.build/`, ghép JavaScript đã biên dịch và phần JavaScript còn lại vào ba trang, rồi tạo CSS/assets như trước. Không sửa `.build/`, `public/` hoặc HTML gốc bằng tay. `npm test` tự build trước khi chạy test; `npm run check` chạy typecheck, build, toàn bộ test và kiểm tra ba bản triển khai. Các entry point `build_all.js`, `build_index.js`, `build_pc.js`, `build_mobile.js` vẫn dùng chung build này.

`.build/` chỉ là đầu ra trung gian bị Git bỏ qua; trình duyệt không cần Node hoặc TypeScript. CI GitHub Pages hiện có tự chạy typecheck qua `npm run check`, không cần thay workflow. Phần DOM, điều phối Auth/RPC và công cụ Node vẫn là JavaScript, chưa được typecheck; xem [phạm vi, lý do và kiểm chứng migration](TYPESCRIPT_MIGRATION.md).

[Báo cáo audit ban đầu](REPO_AUDIT.md) mô tả các lỗi trước khi sửa. [Hướng dẫn triển khai](DEPLOYMENT.md) mô tả hành vi mới và phần cần cấu hình trên môi trường thật.
