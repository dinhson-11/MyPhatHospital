package com.hospital.hmsai.user.avatar;

/** Ảnh đại diện tài khoản. */
public interface AvatarService {

    /** Đổi ảnh đại diện (ảnh cũ bị xóa khỏi kho sau khi lưu ảnh mới). */
    AvatarResponse updateAvatar(Long userId, byte[] image);

    /** Gỡ ảnh đại diện – quay về hiển thị chữ cái đầu tên. */
    void removeAvatar(Long userId);
}
