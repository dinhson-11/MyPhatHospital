package com.hospital.hmsai.patient.dto;

import com.hospital.hmsai.patient.entity.Gender;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO cho request cập nhật hồ sơ bệnh nhân.
 * Dùng cho cả PUT /patients/{id} (nhân viên) và PUT /patients/me (bệnh nhân).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePatientRequest {

    @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
    private String fullName;

    private LocalDate dob;

    private Gender gender;

    @Size(max = 20, message = "CCCD/CMND tối đa 20 ký tự")
    private String nationalId;

    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    private String address;

    @Pattern(regexp = "^(0[0-9]{9,10})?$", message = "Số điện thoại không hợp lệ")
    private String phone;
}
