package com.hospital.hmsai.pharmacy.entity;

import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.user.entity.StaffProfile;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity Dispense – map bảng dispenses.
 * Ghi nhận lịch sử cấp phát thuốc theo đơn từ kho dược (FR-6.2).
 */
@Entity
@Table(name = "dispenses", uniqueConstraints = {
        // Mỗi đơn thuốc chỉ được cấp phát một lần (V21)
        @UniqueConstraint(name = "uk_dispenses_prescription", columnNames = {"prescription_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Dispense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispensed_by", nullable = false)
    private StaffProfile dispensedBy;

    @Column(name = "dispensed_at")
    private LocalDateTime dispensedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (dispensedAt == null) {
            dispensedAt = LocalDateTime.now();
        }
        createdAt = LocalDateTime.now();
    }
}
