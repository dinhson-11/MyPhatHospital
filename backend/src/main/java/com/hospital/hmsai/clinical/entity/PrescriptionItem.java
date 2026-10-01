package com.hospital.hmsai.clinical.entity;

import com.hospital.hmsai.pharmacy.entity.Drug;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity PrescriptionItem – map bảng prescription_items.
 * Từng loại thuốc trong đơn kèm liều dùng, số lượng và hướng dẫn.
 */
@Entity
@Table(name = "prescription_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drug_id", nullable = false)
    private Drug drug;

    @Column(name = "dosage", length = 100)
    private String dosage;

    @Column(name = "quantity")
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "instruction", length = 255)
    private String instruction;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
