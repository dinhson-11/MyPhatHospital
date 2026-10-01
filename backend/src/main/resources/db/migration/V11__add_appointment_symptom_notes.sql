-- =============================================
-- V11: Thêm cột symptom, notes cho bảng appointments
-- Sprint 3: Đặt lịch khám
-- =============================================

ALTER TABLE appointments
    ADD COLUMN symptom VARCHAR(500) AFTER source,
    ADD COLUMN notes VARCHAR(500) AFTER symptom;

-- Index cho patient + status (query lịch hẹn của bệnh nhân)
CREATE INDEX idx_appointments_patient_status ON appointments(patient_id, status);

-- Index cho scheduled_at (query khung giờ trống)
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
