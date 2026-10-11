-- =====================================================================================
-- HMS-AI (Hệ thống quản lý bệnh viện Mỹ Phát tích hợp AI) - LƯỢC ĐỒ CƠ SỞ DỮ LIỆU THAM CHIẾU
-- Hệ quản trị: MySQL 8 (InnoDB, utf8mb4, collation utf8mb4_unicode_ci)
--
-- Đây là bản trích lược đồ từ CSDL đang chạy sau khi Flyway thực hiện các migration V1 -> V23 (V23 chỉ nạp thêm dữ liệu mẫu, không đổi lược đồ)
-- (mysqldump --no-data), bỏ bảng kỹ thuật flyway_schema_history, bỏ các giá trị AUTO_INCREMENT,
-- bổ sung COMMENT tiếng Việt cho bảng và cột. Gồm 23 bảng nghiệp vụ.
--
-- LƯU Ý QUAN TRỌNG
--   * Nguồn chính thức của lược đồ là thư mục backend/src/main/resources/db/migration (Flyway V1..V23);
--     tệp này chỉ để tham khảo, đọc và đối chiếu khi viết tài liệu.
--   * KHÔNG chạy tệp này trên CSDL do Flyway quản lý (sẽ trùng bảng và làm lệch lịch sử migration).
--     CSDL thật được Flyway tự tạo khi backend khởi động lần đầu; chỉ cần tạo sẵn database rỗng
--     (xem scripts/db/01_create_database.sql).
--   * Khi thêm migration mới (V24 trở đi), phải cập nhật lại tệp này cùng tài liệu 04 và 07.
--   * Chỉ nạp tệp này vào một database trống dùng thử (ví dụ để xem lược đồ hoặc dựng nhanh môi trường thí nghiệm):
--       mysql --default-character-set=utf8mb4 -u <user> -p <database_trống> < schema.sql
-- =====================================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- Nhóm 1 - Người dùng, vai trò, nhân sự, lịch trực (V1, V2, V13, V22)
-- ------------------------------------------------------------------------------

CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `username` varchar(50) NOT NULL COMMENT 'Tên đăng nhập, duy nhất',
  `password_hash` varchar(255) NOT NULL COMMENT 'Giá trị băm BCrypt của mật khẩu',
  `full_name` varchar(150) NOT NULL COMMENT 'Họ và tên',
  `email` varchar(150) DEFAULT NULL COMMENT 'Email, duy nhất',
  `phone` varchar(20) DEFAULT NULL COMMENT 'Số điện thoại',
  `status` enum('ACTIVE','LOCKED') DEFAULT 'ACTIVE' COMMENT 'Trạng thái: ACTIVE hoạt động, LOCKED bị khóa',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tài khoản đăng nhập';

CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `code` varchar(30) NOT NULL COMMENT 'Mã vai trò dùng trong phân quyền (ADMIN, DOCTOR, ...)',
  `name` varchar(100) NOT NULL COMMENT 'Tên hiển thị tiếng Việt',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vai trò phân quyền (6 dòng, V22)';

CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL COMMENT 'Người dùng (users.id)',
  `role_id` bigint NOT NULL COMMENT 'Vai trò (roles.id)',
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `fk_user_roles_roles` (`role_id`),
  CONSTRAINT `fk_user_roles_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng nối người dùng - vai trò (N-N)';

CREATE TABLE `departments` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `name` varchar(100) NOT NULL COMMENT 'Tên khoa/phòng',
  `description` varchar(255) DEFAULT NULL COMMENT 'Mô tả phạm vi hoạt động',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Khoa, phòng, bộ phận của bệnh viện';

CREATE TABLE `staff_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `user_id` bigint NOT NULL COMMENT 'Tài khoản sở hữu hồ sơ (users.id), duy nhất',
  `department_id` bigint DEFAULT NULL COMMENT 'Khoa/phòng công tác',
  `specialty` varchar(255) DEFAULT NULL COMMENT 'Chuyên môn, chức vụ (văn bản tự do)',
  `license_no` varchar(50) DEFAULT NULL COMMENT 'Số chứng chỉ hành nghề',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_profiles_user_id` (`user_id`),
  KEY `fk_staff_profiles_departments` (`department_id`),
  CONSTRAINT `fk_staff_profiles_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `fk_staff_profiles_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ chuyên môn của nhân viên (1-1 với users)';

CREATE TABLE `staff_schedules` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `staff_id` bigint NOT NULL COMMENT 'Nhân viên (staff_profiles.id)',
  `department_id` bigint NOT NULL COMMENT 'Khoa/phòng nơi trực',
  `work_date` date NOT NULL COMMENT 'Ngày trực',
  `shift` enum('MORNING','AFTERNOON','NIGHT','FULL_DAY') NOT NULL COMMENT 'Ca: MORNING sáng, AFTERNOON chiều, NIGHT đêm, FULL_DAY cả ngày',
  `room_no` varchar(50) DEFAULT NULL COMMENT 'Phòng/vị trí trực',
  `note` varchar(255) DEFAULT NULL COMMENT 'Ghi chú',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_schedule` (`staff_id`,`work_date`,`shift`),
  KEY `fk_schedules_departments` (`department_id`),
  KEY `idx_schedules_date` (`work_date`),
  KEY `idx_schedules_staff_date` (`staff_id`,`work_date`),
  CONSTRAINT `fk_schedules_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `fk_schedules_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch trực/ca làm việc của nhân viên';

-- ------------------------------------------------------------------------------
-- Nhóm 2 - Bệnh nhân, lịch hẹn (V3, V4, V11, V14, V20)
-- ------------------------------------------------------------------------------

CREATE TABLE `patients` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `user_id` bigint DEFAULT NULL COMMENT 'Tài khoản của bệnh nhân (nếu có)',
  `patient_code` varchar(20) NOT NULL COMMENT 'Mã bệnh nhân BN-yyMMdd-nnn, duy nhất',
  `full_name` varchar(150) NOT NULL COMMENT 'Họ và tên',
  `dob` date DEFAULT NULL COMMENT 'Ngày sinh',
  `gender` enum('MALE','FEMALE','OTHER') DEFAULT NULL COMMENT 'Giới tính',
  `national_id` varchar(20) DEFAULT NULL COMMENT 'Số căn cước/chứng minh nhân dân',
  `address` varchar(255) DEFAULT NULL COMMENT 'Địa chỉ',
  `phone` varchar(20) DEFAULT NULL COMMENT 'Số điện thoại',
  `blood_type` varchar(5) DEFAULT NULL COMMENT 'Nhóm máu (V14)',
  `insurance_number` varchar(15) DEFAULT NULL COMMENT 'Số thẻ BHYT 15 ký tự (V20)',
  `insurance_valid_from` date DEFAULT NULL COMMENT 'Thẻ BHYT có hiệu lực từ ngày (V20)',
  `insurance_valid_to` date DEFAULT NULL COMMENT 'Thẻ BHYT hết hạn ngày (V20)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_patients_code` (`patient_code`),
  KEY `fk_patients_users` (`user_id`),
  KEY `idx_patients_code` (`patient_code`),
  KEY `idx_patients_phone` (`phone`),
  CONSTRAINT `fk_patients_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ hành chính của bệnh nhân';

CREATE TABLE `patient_allergies` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `patient_id` bigint NOT NULL COMMENT 'Bệnh nhân (patients.id)',
  `allergen` varchar(150) NOT NULL COMMENT 'Tác nhân gây dị ứng',
  `severity` enum('MILD','MODERATE','SEVERE') DEFAULT 'MILD' COMMENT 'Mức độ dị ứng',
  `note` varchar(255) DEFAULT NULL COMMENT 'Ghi chú (phản ứng, thời điểm...)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  KEY `fk_patient_allergies_patients` (`patient_id`),
  CONSTRAINT `fk_patient_allergies_patients` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dị ứng của bệnh nhân';

CREATE TABLE `appointments` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `patient_id` bigint NOT NULL COMMENT 'Bệnh nhân (patients.id)',
  `doctor_id` bigint NOT NULL COMMENT 'Bác sĩ khám (staff_profiles.id)',
  `department_id` bigint DEFAULT NULL COMMENT 'Khoa khám',
  `scheduled_at` datetime NOT NULL COMMENT 'Ngày giờ hẹn khám',
  `status` enum('BOOKED','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW') DEFAULT 'BOOKED' COMMENT 'Trạng thái lịch hẹn',
  `source` enum('PATIENT','RECEPTIONIST','AI_CHATBOT') DEFAULT 'PATIENT' COMMENT 'Nguồn đặt lịch',
  `symptom` varchar(500) DEFAULT NULL COMMENT 'Triệu chứng bệnh nhân mô tả (V11)',
  `notes` varchar(500) DEFAULT NULL COMMENT 'Ghi chú (V11)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  KEY `fk_appointments_departments` (`department_id`),
  KEY `idx_appointments_doctor_scheduled` (`doctor_id`,`scheduled_at`),
  KEY `idx_appointments_patient_status` (`patient_id`,`status`),
  KEY `idx_appointments_scheduled` (`scheduled_at`),
  CONSTRAINT `fk_appointments_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `fk_appointments_patients` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_appointments_staff_profiles` FOREIGN KEY (`doctor_id`) REFERENCES `staff_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch hẹn khám bệnh';

