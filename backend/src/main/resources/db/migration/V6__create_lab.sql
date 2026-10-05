-- =============================================
-- V6: Tạo bảng lab_orders, lab_results
-- =============================================

CREATE TABLE lab_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    test_type VARCHAR(100) NOT NULL,
    status ENUM('ORDERED', 'RESULTED') DEFAULT 'ORDERED',
    ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lab_orders_visits FOREIGN KEY (visit_id) REFERENCES visits(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lab_order_id BIGINT NOT NULL,
    result_text TEXT,
    result_file_url VARCHAR(255),
    resulted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lab_results_lab_orders FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
