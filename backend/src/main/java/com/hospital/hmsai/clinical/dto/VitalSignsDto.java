package com.hospital.hmsai.clinical.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO lưu trữ chỉ số sinh hiệu của bệnh nhân.
 * Giới hạn hợp lệ là ngưỡng sinh lý có thể đo được (chặn lỗi nhập liệu), không phải ngưỡng bình thường.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class VitalSignsDto {

    @Min(value = 20, message = "Mạch phải trong khoảng 20–300 lần/phút")
    @Max(value = 300, message = "Mạch phải trong khoảng 20–300 lần/phút")
    private Integer pulse;                  // Mạch (lần/phút, bình thường: 60-100)

    @Min(value = 50, message = "Huyết áp tâm thu phải trong khoảng 50–300 mmHg")
    @Max(value = 300, message = "Huyết áp tâm thu phải trong khoảng 50–300 mmHg")
    private Integer bloodPressureSystolic;  // Huyết áp tâm thu (mmHg, bình thường: 90-120)

    @Min(value = 20, message = "Huyết áp tâm trương phải trong khoảng 20–200 mmHg")
    @Max(value = 200, message = "Huyết áp tâm trương phải trong khoảng 20–200 mmHg")
    private Integer bloodPressureDiastolic; // Huyết áp tâm trương (mmHg, bình thường: 60-80)

    @DecimalMin(value = "30.0", message = "Thân nhiệt phải trong khoảng 30–45 °C")
    @DecimalMax(value = "45.0", message = "Thân nhiệt phải trong khoảng 30–45 °C")
    private Double temperature;             // Thân nhiệt (°C, bình thường: 36.5-37.5)

    @Min(value = 4, message = "Nhịp thở phải trong khoảng 4–80 lần/phút")
    @Max(value = 80, message = "Nhịp thở phải trong khoảng 4–80 lần/phút")
    private Integer respiratoryRate;        // Nhịp thở (lần/phút, bình thường: 16-20)

    @Min(value = 50, message = "SpO2 phải trong khoảng 50–100 %")
    @Max(value = 100, message = "SpO2 phải trong khoảng 50–100 %")
    private Integer spO2;                   // Độ bão hòa oxy máu (%, bình thường: 95-100)

    @DecimalMin(value = "0.3", message = "Cân nặng phải trong khoảng 0,3–400 kg")
    @DecimalMax(value = "400.0", message = "Cân nặng phải trong khoảng 0,3–400 kg")
    private Double weight;                  // Cân nặng (kg)

    @DecimalMin(value = "20.0", message = "Chiều cao phải trong khoảng 20–280 cm")
    @DecimalMax(value = "280.0", message = "Chiều cao phải trong khoảng 20–280 cm")
    private Double height;                  // Chiều cao (cm)

    /**
     * Huyết áp tâm thu phải lớn hơn tâm trương (khi gửi cả hai chỉ số).
     */
    @JsonIgnore
    @AssertTrue(message = "Huyết áp tâm thu phải lớn hơn huyết áp tâm trương")
    public boolean isBloodPressureConsistent() {
        return bloodPressureSystolic == null || bloodPressureDiastolic == null
                || bloodPressureSystolic > bloodPressureDiastolic;
    }
}
