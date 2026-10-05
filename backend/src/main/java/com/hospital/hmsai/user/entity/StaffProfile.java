package com.hospital.hmsai.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity StaffProfile – map bảng staff_profiles.
 * Mở rộng thông tin chuyên môn cho user có role nhân viên y tế
 * (DOCTOR, NURSE, PHARMACIST...).
 */
@Entity
@Table(name = "staff_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "specialty", length = 100)
    private String specialty;

    @Column(name = "license_no", length = 50)
    private String licenseNo;

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
