package com.hospital.hmsai.auth.service.impl;

import com.hospital.hmsai.auth.dto.AuthResponse;
import com.hospital.hmsai.auth.dto.LoginRequest;
import com.hospital.hmsai.auth.dto.RefreshTokenRequest;
import com.hospital.hmsai.auth.dto.RegisterRequest;
import com.hospital.hmsai.auth.service.AuthService;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientCodeGenerator;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.security.JwtService;
import com.hospital.hmsai.user.entity.Role;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.entity.UserStatus;
import com.hospital.hmsai.user.repository.RoleRepository;
import com.hospital.hmsai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Implementation của AuthService.
 * Xử lý đăng ký bệnh nhân, đăng nhập, và refresh token.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private static final String DEFAULT_PATIENT_ROLE = "PATIENT";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PatientRepository patientRepository;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Đăng ký tài khoản mới: {}", request.getUsername());

        // Kiểm tra trùng username
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("User", "username", request.getUsername());
        }

        // Kiểm tra trùng email (nếu có)
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        // Lấy role PATIENT
        Role patientRole = roleRepository.findByCode(DEFAULT_PATIENT_ROLE)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "code", DEFAULT_PATIENT_ROLE));

        // Tạo user mới
        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .status(UserStatus.ACTIVE)
                .roles(Set.of(patientRole))
                .build();

        User savedUser = userRepository.save(user);
        log.info("Đã tạo user mới: id={}, username={}", savedUser.getId(), savedUser.getUsername());

        // Tạo hồ sơ bệnh nhân liên kết để "Lịch hẹn/Hóa đơn/Hồ sơ của tôi" hoạt động ngay.
        // Không tự gộp với hồ sơ cũ trùng SĐT + họ tên: người lạ có thể nhận hồ sơ của người khác,
        // việc liên kết hồ sơ cũ phải do lễ tân xác minh.
        Patient patient = Patient.builder()
                .user(savedUser)
                .patientCode(PatientCodeGenerator.generate(patientRepository::existsByPatientCode))
                .fullName(savedUser.getFullName())
                .phone(savedUser.getPhone())
                .build();
        patientRepository.save(patient);
        log.info("Đã tạo hồ sơ bệnh nhân {} cho user {}", patient.getPatientCode(), savedUser.getUsername());

        // Sinh tokens
        UserDetails userDetails = buildUserDetails(savedUser);
        return buildAuthResponse(savedUser, userDetails);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("Đăng nhập: {}", request.getUsername());

        try {
            // Spring Security xác thực qua AuthenticationManager
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();

            // Load user entity để lấy thông tin đầy đủ
            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "username", request.getUsername()));

            log.info("Đăng nhập thành công: id={}, username={}", user.getId(), user.getUsername());
            return buildAuthResponse(user, userDetails);

        } catch (LockedException e) {
            log.warn("Tài khoản bị khóa: {}", request.getUsername());
            throw new BusinessException("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
        } catch (BadCredentialsException e) {
            log.warn("Sai thông tin đăng nhập: {}", request.getUsername());
            throw e;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        log.info("Refresh token request");

        String refreshToken = request.getRefreshToken();

        // Extract username từ refresh token
        String username;
        try {
            username = jwtService.extractUsername(refreshToken);
        } catch (Exception e) {
            throw new BusinessException("Refresh token không hợp lệ hoặc đã hết hạn");
        }

        // Load user
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("Tài khoản đã bị khóa");
        }

        // Validate refresh token
        UserDetails userDetails = buildUserDetails(user);
        if (!jwtService.isTokenValid(refreshToken, userDetails)) {
            throw new BusinessException("Refresh token không hợp lệ hoặc đã hết hạn");
        }

        // Sinh access token mới
        String newAccessToken = jwtService.generateToken(userDetails);

        log.info("Refresh token thành công cho user: {}", username);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken) // Giữ nguyên refresh token
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpiration())
                .user(buildUserInfo(user))
                .build();
    }

    // ======================== Helper methods ========================

    /**
     * Build Spring Security UserDetails từ entity User.
     */
    private UserDetails buildUserDetails(User user) {
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getCode()))
                .toList();

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(authorities)
                .build();
    }

    /**
     * Build AuthResponse chứa tokens và thông tin user.
     */
    private AuthResponse buildAuthResponse(User user, UserDetails userDetails) {
        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpiration())
                .user(buildUserInfo(user))
                .build();
    }

    /**
     * Build UserInfo DTO từ entity User.
     */
    private AuthResponse.UserInfo buildUserInfo(User user) {
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getCode)
                .toList();

        return AuthResponse.UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .roles(roleNames)
                .build();
    }
}
