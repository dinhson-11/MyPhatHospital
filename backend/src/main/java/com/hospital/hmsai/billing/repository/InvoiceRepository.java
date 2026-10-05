package com.hospital.hmsai.billing.repository;

import com.hospital.hmsai.billing.entity.Invoice;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("SELECT i FROM Invoice i " +
           "LEFT JOIN FETCH i.items " +
           "LEFT JOIN FETCH i.patient " +
           "LEFT JOIN FETCH i.visit " +
           "WHERE i.visit.id = :visitId")
    Optional<Invoice> findByVisitIdWithDetails(@Param("visitId") Long visitId);

    @Query("SELECT i FROM Invoice i " +
           "LEFT JOIN FETCH i.items " +
           "LEFT JOIN FETCH i.patient " +
           "LEFT JOIN FETCH i.visit " +
           "WHERE i.id = :id")
    Optional<Invoice> findByIdWithDetails(@Param("id") Long id);

    List<Invoice> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);

    @Query("SELECT i FROM Invoice i " +
           "WHERE LOWER(i.patient.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(i.patient.patientCode) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Invoice> searchByPatientKeyword(@Param("keyword") String keyword, Pageable pageable);

    boolean existsByVisitIdAndStatusNot(Long visitId, InvoiceStatus status);

    List<Invoice> findByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    List<Invoice> findByStatusAndPaidAtBetween(InvoiceStatus status, java.time.LocalDateTime start, java.time.LocalDateTime end);

    long countByStatus(InvoiceStatus status);
}
