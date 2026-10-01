package com.hospital.hmsai.appointment.dto;

import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cập nhật trạng thái lịch hẹn (xác nhận, hủy, hoàn tất...).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAppointmentStatusRequest {

    @NotNull(message = "Trạng thái mới không được để trống")
    private AppointmentStatus status;

    private String reason;
}
