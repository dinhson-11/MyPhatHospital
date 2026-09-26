-- =============================================
-- V5: Tạo bảng visits, prescriptions, prescription_items
-- =============================================

CREATE TABLE visits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    chief_complaint VARCHAR(255),
    vital_signs JSON,
    diagnosis_code VARCHAR(20),
    diagnosis_note TEXT,
    status ENUM('IN_PROGRESS', 'COMPLETED') DEFAULT 'IN_PROGRESS',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_visits_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT fk_visits_patients FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_visits_staff_profiles FOREIGN KEY (doctor_id) REFERENCES staff_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prescriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescriptions_visits FOREIGN KEY (visit_id) REFERENCES visits(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- medical_records
CREATE TABLE medical_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    visit_id BIGINT NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_medical_records_patients FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_medical_records_visits FOREIGN KEY (visit_id) REFERENCES visits(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
