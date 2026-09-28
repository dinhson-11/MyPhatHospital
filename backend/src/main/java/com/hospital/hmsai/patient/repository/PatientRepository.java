package com.hospital.hmsai.patient.repository;

import com.hospital.hmsai.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository cho entity Patient.
 * Hỗ trợ tìm kiếm theo mã bệnh nhân, tên, SĐT, CCCD.
 */
@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByPatientCode(String patientCode);

    Optional<Patient> findByUserId(Long userId);

    boolean existsByPatientCode(String patientCode);

    boolean existsByNationalId(String nationalId);

    /**
     * Tìm kiếm bệnh nhân theo keyword (tên, SĐT, hoặc mã bệnh nhân).
     * Dùng LIKE cho cả 3 trường để hỗ trợ tìm kiếm linh hoạt.
     */
    @Query("SELECT p FROM Patient p WHERE " +
           "LOWER(p.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "p.phone LIKE CONCAT('%', :keyword, '%') OR " +
           "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Patient> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
