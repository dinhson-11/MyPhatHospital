package com.hospital.hmsai.appointment.service;

import com.hospital.hmsai.appointment.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

/**
 * Service interface cho quản lý lịch hẹn khám bệnh.
 */
public interface AppointmentService {

    /**
     * Đặt lịch khám mới.
     * Kiểm tra trùng lịch bác sĩ trước khi tạo.
     */
    AppointmentResponse create(CreateAppointmentRequest request);

    /**
     * Lấy chi tiết lịch hẹn theo ID.
     */
    AppointmentResponse getById(Long id);

    /**
     * Lấy danh sách lịch hẹn của bệnh nhân (qua patientId), phân trang.
     */
    Page<AppointmentResponse> getByPatientId(Long patientId, Pageable pageable);

    /**
     * Lấy danh sách lịch hẹn của bệnh nhân hiện tại (qua userId), phân trang.
     */
    Page<AppointmentResponse> getMyAppointments(Long userId, Pageable pageable);

    /**
     * Lấy danh sách lịch hẹn theo bác sĩ, phân trang.
     */
    Page<AppointmentResponse> getByDoctorId(Long doctorId, Pageable pageable);

    /**
     * Xác nhận lịch hẹn (BOOKED → CONFIRMED).
     */
    AppointmentResponse confirm(Long id);

    /**
     * Hủy lịch hẹn.
     */
    AppointmentResponse cancel(Long id, String reason);

    /**
     * Hoàn tất lượt khám (CONFIRMED → COMPLETED).
     */
    AppointmentResponse complete(Long id);

    /**
     * Lấy khung giờ trống của bác sĩ trong 1 ngày.
     */
    AvailableSlotsResponse getAvailableSlots(Long doctorId, LocalDate date);

    /**
     * Cập nhật trạng thái lịch hẹn bằng request DTO.
     */
    AppointmentResponse updateStatus(Long id, UpdateAppointmentStatusRequest request);

    /**
     * Lấy tất cả lịch hẹn (admin/receptionist), phân trang.
     */
    Page<AppointmentResponse> getAll(Pageable pageable);
}
