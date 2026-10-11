-- =====================================================================================
-- HMS-AI - DỮ LIỆU THAM CHIẾU (SEED) CỦA CƠ SỞ DỮ LIỆU
-- Khớp với lược đồ trong schema.sql và các migration Flyway V10, V12, V16, V18, V22, V23.
--
-- Nội dung: 6 vai trò, 10 khoa/phòng, 15 thuốc thiết yếu, 6 cặp tương tác thuốc.
-- Tất cả là dữ liệu giả hoặc dữ liệu danh mục để chạy thử; giá và tồn kho chỉ mang tính minh họa.
--
-- LƯU Ý QUAN TRỌNG
--   * Khi chạy hệ thống thật, dữ liệu này đã được Flyway nạp tự động (V10, V12, V16, V18, V22, V23).
--     KHÔNG chạy tệp này trên CSDL do Flyway quản lý (sẽ trùng khóa). Chỉ nạp sau schema.sql vào
--     một database trống dùng thử:
--       mysql --default-character-set=utf8mb4 -u <user> -p <database_trống> < schema.sql
--       mysql --default-character-set=utf8mb4 -u <user> -p <database_trống> < seed.sql
--   * Tệp KHÔNG chứa tài khoản người dùng và KHÔNG chứa giá trị băm mật khẩu.
--     Các tài khoản mẫu (quản trị, lễ tân - kế toán, điều dưỡng, bác sĩ, bệnh nhân; danh sách và mật khẩu
--     mẫu xem README.md) do migration Flyway V10, V13, V15, V16, V23 tạo ra, kèm hồ sơ nhân viên
--     (staff_profiles) và lịch trực tuần mẫu (staff_schedules, V17, V23). Vì mật khẩu mẫu được công bố trong
--     README, các tài khoản này PHẢI được khóa hoặc đổi mật khẩu trước khi dùng CSDL thật:
--       mysql -u <user> -p hmsai_db < scripts/db/02_lock_demo_accounts.sql
--   * Vai trò Kế toán (ACCOUNTANT) đã gộp vào Lễ tân ở V22 nên bảng roles chỉ có 6 dòng; id 6 bị bỏ trống.
-- =====================================================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------------------------
-- 1. Vai trò (V10, đổi tên RECEPTIONIST và bỏ ACCOUNTANT ở V22)
-- ------------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `code`, `name`) VALUES
  (1, 'ADMIN', 'Quản trị viên'),
  (2, 'DOCTOR', 'Bác sĩ'),
  (3, 'NURSE', 'Điều dưỡng'),
  (4, 'PHARMACIST', 'Dược sĩ'),
  (5, 'RECEPTIONIST', 'Lễ tân - Kế toán'),
  (7, 'PATIENT', 'Bệnh nhân');

-- ------------------------------------------------------------------------------
-- 2. Khoa, phòng, bộ phận (V16; các khoa cũ id 4-9 của V10 đã được V18 xóa)
-- ------------------------------------------------------------------------------
INSERT INTO `departments` (`id`, `name`, `description`) VALUES
  (1, 'Khoa Khám bệnh / Cấp cứu ban đầu', 'Tiếp nhận khám, chẩn đoán, điều trị các bệnh lý nội khoa, ngoại khoa thông thường và xử lý sơ cứu kịp thời.'),
  (2, 'Ngoại khoa & Phẫu thuật / Tiểu phẫu', 'Thực hiện một số thủ thuật ngoại khoa nhỏ như phẫu thuật hội chứng ống cổ tay, xử lý tuyến mồ hôi nách, điều trị vết thương nông.'),
  (3, 'Sản - Phụ khoa', 'Khám, tư vấn quản lý thai kỳ và điều trị các bệnh phụ khoa thường gặp.'),
  (10, 'Tai Mũi Họng', 'Khám và điều trị các bệnh lý về đường hô hấp, dây thanh quản, khàn tiếng.'),
  (12, 'Phòng Dược & Cung ứng thuốc', 'Quản lý, cung ứng thuốc đạt chuẩn GPP và tư vấn sử dụng thuốc an toàn, hợp lý cho bệnh nhân.'),
  (13, 'Khoa Y học cổ truyền – Phục hồi chức năng', 'Chuyên trị các bệnh lý về cơ xương khớp như đau khớp gối, đau cổ vai gáy, đau lưng, thoát vị đĩa đệm bằng phương pháp vật lý trị liệu và Đông y.'),
  (14, 'Dịch vụ Thẩm mỹ / Tạo hình', 'Có bác sĩ chuyên trách hỗ trợ các dịch vụ như nâng mũi và tái tạo thẩm mỹ da.'),
  (15, 'Khoa Chẩn đoán hình ảnh', 'Siêu âm (siêu âm thai, siêu âm tổng quát) và các dịch vụ chụp chiếu kỹ thuật số giúp phát hiện chính xác bệnh lý.'),
  (16, 'Khoa Xét nghiệm', 'Thực hiện đầy đủ xét nghiệm máu, nước tiểu, test nhanh cúm A/B, xét nghiệm ký sinh trùng (như Demodex).'),
  (17, 'Dịch vụ Bảo hiểm Y tế (BHYT)', 'Phòng khám áp dụng thanh toán và đảm bảo đúng quyền lợi bảo hiểm y tế cho người dân khi đến khám từ Thứ 2 đến Thứ 7 hàng tuần.');

