package com.hospital.hmsai.patient.dto;

import com.hospital.hmsai.patient.entity.AllergySeverity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin dị ứng cho client.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllergyResponse {

    private Long id;
    private String allergen;
    private AllergySeverity severity;
    private String note;
    private LocalDateTime createdAt;
}
