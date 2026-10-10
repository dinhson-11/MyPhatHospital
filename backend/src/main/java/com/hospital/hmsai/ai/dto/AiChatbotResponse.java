package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Phản hồi nhận từ FastAPI AI Service /api/v1/ai/chat/message.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatbotResponse {

    private String reply;

    private String intent;

    @JsonProperty("suggested_department")
    private DepartmentSuggestionDto suggestedDepartment;

    @JsonProperty("show_booking_button")
    private Boolean showBookingButton;

    @JsonProperty("session_id")
    private String sessionId;

    /** Python ChatMessageResponse.is_out_of_scope (true với OUT_OF_SCOPE / EMERGENCY). */
    @JsonProperty("is_out_of_scope")
    private Boolean isOutOfScope;

    private String disclaimer;
}
