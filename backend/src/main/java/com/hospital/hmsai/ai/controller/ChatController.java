package com.hospital.hmsai.ai.controller;

import com.hospital.hmsai.ai.dto.ChatMessageResponseDto;
import com.hospital.hmsai.ai.dto.ChatSessionResponseDto;
import com.hospital.hmsai.ai.dto.SendChatMessageRequest;
import com.hospital.hmsai.ai.service.ChatAccessService;
import com.hospital.hmsai.ai.service.ChatService;
import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.security.SecurityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cho AI Chatbot y tế và quản lý phiên hội thoại (FR-10).
 * <p>
 * Chatbot dùng được khi chưa đăng nhập, nhưng nội dung hội thoại là riêng tư: đọc/ghi/đóng một phiên cần
 * mã truy cập phiên ({@code X-Chat-Token}, cấp khi tạo phiên) hoặc là chủ phiên/Quản trị viên.
 * Danh sách phiên chỉ dành cho Quản trị viên (tất cả) và bệnh nhân (của chính mình).
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "AI Chatbot", description = "Tư vấn triệu chứng, phân luồng chuyên khoa và quản lý phiên hội thoại")
public class ChatController {

    private final ChatService chatService;
    private final ChatAccessService chatAccess;
    private final SecurityService securityService;

    @Operation(summary = "Tạo phiên chat mới",
            description = "Trả về sessionToken: gửi lại ở header X-Chat-Token cho mọi lần đọc/ghi phiên này")
    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<ChatSessionResponseDto>> createSession(
            @RequestParam(required = false) Long patientId,
            Authentication authentication) {
        ChatSessionResponseDto session = chatService.createSession(chatAccess.resolvePatientId(authentication, patientId));
        session.setSessionToken(chatAccess.issueToken(session.getId()));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(session, "Tạo phiên chat thành công"));
    }

    @Operation(summary = "Lấy danh sách các phiên chat",
            description = "Quản trị viên: tất cả (hoặc theo patientId). Bệnh nhân: chỉ phiên của chính mình")
    @PreAuthorize("hasAnyRole('ADMIN', 'PATIENT')")
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<ChatSessionResponseDto>>> getSessions(
            @RequestParam(required = false) Long patientId,
            @RequestParam(defaultValue = "50") int limit,
            Authentication authentication) {
        List<ChatSessionResponseDto> sessions;
        if (SecurityService.hasAnyRole(authentication, "ADMIN")) {
            sessions = patientId != null
                    ? chatService.getSessionsByPatient(patientId, limit)
                    : chatService.getAllSessions(limit);
        } else {
            Long ownPatientId = securityService.currentPatientId(authentication);
            sessions = ownPatientId == null ? List.of() : chatService.getSessionsByPatient(ownPatientId, limit);
        }
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    @Operation(summary = "Lấy thông tin chi tiết phiên chat")
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ChatSessionResponseDto>> getSession(
            @PathVariable Long sessionId,
            @RequestHeader(value = ChatAccessService.TOKEN_HEADER, required = false) String token,
            Authentication authentication) {
        chatAccess.requireSessionAccess(sessionId, authentication, token);
        return ResponseEntity.ok(ApiResponse.ok(chatService.getSession(sessionId)));
    }

    @Operation(summary = "Lấy toàn bộ tin nhắn trong phiên chat")
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponseDto>>> getSessionMessages(
            @PathVariable Long sessionId,
            @RequestHeader(value = ChatAccessService.TOKEN_HEADER, required = false) String token,
            Authentication authentication) {
        chatAccess.requireSessionAccess(sessionId, authentication, token);
        return ResponseEntity.ok(ApiResponse.ok(chatService.getSessionMessages(sessionId)));
    }

    @Operation(summary = "Gửi tin nhắn trong phiên cụ thể")
    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponseDto>> sendMessageToSession(
            @PathVariable Long sessionId,
            @RequestHeader(value = ChatAccessService.TOKEN_HEADER, required = false) String token,
            @Valid @RequestBody SendChatMessageRequest request,
            Authentication authentication) {
        request.setSessionId(sessionId);
        return ResponseEntity.ok(ApiResponse.ok(send(request, token, authentication)));
    }

    @Operation(summary = "Gửi tin nhắn nhanh (tự động tạo phiên nếu chưa có)",
            description = "Phản hồi có sessionToken của phiên (mới hoặc hiện tại)")
    @PostMapping("/message")
    public ResponseEntity<ApiResponse<ChatMessageResponseDto>> sendMessage(
            @RequestHeader(value = ChatAccessService.TOKEN_HEADER, required = false) String token,
            @Valid @RequestBody SendChatMessageRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(send(request, token, authentication)));
    }

    @Operation(summary = "Đóng phiên chat")
    @PostMapping("/sessions/{sessionId}/close")
    public ResponseEntity<ApiResponse<Void>> closeSession(
            @PathVariable Long sessionId,
            @RequestHeader(value = ChatAccessService.TOKEN_HEADER, required = false) String token,
            Authentication authentication) {
        chatAccess.requireSessionAccess(sessionId, authentication, token);
        chatService.closeSession(sessionId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đóng phiên chat thành công"));
    }

    /** Kiểm quyền phiên (nếu đã tồn tại), chốt hồ sơ bệnh nhân theo người đăng nhập rồi gửi tin nhắn. */
    private ChatMessageResponseDto send(SendChatMessageRequest request, String token, Authentication authentication) {
        chatAccess.requireAccessIfSessionExists(request.getSessionId(), authentication, token);
        request.setPatientId(chatAccess.resolvePatientId(authentication, request.getPatientId()));
        ChatMessageResponseDto response = chatService.sendMessage(request);
        response.setSessionToken(chatAccess.issueToken(response.getSessionId()));
        return response;
    }
}
