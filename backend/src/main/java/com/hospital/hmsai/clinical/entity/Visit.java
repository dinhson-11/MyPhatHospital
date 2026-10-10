package com.hospital.hmsai.clinical.entity;

import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.user.entity.StaffProfile;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity Visit – map bảng visits.
 * Quản lý chi tiết một lượt khám bệnh của bệnh nhân với bác sĩ.
 */
@Entity
@Table(name = "visits", uniqueConstraints = {
        // Mỗi lịch hẹn chỉ gắn với tối đa 1 lượt khám (V21)
        @UniqueConstraint(name = "uk_visits_appointment", columnNames = {"appointment_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private StaffProfile doctor;

    @Column(name = "visit_time")
    @Builder.Default
    private LocalDateTime visitTime = LocalDateTime.now();

    @Column(name = "chief_complaint", length = 255)
    private String chiefComplaint;

    @Column(name = "vital_signs", columnDefinition = "TEXT")
    private String vitalSigns;

    @Column(name = "diagnosis_code", length = 20)
    private String diagnosisCode;

    @Column(name = "diagnosis_note", columnDefinition = "TEXT")
    private String diagnosisNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private VisitStatus status = VisitStatus.IN_PROGRESS;

    @OneToMany(mappedBy = "visit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Prescription> prescriptions = new ArrayList<>();

    @OneToMany(mappedBy = "visit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LabOrder> labOrders = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (visitTime == null) {
            visitTime = LocalDateTime.now();
        }
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
