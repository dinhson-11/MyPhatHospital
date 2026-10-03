package com.hospital.hmsai.ai.controller;

import com.hospital.hmsai.ai.dto.ChatMessageResponseDto;
import com.hospital.hmsai.ai.dto.ChatSessionResponseDto;
import com.hospital.hmsai.ai.dto.SendChatMessageRequest;
import com.hospital.hmsai.ai.service.ChatService;
import com.hospital.hmsai.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cho AI Chatbot y tế và quản lý phiên hội thoại (FR-10).
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "AI Chatbot", description = "Tư vấn triệu chứng, phân luồng chuyên khoa và quản lý phiên hội thoại")
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "Tạo phiên chat mới")
    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<ChatSessionResponseDto>> createSession(
            @RequestParam(required = false) Long patientId) {
        ChatSessionResponseDto session = chatService.createSession(patientId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(session, "Tạo phiên chat thành công"));
    }

    @Operation(summary = "Lấy danh sách các phiên chat")
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<ChatSessionResponseDto>>> getSessions(
            @RequestParam(required = false) Long patientId) {
        List<ChatSessionResponseDto> sessions = patientId != null
                ? chatService.getSessionsByPatient(patientId)
                : chatService.getAllSessions();
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    @Operation(summary = "Lấy thông tin chi tiết phiên chat")
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ChatSessionResponseDto>> getSession(
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getSession(sessionId)));
    }

    @Operation(summary = "Lấy toàn bộ tin nhắn trong phiên chat")
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponseDto>>> getSessionMessages(
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getSessionMessages(sessionId)));
    }

    @Operation(summary = "Gửi tin nhắn trong phiên cụ thể")
    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponseDto>> sendMessageToSession(
            @PathVariable Long sessionId,
            @Valid @RequestBody SendChatMessageRequest request) {
        request.setSessionId(sessionId);
        ChatMessageResponseDto response = chatService.sendMessage(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Gửi tin nhắn nhanh (tự động tạo phiên nếu chưa có)")
    @PostMapping("/message")
    public ResponseEntity<ApiResponse<ChatMessageResponseDto>> sendMessage(
            @Valid @RequestBody SendChatMessageRequest request) {
        ChatMessageResponseDto response = chatService.sendMessage(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Đóng phiên chat")
    @PostMapping("/sessions/{sessionId}/close")
    public ResponseEntity<ApiResponse<Void>> closeSession(@PathVariable Long sessionId) {
        chatService.closeSession(sessionId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đóng phiên chat thành công"));
    }
}
