package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionSafetyCheckRequest {

    @JsonProperty("visit_id")
    private Long visitId;

    @JsonProperty("patient_id")
    private Long patientId;

    @JsonProperty("patient_allergies")
    @Builder.Default
    private List<PatientAllergyItemDto> patientAllergies = new ArrayList<>();

    @NotEmpty(message = "Danh sách thuốc không được để trống")
    private List<DrugItemDto> drugs;
}