-- ------------------------------------------------------------------------------
-- 3. Danh mục thuốc thiết yếu (V12). Giá tính bằng đồng; hạn dùng và tồn kho minh họa.
--    V13 điều chỉnh thêm 3 thuốc (Warfarin, Diazepam, Digoxin) để thử cảnh báo tồn thấp/sắp hết hạn.
-- ------------------------------------------------------------------------------
INSERT INTO `drugs` (`id`, `code`, `name`, `unit`, `price`, `stock_quantity`, `expiry_date`) VALUES
  (1, 'DRUG-PARA-500', 'Paracetamol 500mg', 'Viên', 1500.00, 2500, '2027-12-31'),
  (2, 'DRUG-IBU-400', 'Ibuprofen 400mg', 'Viên', 2500.00, 1800, '2027-08-31'),
  (3, 'DRUG-ASP-81', 'Aspirin 81mg (Enteric-coated)', 'Viên', 2000.00, 1200, '2027-10-15'),
  (4, 'DRUG-WAR-5', 'Warfarin 5mg', 'Viên', 4500.00, 600, '2027-06-30'),
  (5, 'DRUG-AMOX-500', 'Amoxicillin 500mg', 'Viên', 3000.00, 2000, '2027-11-20'),
  (6, 'DRUG-CLARI-500', 'Clarithromycin 500mg', 'Viên', 12000.00, 800, '2027-09-15'),
  (7, 'DRUG-OMEP-20', 'Omeprazole 20mg', 'Viên', 3500.00, 1500, '2027-12-01'),
  (8, 'DRUG-MET-500', 'Metformin 500mg', 'Viên', 2200.00, 2200, '2027-10-30'),
  (9, 'DRUG-AMLO-5', 'Amlodipine 5mg', 'Viên', 2800.00, 1600, '2027-07-25'),
  (10, 'DRUG-CIPRO-500', 'Ciprofloxacin 500mg', 'Viên', 5500.00, 950, '2027-08-20'),
  (11, 'DRUG-ATOR-20', 'Atorvastatin 20mg', 'Viên', 6500.00, 1400, '2027-11-10'),
  (12, 'DRUG-CEFT-1G', 'Ceftriaxone 1g (Lọ tiêm)', 'Lọ', 35000.00, 450, '2027-05-15'),
  (13, 'DRUG-LORA-10', 'Loratadine 10mg', 'Viên', 1800.00, 1100, '2027-12-15'),
  (14, 'DRUG-DIAZ-5', 'Diazepam 5mg', 'Viên', 1200.00, 500, '2027-04-30'),
  (15, 'DRUG-DIGO-025', 'Digoxin 0.25mg', 'Viên', 3200.00, 700, '2027-06-15');

-- ------------------------------------------------------------------------------
-- 4. Tương tác thuốc (V12): dữ liệu tham chiếu y khoa cho kiểm tra khi kê đơn và cảnh báo của AI
-- ------------------------------------------------------------------------------
INSERT INTO `drug_interactions` (`id`, `drug_a_id`, `drug_b_id`, `severity`, `description`) VALUES
  (1, 3, 4, 'SEVERE', 'Aspirin kết hợp Warfarin: Tăng nguy cơ xuất huyết tiêu hóa và chảy máu nghiêm trọng.'),
  (2, 2, 3, 'MODERATE', 'Ibuprofen dùng chung Aspirin: Làm giảm tác dụng chống ngưng tập tiểu cầu bảo vệ tim mạch của Aspirin và tăng nguy cơ loét dạ dày.'),
  (3, 6, 11, 'SEVERE', 'Clarithromycin ức chế CYP3A4 làm tăng vọt nồng độ Atorvastatin: Nguy cơ cao gây tiêu cơ vân cấp và tổn thương thận.'),
  (4, 4, 10, 'MODERATE', 'Ciprofloxacin ức chế chuyển hóa Warfarin: Làm tăng chỉ số INR và nguy cơ chảy máu quá mức.'),
  (5, 7, 15, 'MILD', 'Omeprazole làm tăng pH dạ dày: Có thể làm tăng nhẹ độ hấp thu của Digoxin.'),
  (6, 8, 10, 'MODERATE', 'Ciprofloxacin phối hợp Metformin: Có thể gây rối loạn điều hòa đường huyết nghiêm trọng.');
