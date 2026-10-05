package com.hospital.hmsai.patient.repository;

import com.hospital.hmsai.patient.entity.PatientAllergy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho entity PatientAllergy.
 */
@Repository
public interface PatientAllergyRepository extends JpaRepository<PatientAllergy, Long> {

    List<PatientAllergy> findByPatientId(Long patientId);

    Optional<PatientAllergy> findByIdAndPatientId(Long id, Long patientId);

    void deleteByIdAndPatientId(Long id, Long patientId);
}
