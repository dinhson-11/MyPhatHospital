package com.hospital.hmsai.appointment.dto;

import com.hospital.hmsai.appointment.entity.AppointmentSource;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO tạo lịch hẹn mới.
 * Bệnh nhân hoặc lễ tân có thể đặt lịch.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAppointmentRequest {

    @NotNull(message = "Mã bệnh nhân không được để trống")
    private Long patientId;

    @NotNull(message = "Mã bác sĩ không được để trống")
    private Long doctorId;

    private Long departmentId;

    @NotNull(message = "Thời gian khám không được để trống")
    @Future(message = "Thời gian khám phải là thời điểm trong tương lai")
    private LocalDateTime scheduledAt;

    @Size(max = 500, message = "Triệu chứng không quá 500 ký tự")
    private String symptom;

    @Size(max = 500, message = "Ghi chú không quá 500 ký tự")
    private String notes;

    @Builder.Default
    private AppointmentSource source = AppointmentSource.PATIENT;
}
