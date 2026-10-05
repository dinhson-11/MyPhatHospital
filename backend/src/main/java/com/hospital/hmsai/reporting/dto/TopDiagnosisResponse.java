package com.hospital.hmsai.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopDiagnosisResponse {
    private String icd10Code;
    private String diseaseName;
    private long count;
    private double percentage;
}
