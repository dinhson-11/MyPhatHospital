package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload gửi sang FastAPI AI Service /api/v1/ai/chat/message.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatbotRequest {

    private String message;

    @JsonProperty("session_id")
    private String sessionId;
}
