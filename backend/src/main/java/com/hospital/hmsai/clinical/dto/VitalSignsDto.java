package com.hospital.hmsai.clinical.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO lưu trữ chỉ số sinh hiệu của bệnh nhân.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VitalSignsDto {

    private Integer pulse;                  // Mạch (lần/phút, bình thường: 60-100)
    private Integer bloodPressureSystolic;  // Huyết áp tâm thu (mmHg, bình thường: 90-120)
    private Integer bloodPressureDiastolic; // Huyết áp tâm trương (mmHg, bình thường: 60-80)
    private Double temperature;             // Thân nhiệt (°C, bình thường: 36.5-37.5)
    private Integer respiratoryRate;        // Nhịp thở (lần/phút, bình thường: 16-20)
    private Integer spO2;                   // Độ bão hòa oxy máu (%, bình thường: 95-100)
    private Double weight;                  // Cân nặng (kg)
    private Double height;                  // Chiều cao (cm)
}
