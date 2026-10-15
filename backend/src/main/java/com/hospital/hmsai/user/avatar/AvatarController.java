package com.hospital.hmsai.user.avatar;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Ảnh đại diện tài khoản: mỗi người tự đổi ảnh của mình (/me), quản trị viên đổi ảnh của bất kỳ tài khoản nào.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Ảnh đại diện", description = "Đổi / gỡ ảnh đại diện tài khoản (lưu trên Cloudinary)")
public class AvatarController {

    private final AvatarService avatarService;

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Đổi ảnh đại diện của tôi", description = "Ảnh JPG/PNG/WebP tối đa 5MB, được cắt vuông theo khuôn mặt")
    public ResponseEntity<ApiResponse<AvatarResponse>> updateMyAvatar(
            @RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
        Long userId = currentUserId(authentication);
        log.info("POST /api/v1/users/me/avatar – user {}", userId);
        AvatarResponse response = avatarService.updateAvatar(userId, file.getBytes());
        return ResponseEntity.ok(ApiResponse.success(response, "Đã cập nhật ảnh đại diện"));
    }

    @DeleteMapping("/me/avatar")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Gỡ ảnh đại diện của tôi")
    public ResponseEntity<ApiResponse<Void>> removeMyAvatar(Authentication authentication) {
        Long userId = currentUserId(authentication);
        log.info("DELETE /api/v1/users/me/avatar – user {}", userId);
        avatarService.removeAvatar(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã gỡ ảnh đại diện"));
    }

    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Đổi ảnh đại diện của một tài khoản (ADMIN)")
    public ResponseEntity<ApiResponse<AvatarResponse>> updateAvatar(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException {
        log.info("POST /api/v1/users/{}/avatar", id);
        AvatarResponse response = avatarService.updateAvatar(id, file.getBytes());
        return ResponseEntity.ok(ApiResponse.success(response, "Đã cập nhật ảnh đại diện"));
    }

    @DeleteMapping("/{id}/avatar")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Gỡ ảnh đại diện của một tài khoản (ADMIN)")
    public ResponseEntity<ApiResponse<Void>> removeAvatar(@PathVariable Long id) {
        log.info("DELETE /api/v1/users/{}/avatar", id);
        avatarService.removeAvatar(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã gỡ ảnh đại diện"));
    }

    private static Long currentUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails details) {
            return details.getUserId();
        }
        throw new AccessDeniedException("Không xác định được tài khoản đang đăng nhập");
    }
}
