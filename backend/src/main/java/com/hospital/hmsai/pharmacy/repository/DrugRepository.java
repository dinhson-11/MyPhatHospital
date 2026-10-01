package com.hospital.hmsai.pharmacy.repository;

import com.hospital.hmsai.pharmacy.entity.Drug;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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

    @Query("SELECT d FROM Drug d WHERE " +
           "LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Drug> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT d FROM Drug d WHERE " +
           "LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Drug> searchByKeywordList(@Param("keyword") String keyword);
}
