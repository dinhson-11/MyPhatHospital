package com.hospital.hmsai.appointment.repository;

import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.user.entity.StaffProfile;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
     * Kiểm tra trùng lịch bác sĩ bằng truy vấn có khóa (đọc dữ liệu mới nhất, không dùng snapshot cũ
     * của transaction). Gọi SAU khi đã khóa hồ sơ bác sĩ bằng {@link #lockStaffProfileById(Long)}.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId " +
           "AND a.scheduledAt = :scheduledAt " +
           "AND a.status <> com.hospital.hmsai.appointment.entity.AppointmentStatus.CANCELLED")
    List<Appointment> findActiveByDoctorAndScheduledAtForUpdate(
            @Param("doctorId") Long doctorId,
            @Param("scheduledAt") LocalDateTime scheduledAt);

    /**
     * Khóa ghi hồ sơ bác sĩ (staff_profiles) để tuần tự hóa các yêu cầu đặt lịch cùng một bác sĩ,
     * chống đặt trùng khung giờ khi hai yêu cầu đến đồng thời.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StaffProfile s WHERE s.id = :id")
    Optional<StaffProfile> lockStaffProfileById(@Param("id") Long id);

    /** Khóa ghi lịch hẹn khi chuyển trạng thái / bắt đầu khám. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.id = :id")
    Optional<Appointment> findByIdForUpdate(@Param("id") Long id);

    /** Bệnh nhân đã có lịch hẹn (chưa hủy) khác vào cùng thời điểm chưa. */
    boolean existsByPatientIdAndScheduledAtAndStatusNot(Long patientId, LocalDateTime scheduledAt,
                                                        AppointmentStatus status);

    /** Lịch hẹn có thuộc về tài khoản bệnh nhân (username) không. */
    boolean existsByIdAndPatient_User_UsernameIgnoreCase(Long id, String username);

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

    /** Đếm lịch hẹn có giờ hẹn trong khoảng [from, to] và trạng thái khác {@code excluded} (KPI "lịch hẹn hôm nay"). */
    long countByScheduledAtBetweenAndStatusNot(LocalDateTime from, LocalDateTime to, AppointmentStatus excluded);
}
