package com.hospital.hmsai.user.avatar;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Ảnh lưu trên kho ảnh, tài khoản chỉ giữ link + mã ảnh. Không chạy trong transaction:
 * gọi kho ảnh qua mạng không được giữ kết nối DB; lưu tài khoản thất bại thì dọn ảnh vừa tải lên.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AvatarServiceImpl implements AvatarService {

    static final int MAX_BYTES = 5 * 1024 * 1024;

    private final UserRepository userRepository;
    private final AvatarStorage storage;

    @Override
    public AvatarResponse updateAvatar(Long userId, byte[] image) {
        if (!storage.isConfigured()) {
            throw new BusinessException("Chưa cấu hình kho ảnh (CLOUDINARY_URL) nên chưa đổi được ảnh đại diện");
        }
        validate(image);
        User user = findUser(userId);
        String oldPublicId = user.getAvatarPublicId();

        String publicId = "user-" + userId + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        StoredAvatar stored = storage.upload(image, publicId);
        user.setAvatarUrl(stored.url());
        user.setAvatarPublicId(stored.publicId());
        try {
            userRepository.save(user);
        } catch (RuntimeException e) {
            deleteQuietly(stored.publicId());
            throw e;
        }
        if (oldPublicId != null) {
            deleteQuietly(oldPublicId);
        }
        log.info("Đổi ảnh đại diện tài khoản ID {}", userId);
        return new AvatarResponse(stored.url());
    }

    @Override
    public void removeAvatar(Long userId) {
        User user = findUser(userId);
        String oldPublicId = user.getAvatarPublicId();
        if (user.getAvatarUrl() == null && oldPublicId == null) return;

        user.setAvatarUrl(null);
        user.setAvatarPublicId(null);
        userRepository.save(user);
        if (oldPublicId != null) {
            deleteQuietly(oldPublicId);
        }
        log.info("Gỡ ảnh đại diện tài khoản ID {}", userId);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản", "id", userId));
    }

    private static void validate(byte[] image) {
        if (image == null || image.length == 0) {
            throw new BusinessException("Vui lòng chọn ảnh đại diện");
        }
        if (image.length > MAX_BYTES) {
            throw new BusinessException("Ảnh vượt quá dung lượng cho phép (tối đa 5MB)");
        }
        if (!AvatarImageType.isSupported(image)) {
            throw new BusinessException("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP");
        }
    }

    /** Ảnh cũ / ảnh mồ côi còn trên kho không ảnh hưởng người dùng – chỉ ghi log để dọn sau. */
    private void deleteQuietly(String publicId) {
        if (!storage.isConfigured()) {
            log.warn("Chưa cấu hình kho ảnh, không xóa được ảnh {}", publicId);
            return;
        }
        try {
            storage.delete(publicId);
        } catch (RuntimeException e) {
            log.warn("Không xóa được ảnh {} trên kho ảnh: {}", publicId, e.getMessage());
        }
    }
}
