package com.hospital.hmsai.security;

import com.hospital.hmsai.ai.dto.ChatMessageResponseDto;
import com.hospital.hmsai.ai.dto.ChatSessionResponseDto;
import com.hospital.hmsai.ai.repository.ChatSessionRepository;
import com.hospital.hmsai.ai.service.ChatAccessService;
import com.hospital.hmsai.ai.service.ChatService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phiên chat của chatbot công khai là dữ liệu riêng tư: id phiên là số tăng dần nên không được dùng id làm "chìa khóa".
 * Truy cập một phiên cần mã X-Chat-Token (cấp khi tạo phiên), hoặc là Quản trị viên, hoặc là bệnh nhân chủ phiên.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChatAccessControlTest {

    private static final String TOKEN_HEADER = ChatAccessService.TOKEN_HEADER;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ChatAccessService chatAccess;

    @MockBean
    private ChatService chatService;

    @MockBean
    private ChatSessionRepository sessionRepository;

    private void sessionExists(long id) {
        when(sessionRepository.existsById(id)).thenReturn(true);
    }

    @Test
    @DisplayName("CHAT-SEC-01: Mã phiên ký bằng khóa máy chủ: đúng với phiên của nó, sai với phiên khác và với mã giả")
    void tokenIsBoundToSession() {
        String t1 = chatAccess.issueToken(1L);
        assertTrue(chatAccess.isValidToken(1L, t1));
        assertFalse(chatAccess.isValidToken(2L, t1));
        assertFalse(chatAccess.isValidToken(1L, "gia-mao"));
        assertFalse(chatAccess.isValidToken(1L, null));
        assertNotEquals(t1, chatAccess.issueToken(2L));
    }

    @Test
    @DisplayName("CHAT-SEC-02: Khách tạo phiên được cấp sessionToken; patientId do client gửi lên bị bỏ qua")
    void anonymousCreateSessionGetsTokenAndIgnoresPatientId() throws Exception {
        when(chatService.createSession(any())).thenReturn(ChatSessionResponseDto.builder().id(7L).build());

        mockMvc.perform(post("/api/v1/chat/sessions").param("patientId", "99"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.sessionToken").value(chatAccess.issueToken(7L)));

        verify(chatService).createSession(eq(null));
    }

    @Test
    @DisplayName("CHAT-SEC-03: Khách không có mã không đọc được tin nhắn của phiên (dù biết id) → 403")
    void anonymousCannotReadMessagesWithoutToken() throws Exception {
        sessionExists(5L);

        mockMvc.perform(get("/api/v1/chat/sessions/5/messages"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/chat/sessions/5/messages").header(TOKEN_HEADER, "mã-sai"))
                .andExpect(status().isForbidden());
        // Mã của phiên KHÁC không dùng được cho phiên này
        mockMvc.perform(get("/api/v1/chat/sessions/5/messages").header(TOKEN_HEADER, chatAccess.issueToken(6L)))
                .andExpect(status().isForbidden());

        verify(chatService, never()).getSessionMessages(anyLong());
    }

    @Test
    @DisplayName("CHAT-SEC-04: Có đúng mã phiên thì đọc và đóng được phiên")
    void tokenHolderCanReadAndClose() throws Exception {
        when(chatService.getSessionMessages(5L)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/chat/sessions/5/messages").header(TOKEN_HEADER, chatAccess.issueToken(5L)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/chat/sessions/5/close").header(TOKEN_HEADER, chatAccess.issueToken(5L)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/chat/sessions/5/close"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CHAT-SEC-05: Khách không liệt kê được các phiên chat (403); id phiên không còn là chìa khóa")
    void anonymousCannotListSessions() throws Exception {
        mockMvc.perform(get("/api/v1/chat/sessions"))
                .andExpect(status().isForbidden());
        verify(chatService, never()).getAllSessions(anyInt());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("CHAT-SEC-06: Quản trị viên xem được mọi phiên và danh sách đầy đủ")
    void adminCanReadAnySession() throws Exception {
        when(chatService.getAllSessions(anyInt())).thenReturn(List.of());
        when(chatService.getSessionMessages(5L)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/chat/sessions")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/chat/sessions/5/messages")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("CHAT-SEC-07: Bệnh nhân chỉ đọc được phiên của chính mình; phiên của người khác → 403")
    void patientOnlyReadsOwnSessions() throws Exception {
        when(sessionRepository.existsByIdAndPatient_User_UsernameIgnoreCase(10L, "benhnhan")).thenReturn(true);
        when(chatService.getSessionMessages(10L)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/chat/sessions/10/messages")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/chat/sessions/11/messages")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "dieuduong", roles = {"NURSE"})
    @DisplayName("CHAT-SEC-08: Nhân viên không phải Quản trị viên không xem được danh sách phiên chat của bệnh nhân (403)")
    void nurseCannotListSessions() throws Exception {
        mockMvc.perform(get("/api/v1/chat/sessions")).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CHAT-SEC-09: Gửi tin vào phiên có sẵn mà không có mã → 403; phiên mới thì tạo được và nhận mã")
    void sendMessageRequiresTokenForExistingSession() throws Exception {
        sessionExists(5L);
        when(chatService.sendMessage(any())).thenReturn(ChatMessageResponseDto.builder().sessionId(5L).message("ok").build());

        String body = "{\"sessionId\":5,\"message\":\"đau đầu\",\"patientId\":99}";
        mockMvc.perform(post("/api/v1/chat/message").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        verify(chatService, never()).sendMessage(any());

        mockMvc.perform(post("/api/v1/chat/message").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header(TOKEN_HEADER, chatAccess.issueToken(5L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionToken").value(chatAccess.issueToken(5L)));
        // patientId do khách gửi lên bị xóa trước khi vào service
        verify(chatService).sendMessage(argThat(r -> r.getPatientId() == null));
    }

    @Test
    @DisplayName("CHAT-SEC-10: Id phiên chưa tồn tại → tạo phiên mới (không lộ dữ liệu của ai) và nhận mã của phiên mới")
    void unknownSessionIdCreatesNewSession() throws Exception {
        when(chatService.sendMessage(any())).thenReturn(ChatMessageResponseDto.builder().sessionId(42L).message("ok").build());

        mockMvc.perform(post("/api/v1/chat/message").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":123456789,\"message\":\"xin chào\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionToken").value(chatAccess.issueToken(42L)));
        assertEquals(chatAccess.issueToken(42L), chatAccess.issueToken(42L));
    }
}
