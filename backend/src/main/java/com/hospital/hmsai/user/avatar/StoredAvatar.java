package com.hospital.hmsai.user.avatar;

/**
 * Ảnh đã lưu trên kho ảnh.
 *
 * @param url      link hiển thị (CDN)
 * @param publicId mã ảnh trên kho, dùng để xóa
 */
public record StoredAvatar(String url, String publicId) {
}
