-- ==============================================================
-- V17: Đồng bộ lịch trực Bác sĩ & Nhân viên y tế Mỹ Phát Hospital
-- Khớp chuẩn danh sách 9 Bác sĩ / Dược sĩ và phân luồng khoa phòng
-- ==============================================================

-- 1. Làm sạch các ca trực mẫu cũ từ mockup ban đầu
DELETE FROM staff_schedules;

-- 2. Thiết lập mốc Thứ 2 của tuần hiện tại và tuần kế tiếp
SET @mon = DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY);

-- ==============================================================
-- TUẦN HIỆN TẠI (@mon + 0 -> 6)
-- ==============================================================

-- 1. TS.BS Vi Mai Anh (Khoa Khám bệnh / Cấp cứu ban đầu, Dept 1, P.101)
-- Thứ 2 đến Thứ 7: Sáng + Chiều; Trực đêm Thứ 4 & Chủ Nhật
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng khám ban đầu 101 (Tầng 1)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Trực khám bệnh ban đầu buổi sáng' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Khám nội tổng quát & hội chẩn' UNION ALL
    SELECT 1, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 1, 'AFTERNOON', 'Khám nội tổng quát & hẹn khám' UNION ALL
    SELECT 2, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 2, 'AFTERNOON', 'Khám nội tổng quát' UNION ALL
    SELECT 2, 'NIGHT', 'Trực Cấp cứu ban đêm 24/7' UNION ALL
    SELECT 3, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 3, 'AFTERNOON', 'Khám nội tổng quát' UNION ALL
    SELECT 4, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 4, 'AFTERNOON', 'Khám nội tổng quát' UNION ALL
    SELECT 5, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 5, 'AFTERNOON', 'Khám nội tổng quát cuối tuần' UNION ALL
    SELECT 6, 'NIGHT', 'Trực Cấp cứu ban đêm 24/7'
) d
WHERE u.username IN ('bacsi', 'bs.maianh');

-- 2. BSCKII. Lê Thị Nga (Ngoại khoa & Phẫu thuật / Tiểu phẫu, Dept 2, P.402)
-- Thứ 2, 4, 6: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 2, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng khám Ngoại 402 (Tầng 4)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Khám Ngoại tổng quát & hội chẩn mổ' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Tiểu phẫu ống cổ tay & phẫu thuật nhỏ' UNION ALL
    SELECT 2, 'MORNING', 'Khám Ngoại & xử lý u lành, vết thương' UNION ALL
    SELECT 2, 'AFTERNOON', 'Tiểu phẫu tuyến mồ hôi & hội chẩn' UNION ALL
    SELECT 4, 'MORNING', 'Khám ngoại & thủ thuật ngoại trú' UNION ALL
    SELECT 4, 'AFTERNOON', 'Tái khám sau tiểu phẫu & xử lý vết thương'
) d
WHERE u.username = 'bs.nga';

-- 3. BSCKII. Phạm Lan Vy (Sản - Phụ khoa, Dept 3, P.302)
-- Thứ 2 đến Thứ 6: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 3, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng khám Sản 302 (Tầng 3)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Khám Sản - Phụ khoa buổi sáng' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Quản lý thai kỳ & tư vấn tiền sản' UNION ALL
    SELECT 1, 'MORNING', 'Khám thai định kỳ & sàng lọc dị tật' UNION ALL
    SELECT 1, 'AFTERNOON', 'Điều trị bệnh lý phụ khoa thường gặp' UNION ALL
    SELECT 2, 'MORNING', 'Khám Sản - Phụ khoa buổi sáng' UNION ALL
    SELECT 2, 'AFTERNOON', 'Tư vấn kế hoạch hóa gia đình' UNION ALL
    SELECT 3, 'MORNING', 'Khám thai định kỳ & theo dõi tim thai' UNION ALL
    SELECT 3, 'AFTERNOON', 'Khám phụ khoa & soi cổ tử cung' UNION ALL
    SELECT 4, 'MORNING', 'Khám Sản - Phụ khoa buổi sáng' UNION ALL
    SELECT 4, 'AFTERNOON', 'Tư vấn thai kỳ nguy cơ cao'
) d
WHERE u.username = 'bs.vy';

