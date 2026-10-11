-- =============================================
-- V20: Nâng cấp phân hệ viện phí (FR-7)
--   1. Thẻ BHYT trên hồ sơ bệnh nhân
--   2. Hóa đơn: mã hóa đơn, BHYT chi trả / người bệnh cùng chi trả,
--      tiền khách đưa / tiền thừa, thu ngân, hủy / hoàn tiền, khóa lạc quan
--   3. Dòng hóa đơn: số lượng, đơn giá
--   4. Ràng buộc: mỗi ca khám chỉ có 1 hóa đơn còn hiệu lực,
--      mỗi mã giao dịch ngân hàng chỉ dùng cho 1 hóa đơn
-- =============================================

-- 1. Thẻ BHYT
ALTER TABLE patients
    ADD COLUMN insurance_number VARCHAR(15) NULL AFTER blood_type,
    ADD COLUMN insurance_valid_from DATE NULL AFTER insurance_number,
    ADD COLUMN insurance_valid_to DATE NULL AFTER insurance_valid_from;

-- 2. Hóa đơn
ALTER TABLE invoices
    MODIFY COLUMN status ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE invoices
    ADD COLUMN invoice_code VARCHAR(30) NULL AFTER id,
    ADD COLUMN insurance_number VARCHAR(15) NULL AFTER total_amount,
    ADD COLUMN insurance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER insurance_number,
    ADD COLUMN insurance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER insurance_rate,
    ADD COLUMN insurance_note VARCHAR(255) NULL AFTER insurance_amount,
    ADD COLUMN patient_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER insurance_note,
    ADD COLUMN amount_received DECIMAL(12, 2) NULL AFTER paid_at,
    ADD COLUMN change_amount DECIMAL(12, 2) NULL AFTER amount_received,
    ADD COLUMN cashier_id BIGINT NULL AFTER change_amount,
    ADD COLUMN cashier_name VARCHAR(150) NULL AFTER cashier_id,
    ADD COLUMN note VARCHAR(255) NULL AFTER cashier_name,
    ADD COLUMN void_reason VARCHAR(255) NULL AFTER note,
    ADD COLUMN voided_at DATETIME NULL AFTER void_reason,
    ADD COLUMN voided_by VARCHAR(150) NULL AFTER voided_at,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER voided_by;

-- Dữ liệu cũ: chưa có BHYT nên người bệnh trả toàn bộ
UPDATE invoices SET patient_amount = COALESCE(total_amount, 0);
UPDATE invoices
   SET invoice_code = CONCAT('HD', DATE_FORMAT(COALESCE(created_at, NOW()), '%y%m%d'), LPAD(id, 6, '0'))
 WHERE invoice_code IS NULL;

-- Mỗi ca khám chỉ giữ MỘT hóa đơn còn hiệu lực trước khi thêm ràng buộc:
--   * ưu tiên hóa đơn ĐÃ THU (PAID, id nhỏ nhất); nếu chưa có hóa đơn nào đã thu thì giữ PENDING mới nhất.
--   * hóa đơn PAID thừa (thu trùng) KHÔNG bị xóa: chuyển CANCELLED kèm lý do để kế toán đối soát/hoàn tiền thủ công.
UPDATE invoices i
  JOIN (SELECT visit_id,
               COALESCE(MIN(CASE WHEN status = 'PAID' THEN id END), MAX(id)) AS keep_id
          FROM invoices
         WHERE status IN ('PENDING', 'PAID')
         GROUP BY visit_id
        HAVING COUNT(*) > 1) d ON d.visit_id = i.visit_id
   SET i.void_reason = 'Thu trùng ca khám - cần đối soát, hoàn tiền thủ công (tự động hủy khi nâng cấp V20)',
       i.voided_at = NOW(),
       i.voided_by = 'SYSTEM',
       i.status = 'CANCELLED'
 WHERE i.status = 'PAID' AND i.id <> d.keep_id;

UPDATE invoices i
  JOIN (SELECT visit_id,
               COALESCE(MIN(CASE WHEN status = 'PAID' THEN id END), MAX(id)) AS keep_id
          FROM invoices
         WHERE status IN ('PENDING', 'PAID')
         GROUP BY visit_id
        HAVING COUNT(*) > 1) d ON d.visit_id = i.visit_id
   SET i.status = 'CANCELLED',
       i.void_reason = 'Tự động hủy hóa đơn trùng ca khám khi nâng cấp V20',
       i.voided_at = NOW(),
       i.voided_by = 'SYSTEM'
 WHERE i.status = 'PENDING' AND i.id <> d.keep_id;

ALTER TABLE invoices
    ADD CONSTRAINT uk_invoices_code UNIQUE (invoice_code),
    ADD CONSTRAINT uk_invoices_transaction_code UNIQUE (transaction_code),
    ADD CONSTRAINT fk_invoices_cashier FOREIGN KEY (cashier_id) REFERENCES users(id);

-- Mỗi ca khám chỉ có 1 hóa đơn PENDING/PAID (NULL không tham gia ràng buộc UNIQUE)
ALTER TABLE invoices
    ADD COLUMN active_visit_id BIGINT
        GENERATED ALWAYS AS (IF(status IN ('PENDING', 'PAID'), visit_id, NULL)) STORED,
    ADD CONSTRAINT uk_invoices_active_visit UNIQUE (active_visit_id);

CREATE INDEX idx_invoices_status_paid_at ON invoices(status, paid_at);

-- 3. Dòng hóa đơn
ALTER TABLE invoice_items
    ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER description,
    ADD COLUMN unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER quantity;

UPDATE invoice_items SET unit_price = COALESCE(amount, 0) WHERE quantity = 1;
