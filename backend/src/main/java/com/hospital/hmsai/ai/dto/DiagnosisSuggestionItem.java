package com.hospital.hmsai.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho một gợi ý chẩn đoán ICD-10 (FR-11.3 – Sprint 6).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosisSuggestionItem {

    /** Mã ICD-10 (vd: I10, J00, K29.7) */
    private String code;

    /** Tên bệnh tiếng Việt */
    private String name;

    /** Độ tin cậy gợi ý (0-100%) */
    private Double confidence;

    /** Lý do AI đề xuất chẩn đoán này */
    private String reason;
}
