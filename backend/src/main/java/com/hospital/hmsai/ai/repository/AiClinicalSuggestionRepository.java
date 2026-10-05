package com.hospital.hmsai.ai.repository;

import com.hospital.hmsai.ai.entity.AiClinicalSuggestion;
import com.hospital.hmsai.ai.entity.AiSuggestionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository cho bảng ai_clinical_suggestions.
 */
@Repository
public interface AiClinicalSuggestionRepository extends JpaRepository<AiClinicalSuggestion, Long> {

    @Query("SELECT s FROM AiClinicalSuggestion s WHERE s.visit.id = :visitId ORDER BY s.createdAt DESC")
    List<AiClinicalSuggestion> findByVisitIdOrderByCreatedAtDesc(@Param("visitId") Long visitId);

    @Query("SELECT s FROM AiClinicalSuggestion s WHERE s.visit.id = :visitId AND s.suggestionType = :type ORDER BY s.createdAt DESC")
    List<AiClinicalSuggestion> findByVisitIdAndSuggestionType(
            @Param("visitId") Long visitId,
            @Param("type") AiSuggestionType type
    );
}
