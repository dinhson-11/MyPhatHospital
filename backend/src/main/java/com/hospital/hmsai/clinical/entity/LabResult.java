package com.hospital.hmsai.clinical.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity LabResult – map bảng lab_results.
 * Kết quả cận lâm sàng của một chỉ định xét nghiệm.
 */
@Entity
@Table(name = "lab_results")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_order_id", nullable = false)
    private LabOrder labOrder;

    @Column(name = "result_text", columnDefinition = "TEXT")
    private String resultText;

    @Column(name = "result_file_url", length = 255)
    private String resultFileUrl;

    @Column(name = "resulted_at")
    @Builder.Default
    private LocalDateTime resultedAt = LocalDateTime.now();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (resultedAt == null) {
            resultedAt = LocalDateTime.now();
        }
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
