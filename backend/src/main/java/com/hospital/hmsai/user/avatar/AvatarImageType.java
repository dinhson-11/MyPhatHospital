package com.hospital.hmsai.user.avatar;

/**
 * Nhận dạng ảnh đại diện theo nội dung (magic bytes) – không tin đuôi file / Content-Type do máy khách gửi.
 * Chỉ nhận JPEG, PNG, WebP (định dạng ảnh chụp phổ biến, không chứa mã thực thi như SVG).
 */
public final class AvatarImageType {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP = {'W', 'E', 'B', 'P'};

    private AvatarImageType() {
    }

    public static boolean isSupported(byte[] content) {
        if (content == null) return false;
        return startsWith(content, 0, JPEG)
                || startsWith(content, 0, PNG)
                || (startsWith(content, 0, RIFF) && startsWith(content, 8, WEBP));
    }

    private static boolean startsWith(byte[] content, int offset, byte[] prefix) {
        if (content.length < offset + prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (content[offset + i] != prefix[i]) return false;
        }
        return true;
    }
}
