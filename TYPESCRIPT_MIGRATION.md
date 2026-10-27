# Migration TypeScript — giai đoạn 1

## Cấu trúc và luồng hiện tại

- Nguồn giao diện: `templates/index.html`, `templates/pc.html`, `templates/mobile.html`, `styles.css`. Giữ nguyên trong giai đoạn này.
- Logic cũ: `tools_and_scripts/app_logic.js` là IIFE dùng DOM và state chung; marker `CLOUD_MODULE` được thay bằng `cloud_module.js` khi build. Không chuyển sang framework.
- Build: `tools_and_scripts/build.js` gọi TypeScript strict, sau đó giữ hai phép biến đổi Acorn hiện có: bọc event handler bằng `guarded` và escape biểu thức HTML. Các module TS được bọc CommonJS cục bộ, nối theo thứ tự core → cloud models → booking rules → ứng dụng. Bộ phân giải nội bộ chỉ nối dependency core; không cần bundler hoặc runtime Node trong trình duyệt.
- Đầu ra: `.build/*.js` là trung gian, `public/{index,pc,mobile}.html`, `public/assets/*`, `public/.nojekyll` là artifact deploy. Ba HTML gốc và `assets/` được build cập nhật để tương thích cách kiểm tra cũ. HTML gốc được Git theo dõi nên xuất hiện trong diff; không sửa tay.
- GitHub Pages: `.github/workflows/deploy.yml` dùng Node 24, `npm ci`, `npm run check`, upload chỉ `public/` rồi deploy khi push main hoặc chạy thủ công. Workflow giữ nguyên; `check` giờ bao gồm typecheck.
- Dev server chỉ phục vụ `public/`; source, SQL và archive không được xuất bản.
- `archive/legacy_tools/*.txt` là bản lưu công cụ cũ, không phải nguồn build và không chạy. Giữ nguyên, gồm cả công cụ cloud lịch sử.
- Hướng dẫn được người dùng dẫn chiếu tại `C:\Users\tranl\.codex\RTK.md` không có trên máy; không dùng file trùng tên ở dự án khác để thay thế.

## Nghiệp vụ đã đối chiếu

| Luồng | Cách vận hành được giữ lại |
| --- | --- |
| Khách đặt sân | Ma trận nhiều sân, ca 30/60 phút và trường chọn sân/giờ cũ cùng tồn tại. Khoảng rời được nhóm thành từng lịch liên tiếp khi gửi `app_reserve`; giữ device token, operation ID và retry cùng thao tác. Chỉ xác nhận khi RPC thành công; không tự ghi nhận cọc. |
| Quản trị đặt sân | Form lịch, đặt nhanh từ ma trận, nhận/hủy từ bảng và thẻ sân; `validateBooking` kiểm tra ngày, bước 30 phút, trùng lịch và phiên đang chơi. Database tiếp tục quyết định cuối cùng. |
| Check-in | Có cả nhận lịch và mở sân vãng lai. Giữ kiểm tra sân trống, trạng thái lịch, ngày, session ID, startedAt và kiểm tra một ca liên tiếp. Nhận sớm chờ giờ đã đặt; nhận muộn tính thời gian từ lúc nhận. |
| Thời gian và giá | Múi giờ Asia/Ho_Chi_Minh; 05:00–23:00; 60.000đ/h, riêng 17:00–21:00 là 80.000đ/h; tích phân theo phút và làm tròn như cũ. Thời lượng hóa đơn vẫn do ô checkout hiện có quyết định, không tự thay bằng bộ đếm đã chơi. |
| Thanh toán | Tiền sân + hàng − giảm giá; phân biệt tổng, cọc áp dụng, thu thêm và hoàn cọc. Đóng phiên hoàn hàng thuê, hoàn tất lịch liên quan, chọn lịch chờ tiếp theo. Giữ cách chọn tiền mặt/chuyển khoản. |
| Kho/POS | Cộng/bớt hàng vào sân thay đổi tồn kho đối ứng; POS bán lẻ tạo hóa đơn; hàng thuê phải gắn sân. Đơn khách online chờ nhân viên xác nhận, chưa trừ kho/thu tiền; RPC xác nhận mới ghi nhận. |
| Auth/quyền | Giữ đăng nhập Supabase password, alias admin, getUser xác thực session; chỉ app_metadata.role=admin mở giao diện quản trị. Không lấy user_metadata. RLS, grants và quyền RPC trong SQL giữ nguyên. |
| Đồng bộ/lỗi mạng | Giữ revision, polling 15 giây, focus/visibility, rollback optimistic state và phục hồi thao tác chưa rõ kết quả bằng operation ID đã lưu. |
| Dữ liệu cũ | Giữ backup localStorage, xuất JSON, gán ngày cho lịch thiếu ngày, tách ca rời và khôi phục phiên thiếu giờ vào; không xóa hay tự nhập dữ liệu cũ. |

## Module đã chuyển

