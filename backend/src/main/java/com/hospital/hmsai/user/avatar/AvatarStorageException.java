package com.hospital.hmsai.user.avatar;

/** Kho ảnh (Cloudinary) lỗi hoặc không phản hồi – GlobalExceptionHandler trả 502. */
public class AvatarStorageException extends RuntimeException {

    public AvatarStorageException(String message) {
        super(message);
    }

    public AvatarStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
