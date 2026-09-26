-- =============================================
-- V3: Tạo bảng patients, patient_allergies, medical_records
-- =============================================

CREATE TABLE patients (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    patient_code VARCHAR(20) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    dob DATE,
    gender ENUM('MALE', 'FEMALE', 'OTHER'),
    national_id VARCHAR(20),
    address VARCHAR(255),
    phone VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_patients_code UNIQUE (patient_code),
    CONSTRAINT fk_patients_users FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_patients_code ON patients(patient_code);
CREATE INDEX idx_patients_phone ON patients(phone);

CREATE TABLE patient_allergies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    allergen VARCHAR(150) NOT NULL,
    severity ENUM('MILD', 'MODERATE', 'SEVERE') DEFAULT 'MILD',
    note VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_allergies_patients FOREIGN KEY (patient_id) REFERENCES patients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
