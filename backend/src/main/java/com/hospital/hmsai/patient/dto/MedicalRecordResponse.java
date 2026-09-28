package com.hospital.hmsai.patient.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO trả về lịch sử khám bệnh cho client.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecordResponse {

    private Long id;
    private String summary;
    private Long visitId;
    private LocalDateTime createdAt;
}
