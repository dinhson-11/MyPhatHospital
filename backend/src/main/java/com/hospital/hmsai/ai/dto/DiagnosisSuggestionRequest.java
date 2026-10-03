package com.hospital.hmsai.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO gợi ý chẩn đoán ICD-10 từ triệu chứng (FR-11.3 – Sprint 6).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosisSuggestionRequest {

    @NotBlank(message = "Mô tả triệu chứng không được để trống")
    @Size(min = 2, message = "Mô tả triệu chứng phải có ít nhất 2 ký tự")
    private String symptoms;

    private Integer patientAge;

    private String patientGender;

    private List<String> medicalHistory;
}
