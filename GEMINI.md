# Coding Standards & Frontend Guidelines

Bạn là chuyên gia cấp cao về Frontend & UI/UX. Khi xây dựng hoặc chỉnh sửa giao diện web (HTML/CSS, Tailwind CSS, React, Vue) trong dự án này, hãy luôn tuân thủ nghiêm ngặt các nguyên tắc Responsive Web Design sau:

## 1. Thiết lập cốt lõi & Viewport:
- Luôn khai báo đầy đủ: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">`.
- Thiết lập `box-sizing: border-box` trên toàn bộ phần tử (`*`, `::before`, `::after`).
- Tuyệt đối không để phát sinh thanh cuộn ngang ngoài ý muốn trên toàn trang. Xử lý triệt để phần tử gây tràn thay vì lạm dụng `overflow-x: hidden` trên `body` (nhằm tránh làm hỏng `position: sticky`).

## 2. Bố cục (Layout) & Kích thước:
- Luôn áp dụng tư duy Mobile-First: thiết kế hoàn hảo trên màn hình hẹp (360px - 430px) trước, sau đó mở rộng bằng breakpoint (`sm:`, `md:`, `lg:`, `xl:`).
- Tuyệt đối không hardcode `width` cố định bằng pixel cho các khối bao ngoài (container/wrapper). Sử dụng `width: 100%` kết hợp `max-width` (`max-w-7xl`, `max-w-md`, v.v.) và căn giữa (`mx-auto`).
- Ưu tiên Flexbox (`flex-wrap`, `gap`) và CSS Grid linh hoạt (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- Bảng dữ liệu / Ma trận nhiều cột: Luôn bọc trong container có `overflow-x: auto` với cột nhãn đầu tiên ghim cố định (`sticky left-0`) khi cuộn ngang.

## 3. Typography & Trải nghiệm tương tác (UX):
- Chống tràn chữ: Dùng `overflow-wrap: break-word` hoặc `break-words` cho nội dung người dùng nhập.
- Nhãn ngắn, nút bấm, giá tiền/đơn vị: Dùng `white-space: nowrap` hợp lý trên desktop, nhưng có cơ chế co giãn hoặc rút gọn (`truncate`) trên màn hình hẹp.
- Sử dụng đơn vị tương đối (`rem`, `clamp()`) cho typography để giao diện tự co giãn hài hòa.
- Touch Target trên di động: Các nút bấm (buttons), ô chọn (inputs, pills, tabs) phải có chiều cao tối thiểu 40px – 44px để chạm bấm ngón tay dễ dàng, không dính sát nhau.

## 4. Tiêu chuẩn mã nguồn & Bảo mật:
- Xuất mã nguồn đầy đủ, toàn vẹn (Self-contained), không viết tắt hoặc cắt xén code.
- Luôn đảm bảo mã hóa UTF-8 chuẩn xác, không bị lỗi font ký tự tiếng Việt.
- Bảo mật thông tin khách hàng: Trên giao diện Khách, các ô sân đã đặt luôn ẩn danh (`🔒 Đã đặt`), tuyệt đối không để lộ họ tên, SĐT của khách khác.
