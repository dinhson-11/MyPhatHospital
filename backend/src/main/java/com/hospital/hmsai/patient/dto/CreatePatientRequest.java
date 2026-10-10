package com.hospital.hmsai.patient.dto;

import com.hospital.hmsai.patient.entity.Gender;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO cho request tạo hồ sơ bệnh nhân mới (lễ tân tạo).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePatientRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
    private String fullName;

    @PastOrPresent(message = "Ngày sinh không được ở tương lai")
    private LocalDate dob;

    private Gender gender;

    @Size(max = 20, message = "CCCD/CMND tối đa 20 ký tự")
    private String nationalId;

    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    private String address;

    @Pattern(regexp = "^(0[0-9]{9,10})?$", message = "Số điện thoại không hợp lệ")
    private String phone;

    @Pattern(regexp = "^((A|B|AB|O)[+-])?$", message = "Nhóm máu không hợp lệ (A+, A-, B+, B-, AB+, AB-, O+, O-)")
    private String bloodType;

    @Pattern(regexp = "^([A-Za-z]{2}[1-5][0-9]{12})?$",
            message = "Mã thẻ BHYT gồm 15 ký tự: 2 chữ cái, 1 chữ số mức hưởng (1–5) và 12 chữ số")
    private String insuranceNumber;

    private LocalDate insuranceValidFrom;

    private LocalDate insuranceValidTo;
}
