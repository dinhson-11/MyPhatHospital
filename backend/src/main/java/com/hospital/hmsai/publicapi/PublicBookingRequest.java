package com.hospital.hmsai.publicapi;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Yêu cầu đặt lịch khám từ cổng thông tin (không cần đăng nhập). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicBookingRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 150, message = "Họ tên không quá 150 ký tự")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^[0-9+]{9,15}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    @NotNull(message = "Vui lòng chọn chuyên khoa")
    private Long departmentId;

    /** Có thể để trống: hệ thống tự phân công bác sĩ của khoa. */
    private Long doctorId;

    @NotNull(message = "Thời gian khám không được để trống")
    @Future(message = "Thời gian khám phải là thời điểm trong tương lai")
    private LocalDateTime scheduledAt;

    @Size(max = 500, message = "Triệu chứng không quá 500 ký tự")
    private String symptom;

    @Size(max = 500, message = "Ghi chú không quá 500 ký tự")
    private String notes;
}