-- ------------------------------------------------------------------------------
-- Nhóm 3 - Ca khám, bệnh án, cận lâm sàng, đơn thuốc (V5, V6, V21)
-- ------------------------------------------------------------------------------

CREATE TABLE `visits` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `appointment_id` bigint DEFAULT NULL COMMENT 'Lịch hẹn tương ứng (nếu có), duy nhất',
  `patient_id` bigint NOT NULL COMMENT 'Bệnh nhân (patients.id)',
  `doctor_id` bigint NOT NULL COMMENT 'Bác sĩ khám (staff_profiles.id)',
  `visit_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm bắt đầu khám',
  `chief_complaint` varchar(255) DEFAULT NULL COMMENT 'Lý do khám chính',
  `vital_signs` json DEFAULT NULL COMMENT 'Sinh hiệu dạng JSON',
  `diagnosis_code` varchar(20) DEFAULT NULL COMMENT 'Mã chẩn đoán ICD-10',
  `diagnosis_note` text COMMENT 'Ghi chú chẩn đoán, hướng xử trí',
  `status` enum('IN_PROGRESS','COMPLETED') DEFAULT 'IN_PROGRESS' COMMENT 'Trạng thái ca khám',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_visits_appointment` (`appointment_id`),
  KEY `fk_visits_patients` (`patient_id`),
  KEY `fk_visits_staff_profiles` (`doctor_id`),
  CONSTRAINT `fk_visits_appointments` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`),
  CONSTRAINT `fk_visits_patients` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_visits_staff_profiles` FOREIGN KEY (`doctor_id`) REFERENCES `staff_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ca khám (lượt khám) của bệnh nhân';

CREATE TABLE `medical_records` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `patient_id` bigint NOT NULL COMMENT 'Bệnh nhân (patients.id)',
  `visit_id` bigint NOT NULL COMMENT 'Ca khám (visits.id)',
  `summary` text COMMENT 'Nội dung tóm tắt bệnh án',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  KEY `fk_medical_records_patients` (`patient_id`),
  KEY `fk_medical_records_visits` (`visit_id`),
  CONSTRAINT `fk_medical_records_patients` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_medical_records_visits` FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bệnh án tóm tắt, tự ghi khi hoàn tất ca khám';

CREATE TABLE `lab_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `visit_id` bigint NOT NULL COMMENT 'Ca khám (visits.id)',
  `test_type` varchar(100) NOT NULL COMMENT 'Loại xét nghiệm/cận lâm sàng',
  `status` enum('ORDERED','RESULTED') DEFAULT 'ORDERED' COMMENT 'Trạng thái chỉ định',
  `ordered_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm chỉ định',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  KEY `fk_lab_orders_visits` (`visit_id`),
  CONSTRAINT `fk_lab_orders_visits` FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chỉ định cận lâm sàng của ca khám';

