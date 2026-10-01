package com.hospital.hmsai.clinical.repository;

import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VisitRepository extends JpaRepository<Visit, Long> {

    Page<Visit> findByPatientId(Long patientId, Pageable pageable);

    Page<Visit> findByDoctorId(Long doctorId, Pageable pageable);

    Page<Visit> findByStatus(VisitStatus status, Pageable pageable);

    Page<Visit> findByDoctorIdAndStatus(Long doctorId, VisitStatus status, Pageable pageable);

    Optional<Visit> findByAppointmentId(Long appointmentId);

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
}
