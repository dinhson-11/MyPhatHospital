package com.hospital.hmsai.ai.entity;

import com.hospital.hmsai.clinical.entity.Visit;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity AiClinicalSuggestion – map bảng ai_clinical_suggestions.
 * Lưu trữ audit log mọi cảnh báo, gợi ý của AI Service (NFR-8).
 */
@Entity
@Table(name = "ai_clinical_suggestions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiClinicalSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Enumerated(EnumType.STRING)
    @Column(name = "suggestion_type", nullable = false)
    private AiSuggestionType suggestionType;

    @Column(name = "input_snapshot", columnDefinition = "TEXT")
    private String inputSnapshot;

    @Column(name = "output_content", columnDefinition = "TEXT")
    private String outputContent;

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
