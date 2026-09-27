package com.hospital.hmsai.auth.service;

import com.hospital.hmsai.auth.dto.AuthResponse;
import com.hospital.hmsai.auth.dto.LoginRequest;
import com.hospital.hmsai.auth.dto.RefreshTokenRequest;
import com.hospital.hmsai.auth.dto.RegisterRequest;
import com.hospital.hmsai.auth.service.impl.AuthServiceImpl;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.security.JwtService;
import com.hospital.hmsai.user.entity.Role;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.entity.UserStatus;
import com.hospital.hmsai.user.repository.RoleRepository;
import com.hospital.hmsai.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests cho AuthServiceImpl.
 * Kiểm tra đăng ký, đăng nhập, refresh token – cả happy path lẫn edge cases.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthServiceImpl authService;

    private Role patientRole;

    @BeforeEach
    void setUp() {
        patientRole = Role.builder().id(7L).code("PATIENT").name("Bệnh nhân").build();
    }

    // ======================== Register Tests ========================

    @Nested
    @DisplayName("Đăng ký tài khoản")
    class RegisterTests {

        @Test
        @DisplayName("Đăng ký thành công với thông tin hợp lệ")
        void register_Success() {
            // Given
            RegisterRequest request = RegisterRequest.builder()
                    .username("nguyenvana")
                    .password("Password1")
                    .fullName("Nguyễn Văn A")
                    .email("nguyenvana@email.com")
                    .phone("0901234567")
                    .build();

            when(userRepository.existsByUsername("nguyenvana")).thenReturn(false);
            when(userRepository.existsByEmail("nguyenvana@email.com")).thenReturn(false);
            when(roleRepository.findByCode("PATIENT")).thenReturn(Optional.of(patientRole));
            when(passwordEncoder.encode("Password1")).thenReturn("$2a$10$encodedHash");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                user.setId(1L);
                return user;
            });
            when(jwtService.generateToken(any())).thenReturn("access-token");
            when(jwtService.generateRefreshToken(any())).thenReturn("refresh-token");
            when(jwtService.getAccessTokenExpiration()).thenReturn(1800000L);

            // When
            AuthResponse response = authService.register(request);

            // Then
            assertNotNull(response);
            assertEquals("access-token", response.getAccessToken());
            assertEquals("refresh-token", response.getRefreshToken());
            assertEquals("Bearer", response.getTokenType());
            assertNotNull(response.getUser());
            assertEquals("nguyenvana", response.getUser().getUsername());
            assertEquals("Nguyễn Văn A", response.getUser().getFullName());
            assertTrue(response.getUser().getRoles().contains("PATIENT"));

            verify(userRepository).save(any(User.class));
            verify(passwordEncoder).encode("Password1");
        }

        @Test
        @DisplayName("Đăng ký thất bại – username trùng lặp")
        void register_DuplicateUsername_ThrowsException() {
            // Given
            RegisterRequest request = RegisterRequest.builder()
                    .username("existinguser")
                    .password("Password1")
                    .fullName("Test User")
                    .build();

            when(userRepository.existsByUsername("existinguser")).thenReturn(true);

            // When & Then
            assertThrows(DuplicateResourceException.class, () -> authService.register(request));
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("Đăng ký thất bại – email trùng lặp")
        void register_DuplicateEmail_ThrowsException() {
            // Given
            RegisterRequest request = RegisterRequest.builder()
                    .username("newuser")
                    .password("Password1")
                    .fullName("Test User")
                    .email("existing@email.com")
                    .build();

            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("existing@email.com")).thenReturn(true);

            // When & Then
            assertThrows(DuplicateResourceException.class, () -> authService.register(request));
            verify(userRepository, never()).save(any(User.class));
        }
    }

    // ======================== Login Tests ========================

    @Nested
    @DisplayName("Đăng nhập")
    class LoginTests {

        @Test
        @DisplayName("Đăng nhập thành công")
        void login_Success() {
            // Given
            LoginRequest request = LoginRequest.builder()
                    .username("admin")
                    .password("Admin@123")
                    .build();

            org.springframework.security.core.userdetails.User userDetails =
                    new org.springframework.security.core.userdetails.User(
                            "admin",
                            "$2a$10$encodedHash",
                            List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    );
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());

            when(authenticationManager.authenticate(any())).thenReturn(auth);

            User userEntity = User.builder()
                    .id(1L)
                    .username("admin")
                    .passwordHash("$2a$10$encodedHash")
                    .fullName("Quản trị viên")
                    .email("admin@hospital.com")
                    .status(UserStatus.ACTIVE)
                    .roles(Set.of(Role.builder().id(1L).code("ADMIN").name("Quản trị viên").build()))
                    .build();
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(userEntity));
            when(jwtService.generateToken(any())).thenReturn("access-token");
            when(jwtService.generateRefreshToken(any())).thenReturn("refresh-token");
            when(jwtService.getAccessTokenExpiration()).thenReturn(1800000L);

            // When
            AuthResponse response = authService.login(request);

            // Then
            assertNotNull(response);
            assertEquals("access-token", response.getAccessToken());
            assertEquals(1L, response.getUser().getId());
            assertTrue(response.getUser().getRoles().contains("ADMIN"));

            verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        }

        @Test
        @DisplayName("Đăng nhập thất bại – sai mật khẩu")
        void login_WrongPassword_ThrowsBadCredentials() {
            // Given
            LoginRequest request = LoginRequest.builder()
                    .username("admin")
                    .password("WrongPassword1")
                    .build();

            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            // When & Then
            assertThrows(BadCredentialsException.class, () -> authService.login(request));
        }

        @Test
        @DisplayName("Đăng nhập thất bại – tài khoản bị khóa")
        void login_LockedAccount_ThrowsBusinessException() {
            // Given
            LoginRequest request = LoginRequest.builder()
                    .username("lockeduser")
                    .password("Password1")
                    .build();

            when(authenticationManager.authenticate(any()))
                    .thenThrow(new LockedException("Account locked"));

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class,
                    () -> authService.login(request));
            assertTrue(exception.getMessage().contains("khóa"));
        }
    }

    // ======================== Refresh Token Tests ========================

    @Nested
    @DisplayName("Refresh Token")
    class RefreshTokenTests {

        @Test
        @DisplayName("Refresh token thành công")
        void refreshToken_Success() {
            // Given
            RefreshTokenRequest request = RefreshTokenRequest.builder()
                    .refreshToken("valid-refresh-token")
                    .build();

            User userEntity = User.builder()
                    .id(1L)
                    .username("admin")
                    .passwordHash("$2a$10$encodedHash")
                    .fullName("Quản trị viên")
                    .status(UserStatus.ACTIVE)
                    .roles(Set.of(Role.builder().id(1L).code("ADMIN").name("Quản trị viên").build()))
                    .build();

            when(jwtService.extractUsername("valid-refresh-token")).thenReturn("admin");
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(userEntity));
            when(jwtService.isTokenValid(eq("valid-refresh-token"), any())).thenReturn(true);
            when(jwtService.generateToken(any())).thenReturn("new-access-token");
            when(jwtService.getAccessTokenExpiration()).thenReturn(1800000L);

            // When
            AuthResponse response = authService.refreshToken(request);

            // Then
            assertNotNull(response);
            assertEquals("new-access-token", response.getAccessToken());
            assertEquals("valid-refresh-token", response.getRefreshToken()); // giữ nguyên
        }

        @Test
        @DisplayName("Refresh token thất bại – token hết hạn/không hợp lệ")
        void refreshToken_InvalidToken_ThrowsBusinessException() {
            // Given
            RefreshTokenRequest request = RefreshTokenRequest.builder()
                    .refreshToken("invalid-token")
                    .build();

            when(jwtService.extractUsername("invalid-token"))
                    .thenThrow(new RuntimeException("Token expired"));

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class,
                    () -> authService.refreshToken(request));
            assertTrue(exception.getMessage().contains("không hợp lệ"));
        }

        @Test
        @DisplayName("Refresh token thất bại – tài khoản bị khóa")
        void refreshToken_LockedAccount_ThrowsBusinessException() {
            // Given
            RefreshTokenRequest request = RefreshTokenRequest.builder()
                    .refreshToken("valid-refresh-token")
                    .build();

            User lockedUser = User.builder()
                    .id(2L)
                    .username("lockeduser")
                    .status(UserStatus.LOCKED)
                    .roles(Set.of(patientRole))
                    .build();

            when(jwtService.extractUsername("valid-refresh-token")).thenReturn("lockeduser");
            when(userRepository.findByUsername("lockeduser")).thenReturn(Optional.of(lockedUser));

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class,
                    () -> authService.refreshToken(request));
            assertTrue(exception.getMessage().contains("khóa"));
        }
    }
}
