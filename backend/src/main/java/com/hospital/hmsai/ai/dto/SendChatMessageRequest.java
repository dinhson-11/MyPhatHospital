package com.hospital.hmsai.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request gửi tin nhắn trong phiên chat (FR-10).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendChatMessageRequest {

    private Long sessionId;

    private Long patientId;

    @NotBlank(message = "Tin nhắn không được để trống")
    private String message;
}
