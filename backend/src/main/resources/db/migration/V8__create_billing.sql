-- =============================================
-- V8: Tạo bảng invoices, invoice_items
-- =============================================

CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    visit_id BIGINT NOT NULL,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    status ENUM('PENDING', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoices_patients FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_invoices_visits FOREIGN KEY (visit_id) REFERENCES visits(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    item_type ENUM('SERVICE', 'DRUG', 'LAB') NOT NULL,
    ref_id BIGINT,
    description VARCHAR(255),
    amount DECIMAL(12, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_items_invoices FOREIGN KEY (invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
