package com.hospital.hmsai.clinical.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity LabOrder – map bảng lab_orders.
 * Chỉ định cận lâm sàng / xét nghiệm cho lượt khám.
 */
@Entity
@Table(name = "lab_orders")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(name = "test_type", nullable = false, length = 100)
    private String testType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private LabOrderStatus status = LabOrderStatus.ORDERED;

    @Column(name = "ordered_at")
    @Builder.Default
    private LocalDateTime orderedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "labOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LabResult> results = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (orderedAt == null) {
            orderedAt = LocalDateTime.now();
        }
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addResult(LabResult result) {
        results.add(result);
        result.setLabOrder(this);
    }
}
