"""
Danh mục khoa phòng THỰC TẾ của Mỹ Phát Hospital (đồng bộ với backend: bảng departments,
migration V16, và frontend dataService.js). Đây là nguồn dữ liệu duy nhất cho AI service.

Mô hình ML được huấn luyện trên bộ nhãn cũ (1, 3-10); ML_LABEL_TO_DEPT quy nhãn đó về khoa thật
nên không cần huấn luyện lại mô hình khi đổi danh mục.
"""

from typing import Dict, Tuple

# dept_id -> (tên khoa trong DB, bác sĩ phụ trách)
HOSPITAL_DEPARTMENTS: Dict[int, Tuple[str, str]] = {
    1: ("Khoa Khám bệnh / Cấp cứu ban đầu", "TS.BS Vi Mai Anh"),
    2: ("Ngoại khoa & Phẫu thuật / Tiểu phẫu", "BSCKII. Lê Thị Nga"),
    3: ("Sản - Phụ khoa", "BSCKII. Phạm Lan Vy"),
    10: ("Tai Mũi Họng", "ThS.BS Hoàng Thị Dung"),
    13: ("Khoa Y học cổ truyền – Phục hồi chức năng", "BS. Nguyễn Văn Sỹ"),
    14: ("Dịch vụ Thẩm mỹ / Tạo hình", "ThS.BS Lê Tuấn Hiệp"),
}

DEFAULT_DEPT_ID = 1

# Nhãn của mô hình ML (bộ khoa cũ) -> khoa thật của bệnh viện
ML_LABEL_TO_DEPT: Dict[int, int] = {
    1: 1,    # Nội tổng quát  -> Khám bệnh / Cấp cứu ban đầu
    3: 1,    # Hô hấp         -> Khám bệnh / Cấp cứu ban đầu
    4: 1,    # Nhi            -> Khám bệnh / Cấp cứu ban đầu
    5: 1,    # Tim mạch       -> Khám bệnh / Cấp cứu ban đầu
    6: 1,    # Tiêu hóa       -> Khám bệnh / Cấp cứu ban đầu
    7: 1,    # Thần kinh      -> Khám bệnh / Cấp cứu ban đầu
    8: 14,   # Da liễu        -> Thẩm mỹ / Tạo hình & Da liễu
    9: 13,   # Cơ xương khớp  -> Y học cổ truyền – Phục hồi chức năng
    10: 10,  # Tai mũi họng   -> Tai Mũi Họng
}


def department_name(dept_id: int) -> str:
    return HOSPITAL_DEPARTMENTS.get(dept_id, HOSPITAL_DEPARTMENTS[DEFAULT_DEPT_ID])[0]


def doctor_name(dept_id: int) -> str:
    return HOSPITAL_DEPARTMENTS.get(dept_id, HOSPITAL_DEPARTMENTS[DEFAULT_DEPT_ID])[1]
