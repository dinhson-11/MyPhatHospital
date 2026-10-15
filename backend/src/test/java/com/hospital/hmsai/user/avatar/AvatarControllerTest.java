package com.hospital.hmsai.user.avatar;

import com.hospital.hmsai.security.CustomUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AvatarControllerTest {

    private static final byte[] IMAGE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AvatarService avatarService;

    /** Đăng nhập như tài khoản id 7 (vai trò cho trước) – principal thật của hệ thống. */
    private static RequestPostProcessor loggedInAs(String role) {
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        CustomUserDetails details = new CustomUserDetails(7L, "user7", "x", true, true, authorities);
        return authentication(new UsernamePasswordAuthenticationToken(details, null, authorities));
    }

    private static MockMultipartFile image() {
        return new MockMultipartFile("file", "anh.jpg", "image/jpeg", IMAGE);
    }

    @Test
    @DisplayName("Mọi tài khoản (kể cả bệnh nhân) tự đổi ảnh đại diện của chính mình")
    void userUploadsOwnAvatar() throws Exception {
        when(avatarService.updateAvatar(7L, IMAGE)).thenReturn(new AvatarResponse("https://cdn/u7.jpg"));

        mockMvc.perform(multipart("/api/v1/users/me/avatar").file(image()).with(loggedInAs("PATIENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value("https://cdn/u7.jpg"));
    }

    @Test
    @DisplayName("Tự gỡ ảnh đại diện của chính mình")
    void userRemovesOwnAvatar() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me/avatar").with(loggedInAs("DOCTOR")))
                .andExpect(status().isOk());

        verify(avatarService).removeAvatar(7L);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Quản trị viên đổi / gỡ ảnh của tài khoản khác")
    void adminManagesOtherAvatar() throws Exception {
        when(avatarService.updateAvatar(12L, IMAGE)).thenReturn(new AvatarResponse("https://cdn/u12.jpg"));

        mockMvc.perform(multipart("/api/v1/users/12/avatar").file(image()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value("https://cdn/u12.jpg"));
        mockMvc.perform(delete("/api/v1/users/12/avatar"))
                .andExpect(status().isOk());

        verify(avatarService).removeAvatar(12L);
    }

    @Test
    @WithMockUser(roles = "DOCTOR")
    @DisplayName("Không phải quản trị viên thì không đổi được ảnh của người khác (403)")
    void nonAdminCannotChangeOthers() throws Exception {
        mockMvc.perform(multipart("/api/v1/users/12/avatar").file(image()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/users/12/avatar"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(avatarService);
    }

    @Test
    @DisplayName("Chưa đăng nhập → 401")
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(multipart("/api/v1/users/me/avatar").file(image()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(avatarService);
    }

    @Test
    @DisplayName("Kho ảnh lỗi → 502 kèm thông báo dễ hiểu")
    void storageFailureIsBadGateway() throws Exception {
        when(avatarService.updateAvatar(anyLong(), any())).thenThrow(new AvatarStorageException("Không tải được ảnh lên kho ảnh"));

        mockMvc.perform(multipart("/api/v1/users/me/avatar").file(image()).with(loggedInAs("NURSE")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.errorCode").value("AVATAR_STORAGE_ERROR"))
                .andExpect(jsonPath("$.message").value("Kho ảnh đang gặp sự cố, chưa lưu được ảnh. Vui lòng thử lại sau."));
        verify(avatarService).updateAvatar(eq(7L), any());
    }
}
