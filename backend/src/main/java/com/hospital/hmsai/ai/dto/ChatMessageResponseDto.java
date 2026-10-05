package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.hospital.hmsai.ai.entity.MessageSender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Phản hồi tin nhắn chat từ hệ thống / AI (FR-10).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponseDto {

    private Long messageId;

    private Long sessionId;

    private MessageSender sender;

    private String message;

    private String intent;

    private DepartmentSuggestionDto suggestedDepartment;

    private Boolean showBookingButton;

    private String disclaimer;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
