package com.hospital.hmsai.clinical.repository;

import com.hospital.hmsai.clinical.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    List<Prescription> findByVisitId(Long visitId);

    @Query("SELECT p FROM Prescription p " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.drug " +
           "WHERE p.visit.id = :visitId")
    List<Prescription> findByVisitIdWithItems(@Param("visitId") Long visitId);

    @Query("SELECT p FROM Prescription p " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.drug " +
           "WHERE p.id = :id")
    Optional<Prescription> findByIdWithItems(@Param("id") Long id);
}
