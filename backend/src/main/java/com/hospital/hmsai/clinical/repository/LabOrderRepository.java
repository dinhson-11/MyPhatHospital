package com.hospital.hmsai.clinical.repository;

import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.LabOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {

    List<LabOrder> findByVisitId(Long visitId);

    List<LabOrder> findByStatus(LabOrderStatus status);

    @Query("SELECT lo FROM LabOrder lo " +
           "LEFT JOIN FETCH lo.results " +
           "WHERE lo.visit.id = :visitId")
    List<LabOrder> findByVisitIdWithResults(@Param("visitId") Long visitId);

    @Query("SELECT lo FROM LabOrder lo " +
           "LEFT JOIN FETCH lo.results " +
           "WHERE lo.id = :id")
    Optional<LabOrder> findByIdWithResults(@Param("id") Long id);
}
