package com.hospital.hmsai.clinical.dto;

import jakarta.validation.Valid;
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

    /** Chỉ các chỉ số khác null được cập nhật; chỉ số không gửi lên được giữ nguyên. */
    @Valid
    private VitalSignsDto vitalSigns;

    private String diagnosisCode;

    private String diagnosisNote;
}
