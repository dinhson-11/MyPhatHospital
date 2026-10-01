package com.hospital.hmsai.appointment.repository;

import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository cho entity Appointment.
 * Hỗ trợ kiểm tra trùng lịch, lấy lịch theo bác sĩ/bệnh nhân, query khung giờ trống.
 */
@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /**
     * Lấy lịch hẹn theo bệnh nhân, sắp xếp theo thời gian giảm dần.
     */
    Page<Appointment> findByPatientIdOrderByScheduledAtDesc(Long patientId, Pageable pageable);

    /**
     * Lấy lịch hẹn theo bệnh nhân và trạng thái.
     */
    Page<Appointment> findByPatientIdAndStatusOrderByScheduledAtDesc(
            Long patientId, AppointmentStatus status, Pageable pageable);

    /**
     * Lấy lịch hẹn theo bác sĩ trong khoảng thời gian.
     * Dùng để hiển thị lịch bác sĩ và kiểm tra khung giờ đã có.
     */
    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId " +
           "AND a.scheduledAt >= :startTime AND a.scheduledAt < :endTime " +
           "AND a.status NOT IN ('CANCELLED')")
    List<Appointment> findByDoctorIdAndTimeRange(
            @Param("doctorId") Long doctorId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    /**
     * Kiểm tra trùng lịch bác sĩ: bác sĩ đã có lịch hẹn tại thời điểm đó chưa.
     * Chỉ xét các lịch hẹn chưa bị hủy.
     */
    @Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.doctor.id = :doctorId " +
           "AND a.scheduledAt = :scheduledAt " +
           "AND a.status NOT IN ('CANCELLED')")
    boolean existsByDoctorIdAndScheduledAtAndStatusNotCancelled(
            @Param("doctorId") Long doctorId,
            @Param("scheduledAt") LocalDateTime scheduledAt);

    /**
     * Lấy lịch hẹn theo bệnh nhân (qua user_id).
     */
    @Query("SELECT a FROM Appointment a WHERE a.patient.user.id = :userId " +
           "ORDER BY a.scheduledAt DESC")
    Page<Appointment> findByPatientUserId(@Param("userId") Long userId, Pageable pageable);

    /**
     * Lấy tất cả lịch hẹn theo chuyên khoa, phân trang.
     */
    Page<Appointment> findByDepartmentIdOrderByScheduledAtDesc(Long departmentId, Pageable pageable);

    /**
     * Lấy tất cả lịch hẹn theo bác sĩ, phân trang.
     */
    Page<Appointment> findByDoctorIdOrderByScheduledAtDesc(Long doctorId, Pageable pageable);

    /**
     * Đếm lịch hẹn theo trạng thái (thống kê).
     */
    long countByStatus(AppointmentStatus status);
}
