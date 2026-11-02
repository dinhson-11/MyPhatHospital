# Product

<!-- impeccable:product-schema 1 -->
<!-- Viết tay theo quy trình `init` của impeccable, KHÔNG chạy qua engine của nó. Mục "(suy luận)" là Claude suy ra từ mã nguồn và tài liệu, chưa được chủ dự án xác nhận. -->

## Platform

web

## Stack

React 19, Vite, Tailwind 3 (giữ nguyên; redesign chỉ thay lớp hiển thị).

## Users

- **Bệnh nhân và người nhà** (Portal): tìm giờ khám, địa chỉ, khoa, bác sĩ; đặt lịch; hỏi nhanh triệu chứng. Có người lớn tuổi và người dùng điện thoại, mạng có thể yếu. (suy luận)
- **Nhân viên** (Workspace, 5 vai trò: lễ tân - kế toán, bác sĩ, điều dưỡng, dược sĩ, quản trị): dùng cả ngày, cần nhanh, rõ, ít gây nhầm lẫn. (suy luận)

## Product Purpose

Hệ thống quản lý phòng khám Mỹ Phát (Chũ, Lục Ngạn, Bắc Giang): đặt lịch, tiếp đón, khám, kê đơn, cấp phát thuốc, hóa đơn (tiền mặt, VietQR), báo cáo, kèm trợ lý AI. Mục tiêu của đợt redesign giao diện: dùng làm sản phẩm bảo vệ đồ án và portfolio xin thực tập.

## Capabilities and Constraints

- Hệ thống có thể chạy trong mạng LAN của phòng khám: giao diện không được phụ thuộc tài nguyên tải từ internet (font, icon đã đóng gói).
- Giữ nguyên nghiệp vụ, phân quyền, API, nội dung thật (tên, địa chỉ, hotline, giờ khám).
- WCAG 2.2 AA là ngưỡng sàn (đã có test tương phản, vùng chạm 44px, cỡ chữ người dùng chọn).

## Brand Commitments

- Logo tròn vàng cam (`frontend/public/logo.png`). Màu navy `#0B5394` xuất hiện trên banner thật của phòng khám nên được giữ làm màu nhấn duy nhất.
- Khẩu hiệu "Sáng y đức, vững chuyên môn, vuông tròn hạnh phúc".

## Evidence on Hand

- Có: logo, ảnh Ban lãnh đạo được Nguyên Chủ tịch nước trao bằng khen (ảnh chụp lại từ bản in, chất lượng thấp), địa chỉ, hotline, giờ khám theo mùa.
- **Không có** lời chứng thực thật của bệnh nhân (mục cũ trong Portal là nội dung tự viết, đã gỡ), không có ảnh chân dung thật của bác sĩ (ảnh cũ là ảnh stock gắn với tên thật, đã gỡ), không có số liệu thống kê được kiểm chứng. Đừng bịa các thứ này.

## Confirmed (2/11/2026)

- Tên trên biển thật: "Công ty TNHH Bệnh viện Mỹ Phát", "Phòng khám đa khoa Mỹ Phát", logo "MY PHAT HOSPITAL". Chủ dự án xác nhận nội dung banner đúng.
- Ảnh mặt tiền thật: `frontend/src/assets/mat-tien-my-phat.jpg` (dùng ở hero và hộp thoại Giới thiệu).
- **Hotline thật: 0386 959 342** (số trên biển hiệu, chủ dự án xác nhận). Đã thay số cũ 0789 065 493 trong frontend, backend (chatbot), AI service, README và tài liệu luồng.
  - Ngoại lệ: migration `V16__sync_myphat_doctors_and_roles.sql` vẫn đặt số cũ làm số điện thoại của tài khoản `admin` demo. Không sửa migration đã chạy (Flyway sẽ lệch checksum); đổi số này trong tab "Tài khoản" của trang Quản trị nếu cần.
