package com.hospital.hmsai.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity Role – map bảng roles.
 * 6 roles: ADMIN, DOCTOR, NURSE, PHARMACIST, RECEPTIONIST (Lễ tân - Kế toán: tiếp đón + thu viện phí + báo cáo), PATIENT.
 */
@Entity
@Table(name = "roles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;
}
