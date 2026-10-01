-- =============================================
-- V12: Seed danh mục thuốc thiết yếu và tương tác thuốc
-- Sprint 4: Khám bệnh, kê đơn và cận lâm sàng
-- =============================================

-- 1. Danh mục thuốc thiết yếu (15 loại thuốc phổ biến trong lâm sàng)
INSERT INTO drugs (id, code, name, unit, price, stock_quantity, expiry_date, created_at, updated_at) VALUES
(1, 'DRUG-PARA-500', 'Paracetamol 500mg', 'Viên', 1500.00, 2500, '2027-12-31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'DRUG-IBU-400', 'Ibuprofen 400mg', 'Viên', 2500.00, 1800, '2027-08-31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'DRUG-ASP-81', 'Aspirin 81mg (Enteric-coated)', 'Viên', 2000.00, 1200, '2027-10-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'DRUG-WAR-5', 'Warfarin 5mg', 'Viên', 4500.00, 600, '2027-06-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'DRUG-AMOX-500', 'Amoxicillin 500mg', 'Viên', 3000.00, 2000, '2027-11-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'DRUG-CLARI-500', 'Clarithromycin 500mg', 'Viên', 12000.00, 800, '2027-09-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'DRUG-OMEP-20', 'Omeprazole 20mg', 'Viên', 3500.00, 1500, '2027-12-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'DRUG-MET-500', 'Metformin 500mg', 'Viên', 2200.00, 2200, '2027-10-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'DRUG-AMLO-5', 'Amlodipine 5mg', 'Viên', 2800.00, 1600, '2027-07-25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'DRUG-CIPRO-500', 'Ciprofloxacin 500mg', 'Viên', 5500.00, 950, '2027-08-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'DRUG-ATOR-20', 'Atorvastatin 20mg', 'Viên', 6500.00, 1400, '2027-11-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'DRUG-CEFT-1G', 'Ceftriaxone 1g (Lọ tiêm)', 'Lọ', 35000.00, 450, '2027-05-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'DRUG-LORA-10', 'Loratadine 10mg', 'Viên', 1800.00, 1100, '2027-12-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'DRUG-DIAZ-5', 'Diazepam 5mg', 'Viên', 1200.00, 500, '2027-04-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'DRUG-DIGO-025', 'Digoxin 0.25mg', 'Viên', 3200.00, 700, '2027-06-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Tương tác thuốc (Dữ liệu tham chiếu y khoa phục vụ kiểm tra và AI cảnh báo ở Sprint 5)
INSERT INTO drug_interactions (id, drug_a_id, drug_b_id, severity, description, created_at) VALUES
(1, 3, 4, 'SEVERE', 'Aspirin kết hợp Warfarin: Tăng nguy cơ xuất huyết tiêu hóa và chảy máu nghiêm trọng.', CURRENT_TIMESTAMP),
(2, 2, 3, 'MODERATE', 'Ibuprofen dùng chung Aspirin: Làm giảm tác dụng chống ngưng tập tiểu cầu bảo vệ tim mạch của Aspirin và tăng nguy cơ loét dạ dày.', CURRENT_TIMESTAMP),
(3, 6, 11, 'SEVERE', 'Clarithromycin ức chế CYP3A4 làm tăng vọt nồng độ Atorvastatin: Nguy cơ cao gây tiêu cơ vân cấp và tổn thương thận.', CURRENT_TIMESTAMP),
(4, 4, 10, 'MODERATE', 'Ciprofloxacin ức chế chuyển hóa Warfarin: Làm tăng chỉ số INR và nguy cơ chảy máu quá mức.', CURRENT_TIMESTAMP),
(5, 7, 15, 'MILD', 'Omeprazole làm tăng pH dạ dày: Có thể làm tăng nhẹ độ hấp thu của Digoxin.', CURRENT_TIMESTAMP),
(6, 8, 10, 'MODERATE', 'Ciprofloxacin phối hợp Metformin: Có thể gây rối loạn điều hòa đường huyết nghiêm trọng.', CURRENT_TIMESTAMP);
