package com.hospital.hmsai.patient.dto;

import com.hospital.hmsai.patient.entity.AllergySeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho request thêm dị ứng bệnh nhân.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAllergyRequest {

    @NotBlank(message = "Tên dị ứng không được để trống")
    @Size(max = 150, message = "Tên dị ứng tối đa 150 ký tự")
    private String allergen;

    private AllergySeverity severity;

    @Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
    private String note;
}