CREATE TABLE `lab_results` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `lab_order_id` bigint NOT NULL COMMENT 'Chỉ định (lab_orders.id)',
  `result_text` text COMMENT 'Nội dung kết quả',
  `result_file_url` varchar(255) DEFAULT NULL COMMENT 'Đường dẫn tệp kết quả đính kèm',
  `resulted_at` datetime DEFAULT NULL COMMENT 'Thời điểm có kết quả',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  KEY `fk_lab_results_lab_orders` (`lab_order_id`),
  CONSTRAINT `fk_lab_results_lab_orders` FOREIGN KEY (`lab_order_id`) REFERENCES `lab_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kết quả cận lâm sàng';

CREATE TABLE `prescriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `visit_id` bigint NOT NULL COMMENT 'Ca khám (visits.id)',
  `override_reason` varchar(500) DEFAULT NULL COMMENT 'Lý do bác sĩ xác nhận kê đơn khi có cảnh báo nặng (V21)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  KEY `fk_prescriptions_visits` (`visit_id`),
  CONSTRAINT `fk_prescriptions_visits` FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đơn thuốc của ca khám';

-- ------------------------------------------------------------------------------
-- Nhóm 4 - Thuốc, tương tác thuốc, chi tiết đơn, cấp phát (V7, V21)
-- ------------------------------------------------------------------------------

