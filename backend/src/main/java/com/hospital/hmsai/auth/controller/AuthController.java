package com.hospital.hmsai.auth.controller;

import com.hospital.hmsai.auth.dto.AuthResponse;
import com.hospital.hmsai.auth.dto.LoginRequest;
import com.hospital.hmsai.auth.dto.RefreshTokenRequest;
import com.hospital.hmsai.auth.dto.RegisterRequest;
import com.hospital.hmsai.auth.service.AuthService;
import com.hospital.hmsai.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller xác thực – đăng ký, đăng nhập, refresh token.
 * Tất cả endpoints đều public (permitAll trong SecurityConfig).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "APIs xác thực: đăng ký, đăng nhập, refresh token")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản bệnh nhân", description = "Tạo tài khoản mới với role PATIENT")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        log.info("POST /api/v1/auth/register – username: {}", request.getUsername());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Đăng ký thành công"));
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Xác thực bằng username/password, trả về JWT tokens")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        log.info("POST /api/v1/auth/login – username: {}", request.getUsername());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Đăng nhập thành công"));
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh token", description = "Tạo access token mới từ refresh token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        log.info("POST /api/v1/auth/refresh-token");
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Refresh token thành công"));
    }
}
