package com.hospital.hmsai.clinical.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVisitRequest {

    private Long appointmentId;

    @NotNull(message = "patientId không được để trống")
    private Long patientId;

    @NotNull(message = "doctorId không được để trống")
    private Long doctorId;

    private String chiefComplaint;

    @Valid
    private VitalSignsDto vitalSigns;

    private String diagnosisCode;

    private String diagnosisNote;
}
