package com.hospital.hmsai.appointment.entity;

import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.user.entity.Department;
import com.hospital.hmsai.user.entity.StaffProfile;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity Appointment – map bảng appointments.
 * Quan hệ:
 * - ManyToOne với Patient (bệnh nhân đặt lịch)
 * - ManyToOne với StaffProfile (bác sĩ được chỉ định)
 * - ManyToOne với Department (chuyên khoa)
 */
@Entity
@Table(name = "appointments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private StaffProfile doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.BOOKED;

    @Enumerated(EnumType.STRING)
    @Column(name = "source")
    @Builder.Default
    private AppointmentSource source = AppointmentSource.PATIENT;

    @Column(name = "symptom", length = 500)
    private String symptom;

    @Column(name = "notes", length = 500)
    private String notes;

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