- `src/app_core.ts`: toàn bộ quy tắc trước đây trong `app_core.js`; shim JS giữ đường require cũ sau build.
- `src/booking_rules.ts`: parser lịch an toàn, giờ bắt đầu, trạng thái chờ, số phút đã chơi, validation lịch và phiên chiếm sân, phí checkout; wrapper JS truyền state hiện tại.
- `src/cloud_models.ts`: ánh xạ sân, lịch, sản phẩm, hóa đơn từ snake_case sang camelCase và kiểm tra role. Giữ giá trị mặc định, số 0, ngày null và trường bị ẩn khi đọc ẩn danh.
- `src/domain.ts`: Court, Booking, Product, Invoice, LineItem, TimeRange và trạng thái.
- `src/supabase_types.ts`: các row RPC có trường riêng tư tùy quyền, snapshot, kết quả đặt sân, kiểu kết quả SDK. Các kiểu này mô tả hợp đồng hiện có, không thay thế validation runtime hoặc quyền ở database.
- `tsconfig.json`: strict, noEmitOnError, ES2020/CommonJS, kiểm tra cả khai báo thư viện; không dùng any, ts-ignore hay ép kiểu để bỏ lỗi trong nguồn TS.

## Phần còn JavaScript và bước tiếp theo

- `app_logic.js`: render HTML, event delegation, state nháp, mutation check-in/POS/checkout và báo cáo còn phụ thuộc DOM/state chung. Chuyển tiếp từng nhóm sau khi có kiểu AppState và kiểu các phần tử DOM; không đổi hàng loạt hay xóa UI cũ.
- `cloud_module.js`: điều phối Auth, RPC, snapshot validation, guarded, rollback, idempotency và localStorage vẫn JS vì phụ thuộc closure state và handler giao diện. Kiểu RPC đã định nghĩa nhưng chưa kiểm tra xuyên suốt các lời gọi JS; bước tiếp theo là adapter RPC có kiểu và state có kiểu. Không khai báo toàn bộ payload JSON là hợp lệ bằng một type assertion.
- `build*.js`, `server.js`, `verify*.js`, `tests/*.test.js`: giữ Node/CommonJS hiện tại để giảm phạm vi thay đổi. Build trung tâm bắt buộc biên dịch TS, kể cả khi gọi wrapper cũ trực tiếp.
- Không bật checkJs toàn repo ở giai đoạn này. Strict hiện áp dụng cho `src/`; không tuyên bố toàn bộ ứng dụng đã được kiểm tra kiểu.

## Kiểm chứng và trước deploy

Baseline trước sửa: `npm run check` qua 17/17 test và kiểm tra ba trang.

Sau mỗi nhóm core, cloud models và booking rules: chạy `npm run typecheck` và `npm run build`. SDK yêu cầu kiểu Node nên thêm `@types/node`; không đổi SDK. Kiểm thử tích hợp phát hiện một chỗ render vẫn gọi `slotStartMinSafe` cũ; đã bổ sung wrapper giữ chữ ký cũ và chạy lại toàn bộ kiểm tra.

Kiểm tra cuối: `npm run check` gồm strict typecheck, build, 22 test và verify ba trang. Bộ test hiện có kiểm tra quyền PostgreSQL/RPC, trùng lịch, tính nguyên tử, retry, rollback, tồn kho và lifecycle đặt/nhận/POS/thanh toán; bổ sung kiểm tra giờ nhận sớm/muộn, dữ liệu cũ, mapping dữ liệu bị ẩn, role và markup giữ nguyên.

Đã chạy lại `npm ci` rồi `npm run check` thành công với lockfile mới (22/22). `git diff --check` qua; không có diff trong templates, CSS, schema, migrations, workflow và test UI cũ. Một phép đối chiếu Node riêng đọc core cũ từ `git show HEAD:tools_and_scripts/app_core.js`, chạy bằng VM rồi so với `.build/app_core.js`: toàn bộ 583.740 khoảng giờ hợp lệ theo phút trong 05:00–23:00 và 48 tổ hợp thanh toán/cọc/giảm giá cho kết quả giống nhau.

Trước deploy: dùng `npm ci` để lấy dependency khóa mới, chạy `npm run check`, rồi smoke test ba trang trên trình duyệt/thiết bị thực tế và một lượt vận hành trên môi trường thử nghiệm hiện có. TypeScript không chứng minh payload mạng luôn đúng; phần JS chưa được strict checking. Test dùng PGlite/JSDOM và Supabase giả lập/cục bộ, không xác nhận production hoặc mọi bố cục trình duyệt.

Migration TypeScript này không yêu cầu SQL, đổi schema, dữ liệu, RLS, Auth role hoặc cấu hình production. Hướng dẫn database cũ trong DEPLOYMENT.md vẫn chỉ là yêu cầu vận hành có sẵn, không phải thao tác được thực hiện ở đây. Không commit, push hay deploy.
