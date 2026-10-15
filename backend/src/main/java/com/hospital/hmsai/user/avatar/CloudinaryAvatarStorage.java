package com.hospital.hmsai.user.avatar;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Kho ảnh đại diện trên Cloudinary (CDN). Khóa bí mật chỉ nằm ở backend (CLOUDINARY_URL).
 * Ảnh được Cloudinary cắt vuông 512px theo khuôn mặt ngay khi nhận; link hiển thị dùng f_auto,q_auto
 * (định dạng/chất lượng nhẹ nhất cho từng trình duyệt, không giữ metadata EXIF).
 */
@Component
@Slf4j
public class CloudinaryAvatarStorage implements AvatarStorage {

    private static final int SIZE = 512;

    /** null khi chưa cấu hình CLOUDINARY_URL. */
    private final Cloudinary cloudinary;
    private final String folder;

    public CloudinaryAvatarStorage(@Value("${avatar.cloudinary-url:}") String cloudinaryUrl,
                                   @Value("${avatar.folder:myphat-hospital/avatars}") String folder) {
        this.cloudinary = cloudinaryUrl == null || cloudinaryUrl.isBlank() ? null : new Cloudinary(cloudinaryUrl.trim());
        if (cloudinary != null) {
            // Không gắn tham số theo dõi SDK (?_a=...) vào link ảnh lưu trong DB
            cloudinary.config.analytics = false;
        }
        this.folder = folder;
        if (cloudinary == null) {
            log.warn("Chưa cấu hình CLOUDINARY_URL: tắt chức năng tải ảnh đại diện (hiển thị chữ cái đầu tên)");
        }
    }

    @Override
    public boolean isConfigured() {
        return cloudinary != null;
    }

    @Override
    public StoredAvatar upload(byte[] image, String publicId) {
        requireConfigured();
        try {
            Map<?, ?> result = cloudinary.uploader().upload(image, ObjectUtils.asMap(
                    "folder", folder,
                    "public_id", publicId,
                    "overwrite", false,
                    "resource_type", "image",
                    "allowed_formats", "jpg,png,webp",
                    "transformation", new Transformation<>().width(SIZE).height(SIZE).crop("fill").gravity("face")));
            String storedId = String.valueOf(result.get("public_id"));
            long version = Long.parseLong(String.valueOf(result.get("version")));
            return new StoredAvatar(deliveryUrl(storedId, version), storedId);
        } catch (Exception e) {
            throw new AvatarStorageException("Không tải được ảnh lên kho ảnh", e);
        }
    }

    @Override
    public void delete(String publicId) {
        requireConfigured();
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("invalidate", true));
        } catch (Exception e) {
            throw new AvatarStorageException("Không xóa được ảnh trên kho ảnh", e);
        }
    }

    /** Link CDN của ảnh: https, f_auto,q_auto, kèm phiên bản. */
    String deliveryUrl(String publicId, long version) {
        return cloudinary.url()
                .secure(true)
                .version(version)
                .transformation(new Transformation<>().fetchFormat("auto").quality("auto"))
                .generate(publicId);
    }

    private void requireConfigured() {
        if (cloudinary == null) {
            throw new AvatarStorageException("Chưa cấu hình kho ảnh (CLOUDINARY_URL)");
        }
    }
}
