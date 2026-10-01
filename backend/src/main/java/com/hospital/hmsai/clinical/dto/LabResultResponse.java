package com.hospital.hmsai.clinical.dto;

import com.hospital.hmsai.clinical.entity.LabResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabResultResponse {

    private Long id;
    private Long labOrderId;
    private String resultText;
    private String resultFileUrl;
    private LocalDateTime resultedAt;
    private LocalDateTime createdAt;

    public static LabResultResponse fromEntity(LabResult result) {
        if (result == null) return null;
        return LabResultResponse.builder()
                .id(result.getId())
                .labOrderId(result.getLabOrder() != null ? result.getLabOrder().getId() : null)
                .resultText(result.getResultText())
                .resultFileUrl(result.getResultFileUrl())
                .resultedAt(result.getResultedAt())
                .createdAt(result.getCreatedAt())
                .build();
    }
}
