# Triển khai bản sửa

## 1. Kiểm tra và build

Yêu cầu Node.js 22 trở lên (CI dùng Node 24):

```sh
npm ci
npm run check
npm start
```

Mở http://127.0.0.1:3000. Build tạo ba trang và thư viện/CSS cục bộ trong `public/`; chỉ thư mục này được xuất bản. Các tệp `index.html`, `pc.html`, `mobile.html` tại gốc cũng được cập nhật để tiện kiểm tra. Sau khi clone, phải build để có `assets/`.

## 2. Cập nhật Supabase trước khi xuất bản giao diện

1. Sao lưu database và chọn thời điểm không có giao dịch đang diễn ra. Giữ bản xuất dữ liệu localStorage của các máy thu ngân cũ nếu còn dữ liệu chưa đồng bộ.
2. Database đã có bốn bảng cũ: chạy **chỉ** `migrations/001_transactional_backend.sql` trong Supabase SQL Editor bằng tài khoản chủ dự án. Database mới: chạy `supabase_schema.sql`, sau đó migration này. Cả hai có thể chạy lại; không cần reset hoặc xóa dữ liệu.
3. Tạo tài khoản quản lý trong Supabase Authentication bằng email và mật khẩu riêng. Tắt public sign-up nếu không sử dụng cho chức năng khác. Cấp quyền qua `app_metadata`, tuyệt đối không dùng `user_metadata` do người dùng tự sửa được:

```sql
-- Thay bằng UUID chính xác của tài khoản vừa tạo, lấy từ Authentication > Users.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                        || '{"role":"admin"}'::jsonb
where id = 'THAY-BANG-UUID-TAI-KHOAN';
```

4. Đăng xuất/đăng nhập lại để nhận JWT mới. Giao diện không còn tài khoản `admin/admin`. Khách vẫn đặt sân không cần tạo tài khoản; token ngẫu nhiên của thiết bị dùng để bảo vệ lịch riêng.
5. Kiểm tra thủ công một lượt đặt sân → nhận sân → thêm hàng → thanh toán, trên hai thiết bị, trước khi dùng tại quầy.
6. Xuất bản `public/`, hoặc push thay đổi đã được duyệt lên `main` để GitHub Actions build, test và triển khai Pages. Workflow không tự áp dụng SQL hay cấp quyền Auth.

Nếu chưa có migration/quyền Auth, ứng dụng hiển thị lỗi kết nối và từ chối ghi dữ liệu; không giả báo thành công hoặc chuyển sang ghi sổ cục bộ.

## 3. Đối chiếu dữ liệu cũ

- Lịch cũ không có ngày được **giữ nguyên**, không tự gán ngày hôm nay. Trang quản trị hiển thị danh sách cần xác nhận ngày; nhập ngày thực tế rồi xác nhận từng lịch. Lịch không còn hiệu lực có thể hủy. Lịch cũ có nhiều khoảng rời được tách khi xác nhận ngày; tiền cọc giữ ở ca đầu và bản gốc được lưu với trạng thái hủy để đối chiếu.
- Sân cũ đang hoạt động nhưng chưa có `started_at`/`session_id` có mục khôi phục phiên. Nhập giờ vào thực tế trong hôm nay trước khi thanh toán. Phiên thuộc ngày trước cần được đối chiếu bởi quản lý, không tự tính lại ngày.
- Trình duyệt giữ nguyên khóa `smashcourt_pro_state_v5`, và tạo thêm `smashcourt_legacy_backup` một lần. Trong quản trị có nút tải bản sao JSON. Không tự nhập các hóa đơn cũ thiếu ngày vào ngày hiện tại. Hãy đối chiếu hóa đơn/thanh toán rồi nhập qua quy trình quản lý phù hợp. Sau khi đã sao lưu và đối chiếu, quản lý có thể xóa các khóa bản sao trên máy dùng chung.
- Không chạy lại các script cũ trong `archive/legacy_tools`; một số script từng xóa toàn bộ dữ liệu cloud.

## Quy tắc vận hành mới

- Đặt sân chỉ được xác nhận sau khi database chấp nhận toàn bộ yêu cầu. Khoảng rời nhau trở thành các lịch liên tiếp riêng để nhận/hủy đúng từng ca. Giá được tính theo từng phút, 80.000đ/h từ 17–21h và 60.000đ/h ngoài khoảng đó.
- Đặt sân trực tuyến không tự ghi nhận 50.000đ tiền cọc. Nhân viên chỉ nhập cọc đã thực nhận. Hóa đơn phân biệt doanh thu, giảm giá, cọc áp dụng và số tiền còn phải thu. Nếu cọc vượt giá trị hóa đơn, màn hình ghi rõ tiền cần hoàn và lưu `refund_amount` để đối chiếu; nhân viên xác nhận việc hoàn tiền khi kết thúc sân.
- Đơn nước/phụ kiện trực tuyến ở trạng thái chờ. Nhân viên xác nhận thu tiền tại quầy hoặc ghi vào phiên sân đang chơi; lúc đó mới trừ kho. Phụ kiện đặt trước gắn với lịch, không gắn vào hóa đơn của người đang chơi.
- Mọi thay đổi quản trị dùng revision chung. Khi thiết bị khác vừa sửa, giao dịch bị từ chối và tải lại; không ghi đè âm thầm. Yêu cầu chưa rõ kết quả được đối chiếu lại bằng cùng mã thao tác trước khi cho ghi tiếp. Giữ nguyên tab nếu mạng lỗi trong lúc thu tiền.
- Báo cáo giao diện lấy 90 ngày gần nhất, lịch quản trị lấy từ 30 ngày trước trở đi và các lịch chưa có ngày; lịch sử cũ vẫn giữ trong database. Bộ đếm/ngày và giờ hoạt động dùng `Asia/Ho_Chi_Minh`.
- Đồng bộ giao diện mỗi 15 giây và khi quay lại tab. Database luôn kiểm tra trùng lịch tại thời điểm ghi, kể cả khi màn hình chưa kịp tải dữ liệu mới.

## Giới hạn kiểm chứng

Kiểm thử tự động dùng PostgreSQL cục bộ (PGlite), DOM của cả ba trang và máy chủ HTTP cục bộ. Migration và Auth phải được áp dụng riêng vào dự án Supabase thật. Chưa có phép thử tải lớn, kiểm chứng toàn bộ thiết bị/screen reader hoặc kiểm thử trình duyệt thật. Chống lạm dụng API công khai theo IP/CAPTCHA cần cấu hình hạ tầng riêng nếu đưa cổng đặt lịch ra Internet rộng rãi.
