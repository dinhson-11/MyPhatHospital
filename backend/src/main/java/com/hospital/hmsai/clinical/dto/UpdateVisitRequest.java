package com.hospital.hmsai.clinical.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateVisitRequest {

    private String chiefComplaint;

    private VitalSignsDto vitalSigns;

    private String diagnosisCode;

    private String diagnosisNote;
}
