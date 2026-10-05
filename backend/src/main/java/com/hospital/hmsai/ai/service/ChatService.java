package com.hospital.hmsai.ai.service;

import com.hospital.hmsai.ai.dto.ChatMessageResponseDto;
import com.hospital.hmsai.ai.dto.ChatSessionResponseDto;
import com.hospital.hmsai.ai.dto.SendChatMessageRequest;

import java.util.List;

/**
 * Service quản lý phiên và hội thoại AI Chatbot (FR-10).
 * - Quản lý ChatSession và ChatMessage
 * - Kết nối FastAPI AI Service phân loại intent và sinh phản hồi y tế
 * - Fallback local thông minh khi AI Service không khả dụng
 * - Tuân thủ NFR-8: Bắt buộc disclaimer y tế
 */
public interface ChatService {

    /**
     * Tạo một phiên chat mới (có thể gắn với patientId hoặc khách vãng lai).
     */
    ChatSessionResponseDto createSession(Long patientId);

    /**
     * Lấy danh sách tất cả các phiên chat gần nhất.
     */
    List<ChatSessionResponseDto> getAllSessions();

    /**
     * Lấy danh sách các phiên chat của một bệnh nhân.
     */
    List<ChatSessionResponseDto> getSessionsByPatient(Long patientId);

    /**
     * Lấy thông tin chi tiết một phiên chat.
     */
    ChatSessionResponseDto getSession(Long sessionId);

    /**
     * Lấy toàn bộ lịch sử tin nhắn của một phiên chat.
     */
    List<ChatMessageResponseDto> getSessionMessages(Long sessionId);

    /**
     * Gửi tin nhắn từ người dùng, lưu vào DB, gọi AI Service / fallback sinh phản hồi y tế và lưu lại.
     */
    ChatMessageResponseDto sendMessage(SendChatMessageRequest request);

    /**
     * Đóng phiên chat.
     */
    void closeSession(Long sessionId);
}
