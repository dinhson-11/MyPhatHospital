package com.hospital.hmsai.patient.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity PatientAllergy – map bảng patient_allergies.
 * Lưu thông tin dị ứng của bệnh nhân (thuốc, thức ăn, môi trường).
 * Dữ liệu đầu vào quan trọng cho AI cảnh báo dị ứng thuốc (FR-11.2).
 */
@Entity
@Table(name = "patient_allergies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientAllergy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "allergen", nullable = false, length = 150)
    private String allergen;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity")
    @Builder.Default
    private AllergySeverity severity = AllergySeverity.MILD;

    @Column(name = "note", length = 255)
    private String note;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
