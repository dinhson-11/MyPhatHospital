package com.hospital.hmsai.pharmacy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity DrugInteraction – map bảng drug_interactions.
 * Dữ liệu cặp tương tác giữa 2 thuốc để cảnh báo y khoa.
 */
@Entity
@Table(name = "drug_interactions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_drug_interactions_pair", columnNames = {"drug_a_id", "drug_b_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drug_a_id", nullable = false)
    private Drug drugA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drug_b_id", nullable = false)
    private Drug drugB;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    private InteractionSeverity severity;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
