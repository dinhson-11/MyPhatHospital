package com.hospital.hmsai.clinical.repository;

import com.hospital.hmsai.clinical.entity.Prescription;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    /**
     * Khóa ghi đơn thuốc (kèm các dòng thuốc) khi cấp phát để chống cấp phát trùng đồng thời.
     * Cố ý KHÔNG fetch bảng drugs: thuốc được khóa riêng theo thứ tự ID tăng dần
     * (DrugRepository.findByIdForUpdate) để đọc tồn kho mới nhất và tránh deadlock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Prescription p " +
           "LEFT JOIN FETCH p.items " +
           "WHERE p.id = :id")
    Optional<Prescription> findByIdWithItemsForUpdate(@Param("id") Long id);

    /** Đơn thuốc có thuộc lượt khám của tài khoản bệnh nhân (username) không. */
    boolean existsByIdAndVisit_Patient_User_UsernameIgnoreCase(Long id, String username);
}
