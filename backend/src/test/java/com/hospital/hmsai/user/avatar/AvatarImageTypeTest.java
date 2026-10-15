package com.hospital.hmsai.user.avatar;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class AvatarImageTypeTest {

    private static byte[] bytes(int... values) {
        byte[] out = new byte[values.length];
        for (int i = 0; i < values.length; i++) out[i] = (byte) values[i];
        return out;
    }

    @Test
    @DisplayName("Nhận dạng ảnh theo nội dung (magic bytes), không theo tên file")
    void detectsSupportedImages() {
        assertTrue(AvatarImageType.isSupported(bytes(0xFF, 0xD8, 0xFF, 0xE1, 0x00)));
        assertTrue(AvatarImageType.isSupported(bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00)));
        assertTrue(AvatarImageType.isSupported("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    @DisplayName("Từ chối file không phải ảnh JPG/PNG/WebP hoặc quá ngắn")
    void rejectsOtherContent() {
        assertFalse(AvatarImageType.isSupported("GIF89a......".getBytes(StandardCharsets.ISO_8859_1)));
        assertFalse(AvatarImageType.isSupported("<svg xmlns=".getBytes(StandardCharsets.ISO_8859_1)));
        assertFalse(AvatarImageType.isSupported("RIFF\0\0\0\0WAVEfmt ".getBytes(StandardCharsets.ISO_8859_1)));
        assertFalse(AvatarImageType.isSupported(bytes(0xFF, 0xD8)));
        assertFalse(AvatarImageType.isSupported(null));
    }
}
