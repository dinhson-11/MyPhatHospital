package com.hospital.hmsai.clinical.repository;

import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VisitRepository extends JpaRepository<Visit, Long> {

    Page<Visit> findByPatientId(Long patientId, Pageable pageable);

    Page<Visit> findByDoctorId(Long doctorId, Pageable pageable);

    Page<Visit> findByStatus(VisitStatus status, Pageable pageable);

    Page<Visit> findByDoctorIdAndStatus(Long doctorId, VisitStatus status, Pageable pageable);

    Optional<Visit> findByAppointmentId(Long appointmentId);

    boolean existsByAppointmentId(Long appointmentId);

    boolean existsByAppointmentIdAndStatus(Long appointmentId, VisitStatus status);

    boolean existsByPatientIdAndStatus(Long patientId, VisitStatus status);

    /** Lượt khám có thuộc về tài khoản bệnh nhân (username) không – dùng cho kiểm tra quyền sở hữu. */
    boolean existsByIdAndPatient_User_UsernameIgnoreCase(Long id, String username);

    /** Lượt khám có do bác sĩ (username) phụ trách không – dùng cho kiểm tra quyền sửa bệnh án. */
    boolean existsByIdAndDoctor_User_UsernameIgnoreCase(Long id, String username);

    /**
     * Cập nhật updated_at nếu lượt khám còn ở trạng thái {@code status}; trả về số dòng bị ảnh hưởng.
     * Câu UPDATE đọc dữ liệu mới nhất và giữ khóa ghi trên dòng visits tới hết transaction, nên
     * kê đơn / chỉ định CLS / hoàn tất khám trên cùng lượt khám được tuần tự hóa: không thể thêm
     * thuốc vào lượt khám vừa được hoàn tất (và đã/đang lập hóa đơn).
     */
    @Modifying
    @Query("UPDATE Visit v SET v.updatedAt = :now WHERE v.id = :id AND v.status = :status")
    int touchIfStatus(@Param("id") Long id,
                      @Param("status") VisitStatus status,
                      @Param("now") LocalDateTime now);

    @Query("SELECT v FROM Visit v " +
           "JOIN FETCH v.patient " +
           "JOIN FETCH v.doctor d " +
           "JOIN FETCH d.user " +
           "WHERE v.id = :id")
    Optional<Visit> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT v FROM Visit v WHERE " +
           "(:doctorId IS NULL OR v.doctor.id = :doctorId) AND " +
           "(:patientId IS NULL OR v.patient.id = :patientId) AND " +
           "(:status IS NULL OR v.status = :status)")
    Page<Visit> filterVisits(@Param("doctorId") Long doctorId,
                            @Param("patientId") Long patientId,
                            @Param("status") VisitStatus status,
                            Pageable pageable);

    List<Visit> findByVisitTimeBetween(LocalDateTime start, LocalDateTime end);

    long countByVisitTimeBetween(LocalDateTime start, LocalDateTime end);

    long countByStatus(VisitStatus status);

    /** Số lần xuất hiện của một mã chẩn đoán (kết quả GROUP BY thực hiện trong DB, không nạp toàn bộ ca khám). */
    interface DiagnosisCount {
        String getCode();

        long getCnt();
    }

    /** Top mã chẩn đoán theo số ca giảm dần (dùng Pageable để giới hạn số dòng). */
    @Query("SELECT v.diagnosisCode AS code, COUNT(v) AS cnt FROM Visit v " +
           "WHERE v.diagnosisCode IS NOT NULL AND v.diagnosisCode <> '' " +
           "GROUP BY v.diagnosisCode ORDER BY COUNT(v) DESC, v.diagnosisCode ASC")
    List<DiagnosisCount> findTopDiagnosisCounts(Pageable pageable);

    /** Tổng số ca khám đã có mã chẩn đoán (mẫu số của tỷ lệ %). */
    @Query("SELECT COUNT(v) FROM Visit v WHERE v.diagnosisCode IS NOT NULL AND v.diagnosisCode <> ''")
    long countWithDiagnosis();

    /** Ghi chú chẩn đoán gần nhất của một mã (để hiển thị tên bệnh). */
    @Query("SELECT v.diagnosisNote FROM Visit v WHERE v.diagnosisCode = :code AND v.diagnosisNote IS NOT NULL " +
           "ORDER BY v.visitTime DESC, v.id DESC")
    List<String> findLatestNotesByDiagnosisCode(@Param("code") String code, Pageable pageable);
}
