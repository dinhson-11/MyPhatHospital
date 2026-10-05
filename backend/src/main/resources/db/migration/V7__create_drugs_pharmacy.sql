-- =============================================
-- V7: Tạo bảng drugs, drug_interactions, prescription_items, dispenses
-- =============================================

CREATE TABLE drugs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(30),
    price DECIMAL(12, 2) DEFAULT 0,
    stock_quantity INT DEFAULT 0,
    expiry_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_drugs_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_drugs_code ON drugs(code);

CREATE TABLE drug_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    drug_a_id BIGINT NOT NULL,
    drug_b_id BIGINT NOT NULL,
    severity ENUM('MILD', 'MODERATE', 'SEVERE') NOT NULL,
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drug_interactions_drug_a FOREIGN KEY (drug_a_id) REFERENCES drugs(id),
    CONSTRAINT fk_drug_interactions_drug_b FOREIGN KEY (drug_b_id) REFERENCES drugs(id),
    CONSTRAINT uk_drug_interactions_pair UNIQUE (drug_a_id, drug_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prescription_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    drug_id BIGINT NOT NULL,
    dosage VARCHAR(100),
    quantity INT DEFAULT 1,
    instruction VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescription_items_prescriptions FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT fk_prescription_items_drugs FOREIGN KEY (drug_id) REFERENCES drugs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dispenses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    dispensed_by BIGINT NOT NULL,
    dispensed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispenses_prescriptions FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT fk_dispenses_staff_profiles FOREIGN KEY (dispensed_by) REFERENCES staff_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
