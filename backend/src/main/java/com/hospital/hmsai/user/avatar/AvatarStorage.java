package com.hospital.hmsai.user.avatar;

/** Kho lưu ảnh đại diện (bản cài đặt: {@link CloudinaryAvatarStorage}). */
public interface AvatarStorage {

    /** false khi chưa cấu hình (thiếu CLOUDINARY_URL) – chức năng tải ảnh bị tắt. */
    boolean isConfigured();

    /**
     * Tải ảnh lên: cắt vuông theo khuôn mặt, link hiển thị tự chọn định dạng / chất lượng nhẹ nhất.
     *
     * @param publicId mã ảnh mới (không trùng giữa các lần tải để CDN cache lâu dài)
     * @throws AvatarStorageException kho ảnh lỗi
     */
    StoredAvatar upload(byte[] image, String publicId);

    /** @throws AvatarStorageException kho ảnh lỗi */
    void delete(String publicId);
}
