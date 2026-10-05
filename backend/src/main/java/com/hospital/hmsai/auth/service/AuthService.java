package com.hospital.hmsai.auth.service;

import com.hospital.hmsai.auth.dto.AuthResponse;
import com.hospital.hmsai.auth.dto.LoginRequest;
import com.hospital.hmsai.auth.dto.RefreshTokenRequest;
import com.hospital.hmsai.auth.dto.RegisterRequest;

/**
 * Service interface cho xác thực (đăng ký, đăng nhập, refresh token).
 */
public interface AuthService {

    /**
     * Đăng ký tài khoản bệnh nhân mới.
     * Tự động gán role PATIENT.
     */
    AuthResponse register(RegisterRequest request);

    /**
     * Đăng nhập bằng username/password.
     * Trả về access token + refresh token.
     */
    AuthResponse login(LoginRequest request);

    /**
     * Tạo access token mới từ refresh token hợp lệ.
     */
    AuthResponse refreshToken(RefreshTokenRequest request);
}
