# Ảnh đại diện tài khoản (lưu trên Cloudinary)

Ngày: 2026-10-14

## Mục tiêu
- Mỗi tài khoản có ảnh đại diện thật và tải lên được.
- Mỗi người tự đổi hoặc xóa ảnh của mình. Admin đổi hoặc xóa được ảnh của mọi tài khoản.
- Danh sách bác sĩ trên trang công khai hiện đúng ảnh tài khoản của bác sĩ. Chưa có ảnh thì hiện chữ cái đầu tên; ảnh minh họa Unsplash bị bỏ.
- Hệ thống triển khai theo phương án B trong DEPLOYMENT.md: Render free không có ổ đĩa lâu dài, và người dùng không có thẻ quốc tế. Vì vậy ảnh lưu trên **Cloudinary**.

## Lưu trữ
- Bảng `users` thêm 2 cột (migration V24): `avatar_url` (link CDN) và `avatar_public_id` (mã ảnh, dùng khi xóa). File ảnh không lưu trong MySQL.
- `AvatarStorage` là interface, `CloudinaryAvatarStorage` là bản cài đặt dùng SDK `com.cloudinary:cloudinary-http5`.
- Cấu hình:
  - `CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>`: chỉ backend biết.
  - `CLOUDINARY_FOLDER`: mặc định `myphat-hospital/avatars`. Khi chạy trên máy phát triển nên dùng `myphat-hospital/dev/avatars`.
- Thiếu `CLOUDINARY_URL` thì ứng dụng vẫn chạy. Mọi chỗ hiện chữ cái đầu tên, và API tải ảnh trả lỗi 400 "Chưa cấu hình kho ảnh".
- Khi tải ảnh lên:
  1. Backend kiểm tra file không rỗng, tối đa 5MB, và là JPG/PNG/WebP. Loại file xác định bằng các byte đầu của nội dung file. Backend không tự giải mã ảnh, để tiết kiệm RAM trên Render.
  2. Ảnh được gửi lên Cloudinary kèm phép biến đổi khi nhận `c_fill,g_face,w_512,h_512`: cắt vuông theo khuôn mặt.
  3. Mỗi lần tải lên dùng một `public_id` mới, dạng `user-<id>-<ngẫu nhiên>`.
- Link lưu trong DB là link phân phối có `f_auto,q_auto` và số phiên bản. Link phân phối mặc định không giữ metadata EXIF.
- Ảnh cũ chỉ bị xóa **sau khi** link mới đã lưu vào DB. Lỗi khi xóa ảnh cũ chỉ ghi log. Nếu lưu DB thất bại thì xóa ảnh vừa tải lên.
- Lỗi khi gọi Cloudinary trả về 502 `AVATAR_STORAGE_ERROR`.

## API
| Phương thức | Đường dẫn | Quyền |
|---|---|---|
| PUT (multipart `file`) | `/api/v1/users/me/avatar` | mọi tài khoản đã đăng nhập |
| DELETE | `/api/v1/users/me/avatar` | mọi tài khoản đã đăng nhập |
| PUT (multipart `file`) | `/api/v1/users/{id}/avatar` | ADMIN |
| DELETE | `/api/v1/users/{id}/avatar` | ADMIN |

- Các API trên trả về `{ avatarUrl }`. Khi xóa ảnh, `avatarUrl` là null và không có trong JSON.
- Thêm trường `avatarUrl` vào: `AuthResponse.UserInfo` (đăng nhập, đăng ký, refresh), `UserResponse`, `StaffResponse`, `PublicDoctorResponse`.

## Frontend
- `Avatar` (components/common): hiện ảnh nếu có `src`; không có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu tên. Hàm `getInitials` gom về một chỗ dùng chung.
- `AvatarUploader`: hiện ảnh lớn, có nút "Đổi ảnh" / "Xóa ảnh", kiểm tra định dạng và dung lượng ngay ở trình duyệt.
  - Dùng trong `UserProfileModal` (người dùng tự đổi ảnh) và trong hộp thoại sửa tài khoản của admin. Ở hộp thoại admin, ảnh được lưu ngay khi chọn.
- Avatar hiện ở: Navbar, StaffWorkspace (thanh bên và menu đầu trang), UserProfileModal, danh sách tài khoản của admin, và thẻ bác sĩ trên trang công khai.
- Sau khi đổi ảnh của chính mình: cập nhật `hms_user` trong localStorage qua `AuthContext.updateUser`, để mọi chỗ hiển thị đổi ngay.
- Trang công khai: `avatarUrl` lấy từ `GET /public/doctors` trong `doSyncCatalog`. `DoctorsSection` theo dõi `catalogVersion` để vẽ lại sau khi đồng bộ xong.

## Triển khai
- Thêm `CLOUDINARY_URL` và `CLOUDINARY_FOLDER` vào `.env.example`, docker-compose (service backend) và DEPLOYMENT.md (cả phương án A và B).

## Kiểm thử
- **Backend:**
  - Kiểm tra định dạng file bằng byte đầu.
  - `AvatarService`: tải lên, thay ảnh (xóa ảnh cũ sau khi lưu), xóa ảnh, khi chưa cấu hình, khi kho ảnh lỗi. Kho ảnh được giả lập bằng mock.
  - Phân quyền controller: tự đổi ảnh của mình; admin đổi ảnh người khác; người không phải admin bị 403.
  - Thêm `avatarUrl` vào các DTO.
- **Frontend:** `Avatar`, `AvatarUploader`, các hàm service, cập nhật AuthContext, thẻ bác sĩ hiện ảnh từ backend.
