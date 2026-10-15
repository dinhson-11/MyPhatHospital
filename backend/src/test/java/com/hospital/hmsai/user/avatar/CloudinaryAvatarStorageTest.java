package com.hospital.hmsai.user.avatar;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CloudinaryAvatarStorageTest {

    @Test
    @DisplayName("Thiếu CLOUDINARY_URL → kho ảnh tắt; gọi tải lên báo lỗi kho ảnh")
    void notConfiguredWithoutUrl() {
        CloudinaryAvatarStorage storage = new CloudinaryAvatarStorage("", "myphat-hospital/avatars");

        assertFalse(storage.isConfigured());
        assertThrows(AvatarStorageException.class, () -> storage.upload(new byte[]{1}, "user-1-x"));
    }

    @Test
    @DisplayName("Link hiển thị: HTTPS, tự chọn định dạng/chất lượng (f_auto,q_auto), gắn phiên bản để không dính cache cũ")
    void buildsDeliveryUrl() {
        CloudinaryAvatarStorage storage =
                new CloudinaryAvatarStorage("cloudinary://123456:secret@demo-cloud", "myphat-hospital/avatars");

        assertTrue(storage.isConfigured());
        assertEquals("https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto/v1712345678/myphat-hospital/avatars/user-12-abc",
                storage.deliveryUrl("myphat-hospital/avatars/user-12-abc", 1712345678L));
    }
}
