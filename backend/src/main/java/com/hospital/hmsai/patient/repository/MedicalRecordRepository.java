package com.hospital.hmsai.patient.repository;

import com.hospital.hmsai.patient.entity.MedicalRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository cho entity MedicalRecord.
 */
@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    Page<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(Long patientId, Pageable pageable);
}
