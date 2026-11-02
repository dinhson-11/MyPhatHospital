---
name: Mỹ Phát Hospital
description: Giao diện phẳng, đơn giản như bảng thông tin của một phòng khám; một màu nhấn navy.
colors:
  primary: "#0B5394"
  primary-hover: "#083e70"
  primary-soft: "#eef5fc"
  text: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#566579"
  surface: "#ffffff"
  surface-muted: "#f8fafc"
  border: "#e2e8f0"
  border-strong: "#cbd5e1"
  error: "#b91c1c"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
---

<!-- Viết tay từ chính mã nguồn đã làm (index.css, tailwind.config.js, Portal). Chưa chạy `impeccable document`. -->

# Design System: Mỹ Phát Hospital

## Overview

**Hướng: "Bảng thông tin phòng khám".** Trang trông như một tờ thông tin được trình bày gọn: chữ dẫn đầu, thông tin thật ngay trên cùng (địa chỉ, giờ khám, hotline), danh sách và đường kẻ thay cho thẻ. Không cố gây ấn tượng bằng hiệu ứng.

Hướng này do chủ dự án ghim bằng lời ("đơn giản, không nhựa, không bóng loáng"). Nó thay cho kiểu cũ: huy hiệu pill viết hoa trên mỗi section, ô icon bo tròn, nền mờ blur, đổ bóng, hover nâng thẻ, gradient, chip nổi.

## Colors

Một màu nhấn: navy `#0B5394`, chỉ dùng cho nút chính, liên kết, trạng thái đang chọn. Mọi thứ còn lại là xám trung tính trên nền trắng và `slate-50`. Đỏ chỉ cho lỗi và cấp cứu (kèm chữ, không chỉ dựa vào màu). Màu teal cũ vẫn còn trong token cho Workspace nhưng Portal không dùng.

**The One Accent Rule.** Navy xuất hiện ở nút chính và liên kết; nếu một vùng có hơn hai thứ màu navy thì đã quá tay.

## Typography

Một họ chữ: Be Vietnam Pro (đã đóng gói, đủ dấu tiếng Việt). Thân bài 16px. Tiêu đề section 24px, đậm vừa (`font-semibold`); không dùng `font-extrabold`, không viết hoa toàn bộ, không giãn chữ. Chú thích 14px.

## Layout

Một cột nội dung, rộng tối đa `max-w-6xl`. Nhịp nền của Portal tạo điểm nhấn bằng mảng màu phẳng, không gradient: hero xanh nhạt (`primary-fixed`), dịch vụ trắng, dải "Về Mỹ Phát" navy đặc, khoa phòng trắng, bác sĩ `slate-50`, hỏi triệu chứng xanh nhạt, liên hệ trắng, footer navy đậm (`brand-900`). Danh sách dùng lưới hai/ba cột trên màn rộng và xếp chồng trên điện thoại. Tránh thẻ lồng thẻ.

**The Accent Bar Rule.** Mỗi tiêu đề section có một vạch navy ngắn (`h-1 w-10`) phía trên; đây là dấu hiệu nhận diện duy nhất, không thêm huy hiệu hay icon trang trí.

## Elevation & Depth

Phẳng. Thẻ, nút, ô nhập không có bóng (`shadow-xs/sm/card = none`). Chỉ lớp nổi (menu thả xuống, hộp thoại, nút chat) có bóng nhẹ. Không `backdrop-filter`, không gradient.

## Shapes

Bo góc nhỏ: `rounded-lg` 4px, `rounded-xl` 6px, `rounded-2xl` 8px (đã ghi đè trong `tailwind.config.js`, áp cho cả Workspace). Bo tròn hoàn toàn chỉ dành cho avatar và logo.

## Components

- **Nút chính** (`.btn .btn-primary`): nền navy, chữ trắng, không bóng. **Nút phụ** (`.btn-outline`): viền xám. **Hành động phụ trong danh sách** (`.link-btn`): chữ navy gạch chân, có trong `index.css`.
- **Bộ lọc**: nút viền mảnh, trạng thái chọn đổi viền và chữ sang navy, vẫn dùng `aria-pressed`.
- **Danh sách thông tin**: `<dl>` hoặc `<ul>` có kẻ ngang; thay cho thẻ.
- **Icon**: chỉ dùng khi có chức năng (menu, nút chat, mục menu Workspace). Không dùng icon trang trí.
- **Danh sách đánh số** (Việc có thể làm trên website): số `01–04` navy cỡ lớn thay cho ô icon.
- **Bác sĩ**: vòng tròn chữ cái đầu (`primary-fixed-dim`, chữ navy) thay ảnh chân dung.
- **Khoa phòng**: vạch trái 4px xanh nhạt, chuyển navy khi rê chuột.
- **Thanh trên Portal**: chưa đăng nhập hiện liên kết mục từ `xl`; đã đăng nhập chỉ từ `2xl` (thêm nút Không gian làm việc và menu tài khoản). "Lịch trực", "Lịch khám của tôi" chỉ nằm trong menu tài khoản để thanh trên không tràn.
- **Workspace**: banner chào navy đặc (không gradient); thẻ chỉ số, bảng, hộp thoại dùng lớp chung trong `index.css` nên tự phẳng theo token.

## Do's and Don'ts

### Do:
- **Do** để thông tin thật (địa chỉ, giờ khám, hotline) ở đầu trang.
- **Do** giữ mọi chữ ≥ 4.5:1 và vùng chạm 44px trên cảm ứng (đã có test).
- **Do** dùng ảnh thật của phòng khám; nếu chưa có, để trống chứ không dùng ảnh stock.

### Don't:
- **Don't** thêm gradient, blur, đổ bóng ở thẻ/nút, hiệu ứng hover nâng, animation trang trí.
- **Don't** thêm huy hiệu pill viết hoa phía trên tiêu đề section.
- **Don't** bịa lời chứng thực, số liệu, ảnh chân dung, hay khẳng định chưa kiểm chứng ("đạt chuẩn y đức", "trang thiết bị hiện đại").
- **Don't** gắn ảnh phải tải từ internet vào giao diện (hệ thống có thể chạy trong mạng LAN).
