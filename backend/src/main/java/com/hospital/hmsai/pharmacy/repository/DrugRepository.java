package com.hospital.hmsai.pharmacy.repository;

import com.hospital.hmsai.pharmacy.entity.Drug;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho entity Drug.
 */
@Repository
public interface DrugRepository extends JpaRepository<Drug, Long> {

    Optional<Drug> findByCode(String code);

    boolean existsByCode(String code);

    /**
     * Đọc và khóa ghi dòng thuốc (SELECT ... FOR UPDATE) trước khi trừ/cộng tồn kho,
     * tránh mất cập nhật khi nhiều quầy cấp phát / nhập kho cùng lúc.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Drug d WHERE d.id = :id")
    Optional<Drug> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT d FROM Drug d WHERE " +
           "LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Drug> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT d FROM Drug d WHERE " +
           "LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Drug> searchByKeywordList(@Param("keyword") String keyword);

    List<Drug> findByStockQuantityLessThanEqualOrderByStockQuantityAsc(int threshold);

    List<Drug> findByExpiryDateBetweenOrderByExpiryDateAsc(java.time.LocalDate startDate, java.time.LocalDate endDate);
}
