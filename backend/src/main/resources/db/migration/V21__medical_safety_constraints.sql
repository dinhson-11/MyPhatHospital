-- =============================================
-- V21: Ràng buộc an toàn y khoa
--   1. Lý do bác sĩ xác nhận kê đơn khi có cảnh báo nghiêm trọng (prescriptions.override_reason)
--   2. Mỗi đơn thuốc chỉ được cấp phát 1 lần (UNIQUE dispenses.prescription_id)
--   3. Tồn kho thuốc không âm (CHECK drugs.stock_quantity >= 0)
--   4. Mỗi lịch hẹn chỉ gắn với 1 lượt khám (UNIQUE visits.appointment_id)
--   5. Dọn kết quả cận lâm sàng bị ghi trùng do lỗi lưu 2 lần trước đây
-- =============================================

-- 1. Lý do xác nhận kê đơn
ALTER TABLE prescriptions
    ADD COLUMN override_reason VARCHAR(500) NULL AFTER visit_id;

-- 2. Cấp phát trùng: giữ bản ghi cấp phát sớm nhất của mỗi đơn
--    (lưu ý: tồn kho đã bị trừ 2 lần cho các đơn này – cần kiểm kê lại thủ công)
DELETE d FROM dispenses d
  JOIN (SELECT prescription_id, MIN(id) AS keep_id
          FROM dispenses
         GROUP BY prescription_id
        HAVING COUNT(*) > 1) k ON k.prescription_id = d.prescription_id
 WHERE d.id <> k.keep_id;

ALTER TABLE dispenses
    ADD CONSTRAINT uk_dispenses_prescription UNIQUE (prescription_id);

-- 3. Tồn kho âm (do cấp phát trùng/đồng thời trước đây) đưa về 0 trước khi thêm ràng buộc
UPDATE drugs SET stock_quantity = 0 WHERE stock_quantity < 0;

ALTER TABLE drugs
    ADD CONSTRAINT chk_drugs_stock_non_negative CHECK (stock_quantity >= 0);

-- 4. Nhiều lượt khám cùng một lịch hẹn: giữ liên kết ở lượt khám đầu tiên,
--    các lượt khám sau vẫn giữ nguyên dữ liệu lâm sàng nhưng bỏ liên kết lịch hẹn
UPDATE visits v
  JOIN (SELECT appointment_id, MIN(id) AS keep_id
          FROM visits
         WHERE appointment_id IS NOT NULL
         GROUP BY appointment_id
        HAVING COUNT(*) > 1) d ON d.appointment_id = v.appointment_id
   SET v.appointment_id = NULL
 WHERE v.id <> d.keep_id;

ALTER TABLE visits
    ADD CONSTRAINT uk_visits_appointment UNIQUE (appointment_id);

-- 5. Kết quả CLS trùng tuyệt đối (cùng chỉ định, nội dung, file, thời điểm): giữ bản ghi đầu tiên
DELETE r FROM lab_results r
  JOIN lab_results k
    ON k.lab_order_id = r.lab_order_id
   AND k.id < r.id
   AND k.result_text <=> r.result_text
   AND k.result_file_url <=> r.result_file_url
   AND k.resulted_at <=> r.resulted_at;
