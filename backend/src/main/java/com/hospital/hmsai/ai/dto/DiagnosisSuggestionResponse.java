package com.hospital.hmsai.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

/**
 * Response DTO cho gợi ý chẩn đoán phân biệt ICD-10 (FR-11.3 – Sprint 6).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosisSuggestionResponse {

    public static final String DEFAULT_DISCLAIMER =
            "Kết quả do AI phân tích chỉ mang tính tham khảo, không thay thế phán đoán lâm sàng của bác sĩ.";

    @Builder.Default
    private List<DiagnosisSuggestionItem> suggestions = Collections.emptyList();

    @Builder.Default
    private Integer totalSuggestions = 0;

    @Builder.Default
    private BigDecimal confidenceScore = new BigDecimal("0.90");

    @Builder.Default
    private String disclaimer = DEFAULT_DISCLAIMER;
}
