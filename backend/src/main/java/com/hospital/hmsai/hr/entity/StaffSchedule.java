package com.hospital.hmsai.hr.entity;

import com.hospital.hmsai.user.entity.Department;
import com.hospital.hmsai.user.entity.StaffProfile;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity StaffSchedule – map bảng staff_schedules.
 * Quản lý lịch trực hàng tuần/tháng của nhân viên y tế (FR-8.2).
 */
@Entity
@Table(name = "staff_schedules")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private StaffProfile staffProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift", nullable = false)
    private WorkShift shift;

    @Column(name = "room_no", length = 50)
    private String roomNo;

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
