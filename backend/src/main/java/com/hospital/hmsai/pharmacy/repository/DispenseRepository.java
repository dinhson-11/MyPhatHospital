package com.hospital.hmsai.pharmacy.repository;

import com.hospital.hmsai.pharmacy.entity.Dispense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho entity Dispense.
 */
@Repository
public interface DispenseRepository extends JpaRepository<Dispense, Long> {

    Optional<Dispense> findByPrescriptionId(Long prescriptionId);

    boolean existsByPrescriptionId(Long prescriptionId);

    List<Dispense> findAllByOrderByDispensedAtDesc();

    /** Các lượt cấp phát gần nhất (giới hạn bằng Pageable). */
    org.springframework.data.domain.Page<Dispense> findAllByOrderByDispensedAtDesc(org.springframework.data.domain.Pageable pageable);
}
