package com.hospital.hmsai.user.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.security.CustomUserDetails;
import com.hospital.hmsai.user.dto.CreateUserRequest;
import com.hospital.hmsai.user.dto.UpdateUserRequest;
import com.hospital.hmsai.user.dto.UserResponse;
import com.hospital.hmsai.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản lý User – chỉ dành cho ADMIN.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "User Management", description = "APIs quản lý tài khoản người dùng (ADMIN)")
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo user mới", description = "Admin tạo tài khoản cho nhân viên/bệnh nhân với role chỉ định")
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody CreateUserRequest request) {
        log.info("POST /api/v1/users – username: {}", request.getUsername());
        UserResponse response = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Tạo tài khoản thành công"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy thông tin user theo ID")
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable Long id) {
        log.info("GET /api/v1/users/{}", id);
        UserResponse response = userService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách users", description = "Phân trang, hỗ trợ tìm kiếm theo tên")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search) {
        log.info("GET /api/v1/users – page={}, size={}, search={}", page, size, search);

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<UserResponse> result;
        if (search != null && !search.isBlank()) {
            result = userService.searchByName(search, pageable);
        } else {
            result = userService.getAll(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cập nhật thông tin user")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            Authentication authentication) {
        log.info("PUT /api/v1/users/{}", id);
        // Quản trị viên không được tự khóa mình hoặc tự gỡ vai trò ADMIN (sẽ mất quyền quản trị hệ thống)
        if (isSelf(id, authentication)
                && ("LOCKED".equals(request.getStatus())
                    || (request.getRoleCodes() != null && !request.getRoleCodes().isEmpty()
                        && request.getRoleCodes().stream().noneMatch("ADMIN"::equalsIgnoreCase)))) {
            throw new BusinessException("Không thể tự khóa hoặc tự gỡ quyền quản trị của chính mình");
        }
        UserResponse response = userService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật thành công"));
    }

    @PatchMapping("/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Khóa tài khoản user")
    public ResponseEntity<ApiResponse<Void>> lockUser(@PathVariable Long id, Authentication authentication) {
        log.info("PATCH /api/v1/users/{}/lock", id);
        if (isSelf(id, authentication)) {
            throw new BusinessException("Không thể tự khóa tài khoản của chính mình");
        }
        userService.lockUser(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã khóa tài khoản"));
    }

    @PatchMapping("/{id}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mở khóa tài khoản user")
    public ResponseEntity<ApiResponse<Void>> unlockUser(@PathVariable Long id) {
        log.info("PATCH /api/v1/users/{}/unlock", id);
        userService.unlockUser(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã mở khóa tài khoản"));
    }

    /** id tài khoản cần thao tác có phải chính người đang đăng nhập không. */
    private static boolean isSelf(Long id, Authentication authentication) {
        return authentication != null
                && authentication.getPrincipal() instanceof CustomUserDetails details
                && id != null
                && id.equals(details.getUserId());
    }
}
