-- =============================================
-- V14: Bổ sung nhóm máu cho hồ sơ bệnh nhân (Sprint 2 – FR-2)
-- =============================================

ALTER TABLE patients
    ADD COLUMN blood_type VARCHAR(5) NULL AFTER phone;