CREATE TABLE `drugs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `code` varchar(30) NOT NULL COMMENT 'Mã thuốc, duy nhất',
  `name` varchar(150) NOT NULL COMMENT 'Tên thuốc (kèm hàm lượng)',
  `unit` varchar(30) DEFAULT NULL COMMENT 'Đơn vị tính',
  `price` decimal(12,2) DEFAULT '0.00' COMMENT 'Đơn giá (đồng)',
  `stock_quantity` int DEFAULT '0' COMMENT 'Số lượng tồn, không âm',
  `expiry_date` date DEFAULT NULL COMMENT 'Hạn dùng (một hạn cho mỗi thuốc)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drugs_code` (`code`),
  KEY `idx_drugs_code` (`code`),
  CONSTRAINT `chk_drugs_stock_non_negative` CHECK ((`stock_quantity` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục thuốc và tồn kho';

CREATE TABLE `drug_interactions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `drug_a_id` bigint NOT NULL COMMENT 'Thuốc A (drugs.id)',
  `drug_b_id` bigint NOT NULL COMMENT 'Thuốc B (drugs.id)',
  `severity` enum('MILD','MODERATE','SEVERE') NOT NULL COMMENT 'Mức độ nghiêm trọng của tương tác',
  `description` varchar(255) DEFAULT NULL COMMENT 'Mô tả cơ chế/hậu quả tương tác',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drug_interactions_pair` (`drug_a_id`,`drug_b_id`),
  KEY `fk_drug_interactions_drug_b` (`drug_b_id`),
  CONSTRAINT `fk_drug_interactions_drug_a` FOREIGN KEY (`drug_a_id`) REFERENCES `drugs` (`id`),
  CONSTRAINT `fk_drug_interactions_drug_b` FOREIGN KEY (`drug_b_id`) REFERENCES `drugs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cặp thuốc có tương tác (dữ liệu tham chiếu)';

CREATE TABLE `prescription_items` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `prescription_id` bigint NOT NULL COMMENT 'Đơn thuốc (prescriptions.id)',
  `drug_id` bigint NOT NULL COMMENT 'Thuốc (drugs.id)',
  `dosage` varchar(100) DEFAULT NULL COMMENT 'Liều dùng',
  `quantity` int DEFAULT '1' COMMENT 'Số lượng kê',
  `instruction` varchar(255) DEFAULT NULL COMMENT 'Cách dùng, lời dặn',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  PRIMARY KEY (`id`),
  KEY `fk_prescription_items_prescriptions` (`prescription_id`),
  KEY `fk_prescription_items_drugs` (`drug_id`),
  CONSTRAINT `fk_prescription_items_drugs` FOREIGN KEY (`drug_id`) REFERENCES `drugs` (`id`),
  CONSTRAINT `fk_prescription_items_prescriptions` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dòng thuốc trong đơn';

CREATE TABLE `dispenses` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `prescription_id` bigint NOT NULL COMMENT 'Đơn thuốc (prescriptions.id), duy nhất',
  `dispensed_by` bigint NOT NULL COMMENT 'Dược sĩ cấp phát (staff_profiles.id)',
  `dispensed_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm cấp phát',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dispenses_prescription` (`prescription_id`),
  KEY `fk_dispenses_staff_profiles` (`dispensed_by`),
  CONSTRAINT `fk_dispenses_prescriptions` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`),
  CONSTRAINT `fk_dispenses_staff_profiles` FOREIGN KEY (`dispensed_by`) REFERENCES `staff_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiếu cấp phát thuốc theo đơn';

-- ------------------------------------------------------------------------------
-- Nhóm 5 - Viện phí (V8, V20)
-- ------------------------------------------------------------------------------

CREATE TABLE `invoices` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `invoice_code` varchar(30) DEFAULT NULL COMMENT 'Mã hóa đơn HDyyMMdd######, duy nhất (V20)',
  `patient_id` bigint NOT NULL COMMENT 'Bệnh nhân (patients.id)',
  `visit_id` bigint NOT NULL COMMENT 'Ca khám (visits.id)',
  `total_amount` decimal(12,2) DEFAULT '0.00' COMMENT 'Tổng chi phí trước BHYT (đồng)',
  `insurance_number` varchar(15) DEFAULT NULL COMMENT 'Số thẻ BHYT tại thời điểm lập (V20)',
  `insurance_rate` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Mức hưởng BHYT áp dụng (%) (V20)',
  `insurance_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Phần BHYT chi trả (V20)',
  `insurance_note` varchar(255) DEFAULT NULL COMMENT 'Lý do áp dụng/không áp dụng BHYT (V20)',
  `patient_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Số tiền người bệnh phải trả (V20)',
  `status` enum('PENDING','PAID','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING' COMMENT 'Trạng thái hóa đơn',
  `payment_method` varchar(30) DEFAULT NULL COMMENT 'Hình thức thu: CASH, VIETQR, BANK_TRANSFER, CARD',
  `transaction_code` varchar(100) DEFAULT NULL COMMENT 'Mã giao dịch ngân hàng/POS hoặc mã phiếu thu tiền mặt, duy nhất',
  `paid_at` datetime DEFAULT NULL COMMENT 'Thời điểm thu tiền',
  `amount_received` decimal(12,2) DEFAULT NULL COMMENT 'Tiền khách đưa (thanh toán tiền mặt)',
  `change_amount` decimal(12,2) DEFAULT NULL COMMENT 'Tiền thừa trả lại khách',
  `cashier_id` bigint DEFAULT NULL COMMENT 'Thu ngân (users.id)',
  `cashier_name` varchar(150) DEFAULT NULL COMMENT 'Họ tên thu ngân tại thời điểm thu',
  `note` varchar(255) DEFAULT NULL COMMENT 'Ghi chú',
  `void_reason` varchar(255) DEFAULT NULL COMMENT 'Lý do hủy/hoàn tiền',
  `voided_at` datetime DEFAULT NULL COMMENT 'Thời điểm hủy/hoàn tiền',
  `voided_by` varchar(150) DEFAULT NULL COMMENT 'Người hủy/hoàn tiền',
  `version` bigint NOT NULL DEFAULT '0' COMMENT 'Số phiên bản (khóa lạc quan)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm sửa gần nhất',
  `active_visit_id` bigint GENERATED ALWAYS AS (if((`status` in (_utf8mb4'PENDING',_utf8mb4'PAID')),`visit_id`,NULL)) STORED COMMENT 'Cột sinh tự động: visit_id nếu PENDING/PAID, ngược lại NULL; UNIQUE (V20)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invoices_code` (`invoice_code`),
  UNIQUE KEY `uk_invoices_transaction_code` (`transaction_code`),
  UNIQUE KEY `uk_invoices_active_visit` (`active_visit_id`),
  KEY `fk_invoices_patients` (`patient_id`),
  KEY `fk_invoices_visits` (`visit_id`),
  KEY `fk_invoices_cashier` (`cashier_id`),
  KEY `idx_invoices_status_paid_at` (`status`,`paid_at`),
  CONSTRAINT `fk_invoices_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_invoices_patients` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_invoices_visits` FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hóa đơn viện phí của ca khám';

CREATE TABLE `invoice_items` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `invoice_id` bigint NOT NULL COMMENT 'Hóa đơn (invoices.id)',
  `item_type` enum('SERVICE','DRUG','LAB') NOT NULL COMMENT 'Loại mục: SERVICE, DRUG, LAB',
  `ref_id` bigint DEFAULT NULL COMMENT 'Id đối tượng tham chiếu (theo item_type), không có FK',
  `description` varchar(255) DEFAULT NULL COMMENT 'Mô tả mục tại thời điểm lập',
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'Số lượng (V20)',
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Đơn giá tại thời điểm lập (V20)',
  `amount` decimal(12,2) DEFAULT '0.00' COMMENT 'Thành tiền',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  PRIMARY KEY (`id`),
  KEY `fk_invoice_items_invoices` (`invoice_id`),
  CONSTRAINT `fk_invoice_items_invoices` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dòng chi phí của hóa đơn (giá lưu tại thời điểm lập)';

-- ------------------------------------------------------------------------------
-- Nhóm 6 - Chatbot và gợi ý lâm sàng của AI (V9)
-- ------------------------------------------------------------------------------

CREATE TABLE `chat_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `patient_id` bigint DEFAULT NULL COMMENT 'Bệnh nhân (nếu đã đăng nhập)',
  `started_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm bắt đầu phiên',
  `ended_at` datetime DEFAULT NULL COMMENT 'Thời điểm đóng phiên',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  PRIMARY KEY (`id`),
  KEY `fk_chat_sessions_patients` (`patient_id`),
  CONSTRAINT `fk_chat_sessions_patients` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiên hội thoại với chatbot';

CREATE TABLE `chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `session_id` bigint NOT NULL COMMENT 'Phiên chat (chat_sessions.id)',
  `sender` enum('USER','AI') NOT NULL COMMENT 'Người gửi: USER hoặc AI',
  `message` text NOT NULL COMMENT 'Nội dung tin nhắn',
  `intent` varchar(50) DEFAULT NULL COMMENT 'Ý định do AI phân loại',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  PRIMARY KEY (`id`),
  KEY `fk_chat_messages_sessions` (`session_id`),
  CONSTRAINT `fk_chat_messages_sessions` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tin nhắn trong phiên chatbot';

CREATE TABLE `ai_clinical_suggestions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã định danh bản ghi',
  `visit_id` bigint NOT NULL COMMENT 'Ca khám (visits.id)',
  `suggestion_type` enum('DRUG_INTERACTION','ALLERGY_ALERT','DIAGNOSIS_SUGGESTION') NOT NULL COMMENT 'Loại cảnh báo/gợi ý',
  `input_snapshot` json DEFAULT NULL COMMENT 'Dữ liệu đầu vào gửi AI (JSON)',
  `output_content` json DEFAULT NULL COMMENT 'Kết quả AI trả về (JSON)',
  `confidence_score` decimal(5,2) DEFAULT NULL COMMENT 'Độ tin cậy của gợi ý',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
  PRIMARY KEY (`id`),
  KEY `fk_ai_clinical_suggestions_visits` (`visit_id`),
  CONSTRAINT `fk_ai_clinical_suggestions_visits` FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký cảnh báo/gợi ý lâm sàng của AI';


SET FOREIGN_KEY_CHECKS = 1;