-- 4. ThS.BS Hoàng Thị Dung (Tai Mũi Họng, Dept 10, P.212)
-- Thứ 2, 4, 6: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 10, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng khám TMH 212 (Tầng 2)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Khám TMH & Nội soi thanh quản' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Điều trị viêm xoang, viêm họng, khàn tiếng' UNION ALL
    SELECT 2, 'MORNING', 'Khám TMH & Nội soi chẩn đoán' UNION ALL
    SELECT 2, 'AFTERNOON', 'Hút rửa mũi xoang & khí dung điều trị' UNION ALL
    SELECT 4, 'MORNING', 'Khám TMH & Nội soi ống mềm' UNION ALL
    SELECT 4, 'AFTERNOON', 'Tư vấn điều trị khàn tiếng mãn tính'
) d
WHERE u.username = 'bs.dung';

-- 5. BS. Nguyễn Văn Sỹ (Khoa Y học cổ truyền – Phục hồi chức năng, Dept 13, P.206)
-- Thứ 2 đến Thứ 7: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 13, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng Trị liệu PHCN 206 (Tầng 2)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Khám cơ xương khớp & YHCT' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Châm cứu, bấm huyệt & trị liệu cột sống' UNION ALL
    SELECT 1, 'MORNING', 'Khám & trị liệu khớp gối, cổ vai gáy' UNION ALL
    SELECT 1, 'AFTERNOON', 'Vật lý trị liệu thoát vị đĩa đệm' UNION ALL
    SELECT 2, 'MORNING', 'Khám cơ xương khớp & YHCT' UNION ALL
    SELECT 2, 'AFTERNOON', 'Kéo dãn cột sống & siêu âm trị liệu' UNION ALL
    SELECT 3, 'MORNING', 'Khám & trị liệu cổ vai gáy' UNION ALL
    SELECT 3, 'AFTERNOON', 'Điện châm & phục hồi chức năng' UNION ALL
    SELECT 4, 'MORNING', 'Khám cơ xương khớp & YHCT' UNION ALL
    SELECT 4, 'AFTERNOON', 'Trị liệu đau dây thần kinh tọa' UNION ALL
    SELECT 5, 'MORNING', 'Khám YHCT & PHCN cuối tuần' UNION ALL
    SELECT 5, 'AFTERNOON', 'Trị liệu cơ xương khớp cuối tuần'
) d
WHERE u.username = 'bs.sy';

-- 6. ThS.BS Lê Tuấn Hiệp (Dịch vụ Thẩm mỹ / Tạo hình, Dept 14, P.209)
-- Thứ 3, 5, 7: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 14, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng Thẩm mỹ 209 (Tầng 2)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 1 as day_offset, 'MORNING' as shift, 'Tư vấn Thẩm mỹ tạo hình & Nâng mũi' as note UNION ALL
    SELECT 1, 'AFTERNOON', 'Chăm sóc tái tạo da & laser vi điểm' UNION ALL
    SELECT 3, 'MORNING', 'Tư vấn Thẩm mỹ tạo hình khuôn mặt' UNION ALL
    SELECT 3, 'AFTERNOON', 'Thẩm mỹ công nghệ cao & da liễu' UNION ALL
    SELECT 5, 'MORNING', 'Tư vấn Thẩm mỹ & Nâng mũi chuyên sâu' UNION ALL
    SELECT 5, 'AFTERNOON', 'Tái tạo da & theo dõi hậu phẫu'
) d
WHERE u.username = 'bs.hiep';

