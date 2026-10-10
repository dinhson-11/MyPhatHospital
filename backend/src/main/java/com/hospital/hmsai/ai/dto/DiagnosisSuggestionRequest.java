package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    // Frontend (aiAlertService.js) gửi snake_case: patient_age / patient_gender / medical_history.
    // Trước đây các trường này bị bỏ qua khi deserialize -> AI không nhận được tuổi/giới.
    @JsonProperty("patient_age")
    @JsonAlias("patientAge")
    @Min(value = 0, message = "Tuổi bệnh nhân không hợp lệ")
    @Max(value = 130, message = "Tuổi bệnh nhân không hợp lệ")
    private Integer patientAge;

    @JsonProperty("patient_gender")
    @JsonAlias("patientGender")
    private String patientGender;

    @JsonProperty("medical_history")
    @JsonAlias("medicalHistory")
    private List<String> medicalHistory;
}
