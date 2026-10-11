package com.hospital.hmsai.security;

import com.hospital.hmsai.hr.dto.StaffResponse;
import com.hospital.hmsai.hr.service.StaffService;
import com.hospital.hmsai.user.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Các biện pháp siết quyền truy cập: CORS theo danh sách nguồn, token của tài khoản bị khóa, hồ sơ nhân viên.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccessHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StaffService staffService;

    @MockBean
    private UserService userService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    // ---------------- CORS ----------------

    @Test
    @DisplayName("ACC-SEC-01: CORS chỉ cho phép nguồn giao diện đã cấu hình (localhost:3000), từ chối nguồn lạ")
    void corsAllowsOnlyConfiguredOrigins() throws Exception {
        mockMvc.perform(options("/api/v1/public/doctors")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));

        mockMvc.perform(options("/api/v1/public/doctors")
                        .header("Origin", "https://trang-doc-hai.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ACC-SEC-02: CORS cho phép header X-Chat-Token và Authorization nhưng không cho header tùy ý")
    void corsAllowsOnlyKnownHeaders() throws Exception {
        mockMvc.perform(options("/api/v1/chat/message")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type,x-chat-token"))
                .andExpect(status().isOk());

        mockMvc.perform(options("/api/v1/chat/message")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "x-tuy-y"))
                .andExpect(status().isForbidden());
    }

    // ---------------- Hồ sơ nhân viên ----------------

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("ACC-SEC-03: Bệnh nhân không xem được hồ sơ chi tiết nhân viên (email, SĐT, số chứng chỉ) → 403")
    void patientCannotReadStaffDetail() throws Exception {
        mockMvc.perform(get("/api/v1/staff/1")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "bs.nga", roles = {"DOCTOR"})
    @DisplayName("ACC-SEC-04: Nhân viên y tế xem được hồ sơ chi tiết nhân viên")
    void doctorCanReadStaffDetail() throws Exception {
        when(staffService.getStaffById(1L)).thenReturn(StaffResponse.builder().id(1L).build());
        mockMvc.perform(get("/api/v1/staff/1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("ACC-SEC-05: Chưa đăng nhập không xem được hồ sơ nhân viên (401)")
    void anonymousCannotReadStaffDetail() throws Exception {
        mockMvc.perform(get("/api/v1/staff/1")).andExpect(status().isUnauthorized());
    }

    // ---------------- Token của tài khoản bị khóa ----------------

    private JwtAuthFilter filterFor(boolean locked) {
        JwtService jwtService = mock(JwtService.class);
        when(jwtService.extractUsername("tok")).thenReturn("nhanvien");
        when(jwtService.isTokenValid(any(), any())).thenReturn(true);
        UserDetails details = new CustomUserDetails(5L, "nhanvien", "x", true, !locked,
                List.of(new SimpleGrantedAuthority("ROLE_DOCTOR")));
        UserDetailsService uds = mock(UserDetailsService.class);
        when(uds.loadUserByUsername("nhanvien")).thenReturn(details);
        return new JwtAuthFilter(jwtService, uds);
    }

    private void runFilter(JwtAuthFilter filter) throws Exception {
        HttpServletRequest request = new MockHttpServletRequest();
        ((MockHttpServletRequest) request).addHeader("Authorization", "Bearer tok");
        HttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, response, chain);
        verify(chain).doFilter(request, response);
    }

    @Test
    @DisplayName("ACC-SEC-06: Tài khoản đã bị khóa thì token còn hạn cũng không còn xác thực được")
    void lockedUserTokenIsRejected() throws Exception {
        runFilter(filterFor(true));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("ACC-SEC-07: Tài khoản đang hoạt động với token hợp lệ được xác thực bình thường")
    void activeUserTokenIsAccepted() throws Exception {
        runFilter(filterFor(false));
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }

    // ---------------- Quản trị viên không tự khóa mình ----------------

    private static UsernamePasswordAuthenticationToken adminSession(long userId) {
        UserDetails me = new CustomUserDetails(userId, "admin", "x", true, true,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        return new UsernamePasswordAuthenticationToken(me, null, me.getAuthorities());
    }

    @Test
    @DisplayName("ACC-SEC-08: Quản trị viên không tự khóa tài khoản của chính mình (400)")
    void adminCannotLockSelf() throws Exception {
        mockMvc.perform(patch("/api/v1/users/1/lock").with(authentication(adminSession(1L))))
                .andExpect(status().isBadRequest());
        verify(userService, never()).lockUser(any());

        // khóa tài khoản của người khác thì được
        mockMvc.perform(patch("/api/v1/users/2/lock").with(authentication(adminSession(1L))))
                .andExpect(status().isOk());
        verify(userService).lockUser(2L);
    }

    @Test
    @DisplayName("ACC-SEC-09: Quản trị viên không tự đặt trạng thái LOCKED hoặc tự gỡ vai trò ADMIN của mình (400)")
    void adminCannotDemoteSelfViaUpdate() throws Exception {
        mockMvc.perform(put("/api/v1/users/1").with(authentication(adminSession(1L)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/v1/users/1").with(authentication(adminSession(1L)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"roleCodes\":[\"DOCTOR\"]}"))
                .andExpect(status().isBadRequest());
        verify(userService, never()).update(any(), any());
    }
}
