package com.hospital.hmsai.ai.dto;

import com.hospital.hmsai.ai.entity.AiClinicalSuggestion;
import com.hospital.hmsai.ai.entity.AiSuggestionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAuditLogResponse {
    private Long id;
    private Long visitId;
    private AiSuggestionType suggestionType;
    private String inputSnapshot;
    private String outputContent;
    private BigDecimal confidenceScore;
    private LocalDateTime createdAt;

    public static AiAuditLogResponse fromEntity(AiClinicalSuggestion suggestion) {
        if (suggestion == null) return null;
        return AiAuditLogResponse.builder()
                .id(suggestion.getId())
                .visitId(suggestion.getVisit() != null ? suggestion.getVisit().getId() : null)
                .suggestionType(suggestion.getSuggestionType())
                .inputSnapshot(suggestion.getInputSnapshot())
                .outputContent(suggestion.getOutputContent())
                .confidenceScore(suggestion.getConfidenceScore())
                .createdAt(suggestion.getCreatedAt())
                .build();
    }
}