-- 7. TS.BS Trần Thị An (Khoa Chẩn đoán hình ảnh, Dept 15, P.104)
-- Thứ 2 đến Thứ 7: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 15, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng Siêu âm 104 (Tầng 1)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Siêu âm 4D màu & siêu âm thai' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Chụp X-quang số hóa & đọc kết quả' UNION ALL
    SELECT 1, 'MORNING', 'Siêu âm tổng quát ổ bụng & tuyến giáp' UNION ALL
    SELECT 1, 'AFTERNOON', 'Chẩn đoán hình ảnh tim mạch' UNION ALL
    SELECT 2, 'MORNING', 'Siêu âm 4D màu & siêu âm thai' UNION ALL
    SELECT 2, 'AFTERNOON', 'Chẩn đoán hình ảnh kỹ thuật số' UNION ALL
    SELECT 3, 'MORNING', 'Siêu âm ổ bụng & phần mềm' UNION ALL
    SELECT 3, 'AFTERNOON', 'Đọc kết quả X-quang kỹ thuật số' UNION ALL
    SELECT 4, 'MORNING', 'Siêu âm 4D màu thai & tim thai' UNION ALL
    SELECT 4, 'AFTERNOON', 'Hội chẩn hình ảnh chẩn đoán' UNION ALL
    SELECT 5, 'MORNING', 'Siêu âm tổng quát cuối tuần' UNION ALL
    SELECT 5, 'AFTERNOON', 'Chẩn đoán hình ảnh cuối tuần'
) d
WHERE u.username = 'bs.an';

-- 8. ThS.BS Hoàng Văn Toán (Khoa Xét nghiệm, Dept 16, P.105)
-- Thứ 2 đến Thứ 7: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 16, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Khu Xét nghiệm 105 (Tầng 1)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Xét nghiệm huyết học, sinh hóa máu' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Test nhanh Cúm A/B, sốt xuất huyết' UNION ALL
    SELECT 1, 'MORNING', 'Xét nghiệm tổng phân tích máu, nước tiểu' UNION ALL
    SELECT 1, 'AFTERNOON', 'Xét nghiệm ký sinh trùng (Demodex)' UNION ALL
    SELECT 2, 'MORNING', 'Xét nghiệm sinh hóa máu, men gan, mỡ máu' UNION ALL
    SELECT 2, 'AFTERNOON', 'Trả kết quả & kiểm chuẩn chất lượng' UNION ALL
    SELECT 3, 'MORNING', 'Xét nghiệm huyết học & đông máu' UNION ALL
    SELECT 3, 'AFTERNOON', 'Xét nghiệm miễn dịch & test nhanh' UNION ALL
    SELECT 4, 'MORNING', 'Xét nghiệm tổng quát định kỳ' UNION ALL
    SELECT 4, 'AFTERNOON', 'Xét nghiệm ký sinh trùng & vi sinh' UNION ALL
    SELECT 5, 'MORNING', 'Xét nghiệm cấp cứu & trả kết quả nhanh' UNION ALL
    SELECT 5, 'AFTERNOON', 'Kiểm kê hóa chất sinh phẩm cuối tuần'
) d
WHERE u.username = 'bs.toan';

-- 9. ThS.DS Lê Hải Quang (Phòng Dược & Cung ứng thuốc, Dept 12, P.Dược A)
-- Thứ 2 đến Thứ 7: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 12, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Phòng Dược Tầng 1 (Khu A)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Cấp phát thuốc BHYT & ngoại trú' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Tư vấn dược lâm sàng & tương tác thuốc' UNION ALL
    SELECT 1, 'MORNING', 'Cấp phát thuốc GPP theo đơn' UNION ALL
    SELECT 1, 'AFTERNOON', 'Kiểm tra nhiệt độ bảo quản kho thuốc' UNION ALL
    SELECT 2, 'MORNING', 'Cấp phát thuốc BHYT & ngoại trú' UNION ALL
    SELECT 2, 'AFTERNOON', 'Kiểm kê tồn kho & hạn dùng' UNION ALL
    SELECT 3, 'MORNING', 'Cấp phát thuốc GPP theo đơn' UNION ALL
    SELECT 3, 'AFTERNOON', 'Tư vấn dùng thuốc kháng sinh an toàn' UNION ALL
    SELECT 4, 'MORNING', 'Cấp phát thuốc BHYT & ngoại trú' UNION ALL
    SELECT 4, 'AFTERNOON', 'Dự trù cơ số thuốc cấp cứu' UNION ALL
    SELECT 5, 'MORNING', 'Cấp phát thuốc ngoại trú cuối tuần' UNION ALL
    SELECT 5, 'AFTERNOON', 'Tổng kết xuất nhập tồn tuần'
) d
WHERE u.username IN ('duocsi', 'ds.quang');

