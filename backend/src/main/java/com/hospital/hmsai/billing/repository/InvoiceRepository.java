package com.hospital.hmsai.billing.repository;

import com.hospital.hmsai.billing.entity.Invoice;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    /** Các hóa đơn của ca khám, mới nhất trước (một ca khám có thể có hóa đơn đã hủy + hóa đơn lập lại). */
    @Query("SELECT DISTINCT i FROM Invoice i " +
           "LEFT JOIN FETCH i.items " +
           "LEFT JOIN FETCH i.patient " +
           "LEFT JOIN FETCH i.visit " +
           "WHERE i.visit.id = :visitId " +
           "ORDER BY i.id DESC")
    List<Invoice> findAllByVisitIdWithDetails(@Param("visitId") Long visitId);

    @Query("SELECT i FROM Invoice i " +
           "LEFT JOIN FETCH i.items " +
           "LEFT JOIN FETCH i.patient " +
           "LEFT JOIN FETCH i.visit " +
           "WHERE i.id = :id")
    Optional<Invoice> findByIdWithDetails(@Param("id") Long id);

    List<Invoice> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    @Query("SELECT i FROM Invoice i " +
           "WHERE (:status IS NULL OR i.status = :status) " +
           "AND (:keyword IS NULL " +
           "     OR LOWER(i.patient.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(i.patient.patientCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(i.invoiceCode) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Invoice> search(@Param("keyword") String keyword,
                         @Param("status") InvoiceStatus status,
                         Pageable pageable);

    boolean existsByVisitIdAndStatusIn(Long visitId, Collection<InvoiceStatus> statuses);

    /** Ca khám đã hoàn tất chưa có hóa đơn PENDING/PAID – mới nhất trước. */
    @Query("SELECT v FROM Visit v " +
           "JOIN FETCH v.patient " +
           "LEFT JOIN FETCH v.doctor d " +
           "LEFT JOIN FETCH d.user " +
           "WHERE v.status = :completed " +
           "AND NOT EXISTS (SELECT i.id FROM Invoice i WHERE i.visit = v AND i.status IN :activeStatuses) " +
           "ORDER BY v.visitTime DESC")
    List<Visit> findCompletedVisitsWithoutActiveInvoice(@Param("completed") VisitStatus completed,
                                                        @Param("activeStatuses") Collection<InvoiceStatus> activeStatuses,
                                                        Pageable pageable);

    boolean existsByTransactionCodeAndIdNot(String transactionCode, Long id);

    List<Invoice> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Invoice> findByStatusAndPaidAtBetween(InvoiceStatus status, LocalDateTime start, LocalDateTime end);

    /** Hóa đơn được thu trong khoảng thời gian (gồm cả hóa đơn sau đó bị hoàn tiền). */
    List<Invoice> findByPaidAtBetween(LocalDateTime start, LocalDateTime end);

    List<Invoice> findByStatusAndVoidedAtBetween(InvoiceStatus status, LocalDateTime start, LocalDateTime end);

    List<Invoice> findByStatus(InvoiceStatus status);

    long countByStatus(InvoiceStatus status);
}
