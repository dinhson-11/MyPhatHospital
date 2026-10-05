package com.hospital.hmsai.patient.dto;

import com.hospital.hmsai.patient.entity.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO trả về thông tin bệnh nhân cho client.
 * KHÔNG expose entity trực tiếp, chỉ chứa các field cần thiết.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponse {

    private Long id;
    private String patientCode;
    private String fullName;
    private LocalDate dob;
    private Gender gender;
    private String nationalId;
    private String address;
    private String phone;
    private String bloodType;
    private Long userId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
