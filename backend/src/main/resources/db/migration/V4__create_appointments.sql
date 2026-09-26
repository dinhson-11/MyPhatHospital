-- =============================================
-- V4: Tạo bảng appointments
-- =============================================

CREATE TABLE appointments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    department_id BIGINT,
    scheduled_at DATETIME NOT NULL,
    status ENUM('BOOKED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW') DEFAULT 'BOOKED',
    source ENUM('PATIENT', 'RECEPTIONIST', 'AI_CHATBOT') DEFAULT 'PATIENT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointments_patients FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_appointments_staff_profiles FOREIGN KEY (doctor_id) REFERENCES staff_profiles(id),
    CONSTRAINT fk_appointments_departments FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_appointments_doctor_scheduled ON appointments(doctor_id, scheduled_at);