-- 10. CN. Hoàng Thùy Linh (Lễ tân tiếp đón & BHYT, Dept 1)
-- Thứ 2 đến Thứ 7: Sáng + Chiều
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Quầy Tiếp đón & Giám định BHYT', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Tiếp đón & phân luồng bệnh nhân' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Giám định thẻ BHYT & cấp số thứ tự' UNION ALL
    SELECT 1, 'MORNING', 'Tiếp đón bệnh nhân khám theo lịch hẹn' UNION ALL
    SELECT 1, 'AFTERNOON', 'Hướng dẫn làm thủ tục hồ sơ bệnh án' UNION ALL
    SELECT 2, 'MORNING', 'Tiếp đón & phân luồng các khoa' UNION ALL
    SELECT 2, 'AFTERNOON', 'Tư vấn quy trình khám chữa bệnh BHYT' UNION ALL
    SELECT 3, 'MORNING', 'Tiếp đón bệnh nhân khám ban đầu' UNION ALL
    SELECT 3, 'AFTERNOON', 'Xác thực thông tin CCCD gắn chip' UNION ALL
    SELECT 4, 'MORNING', 'Tiếp đón & điều phối phòng khám' UNION ALL
    SELECT 4, 'AFTERNOON', 'Hỗ trợ bệnh nhân xuất viện' UNION ALL
    SELECT 5, 'MORNING', 'Tiếp đón bệnh nhân khám thứ 7' UNION ALL
    SELECT 5, 'AFTERNOON', 'Hỗ trợ thông tin & tổng kết lượt tiếp đón'
) d
WHERE u.username = 'letan';

-- 11. ĐD. Phạm Thu Hà (Điều dưỡng & Lab sinh hiệu, Dept 1)
-- Thứ 2 đến Thứ 7: Sáng + Chiều; Trực đêm Thứ 2 & Thứ 6
INSERT INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, DATE_ADD(@mon, INTERVAL d.day_offset DAY), d.shift, 'Khu Chăm sóc sinh hiệu & Lấy mẫu', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (
    SELECT 0 as day_offset, 'MORNING' as shift, 'Đo huyết áp, nhiệt độ & SpO2' as note UNION ALL
    SELECT 0, 'AFTERNOON', 'Hỗ trợ lấy mẫu xét nghiệm' UNION ALL
    SELECT 0, 'NIGHT', 'Trực cấp cứu theo dõi bệnh nhân' UNION ALL
    SELECT 1, 'MORNING', 'Đo sinh hiệu phòng khám ban đầu' UNION ALL
    SELECT 1, 'AFTERNOON', 'Hỗ trợ tiêm truyền theo y lệnh' UNION ALL
    SELECT 2, 'MORNING', 'Đo sinh hiệu & sơ cấp cứu' UNION ALL
    SELECT 2, 'AFTERNOON', 'Lấy mẫu bệnh phẩm phòng xét nghiệm' UNION ALL
    SELECT 3, 'MORNING', 'Đo huyết áp & đường huyết mao mạch' UNION ALL
    SELECT 3, 'AFTERNOON', 'Hỗ trợ thủ thuật tại phòng tiểu phẫu' UNION ALL
    SELECT 4, 'MORNING', 'Đo sinh hiệu ban đầu' UNION ALL
    SELECT 4, 'AFTERNOON', 'Thay băng, rửa vết thương ngoại trú' UNION ALL
    SELECT 4, 'NIGHT', 'Trực cấp cứu theo dõi bệnh nhân' UNION ALL
    SELECT 5, 'MORNING', 'Đo sinh hiệu & chăm sóc cuối tuần' UNION ALL
    SELECT 5, 'AFTERNOON', 'Hỗ trợ phòng khám tổng quát'
) d
WHERE u.username = 'dieuduong';

-- ==============================================================
-- TUẦN KẾ TIẾP (@mon + 7 -> 13)
-- Tự động sao chép lịch cho tuần sau để nhân viên luôn có lịch trực sẵn sàng
-- ==============================================================
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT staff_id, department_id, DATE_ADD(work_date, INTERVAL 7 DAY), shift, room_no, note
FROM staff_schedules
WHERE work_date >= @mon AND work_date < DATE_ADD(@mon, INTERVAL 7 DAY);
