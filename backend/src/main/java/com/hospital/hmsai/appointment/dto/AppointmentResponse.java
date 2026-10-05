package com.hospital.hmsai.appointment.dto;

import com.hospital.hmsai.appointment.entity.AppointmentSource;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin lịch hẹn cho client.
 * KHÔNG expose entity trực tiếp, chỉ chứa các field cần thiết.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {

    private Long id;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private Long doctorId;
    private String doctorName;
    private Long departmentId;
    private String departmentName;
    private LocalDateTime scheduledAt;
    private AppointmentStatus status;
    private AppointmentSource source;
    private String symptom;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
