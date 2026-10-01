package com.hospital.hmsai.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientAllergyItemDto {
    private Long id;
    private String allergen;
    private String severity;
    private String note;
}
