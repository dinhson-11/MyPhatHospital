"""
Dịch vụ Dự đoán Chuyên khoa bằng Mô hình Máy học (ML Triage Service)
Hệ thống HMS-AI Mỹ Phát Hospital.

Sử dụng mô hình TF-IDF + Logistic Regression đã được huấn luyện để phân loại
triệu chứng bệnh nhân vào chuyên khoa chính xác, giải quyết triệt để các ca:
- "dị ứng, nổi mẩn da" / "dị ứng, nổi mần da" -> Khoa Da liễu (dept_id: 8)
- "bé bị dị ứng, nổi mẩn da" / "con bị nổi mẩn ngứa" -> Khoa Da liễu (dept_id: 8)
- "bé sốt cao quấy khóc" / "trẻ 2 tuổi biếng ăn" -> Khoa Nhi (dept_id: 4)
"""

import os
import logging
from typing import Optional, Tuple, Dict, Any
import joblib

logger = logging.getLogger(__name__)

# Map mô tả chuyên khoa và bác sĩ phụ trách
DEPT_METADATA: Dict[int, Dict[str, Any]] = {
    8: {
        "dept_id": 8,
        "dept_name": "Khoa Da liễu",
        "doctor_name": "ThS. BS. Lê Thị Lan Anh",
        "reply": (
            "Dựa trên các triệu chứng về da và dị ứng bạn mô tả, hệ thống gợi ý bạn nên đến "
            "**Khoa Da liễu** để được bác sĩ chuyên khoa thăm khám trực tiếp, soi da vi điểm "
            "và kê đơn điều trị phù hợp."
        ),
        "reason": "Triệu chứng phù hợp với bệnh lý da liễu / dị ứng, mề đay, viêm da",
        "urgency": "MEDIUM",
    },
    4: {
        "dept_id": 4,
        "dept_name": "Khoa Nhi",
        "doctor_name": "BSCKII. Lê Hoàng Nam",
        "reply": (
            "Bạn đang hỏi về sức khỏe trẻ em. **Khoa Nhi** của chúng tôi có đội ngũ bác sĩ "
            "chuyên khoa nhi giàu kinh nghiệm, sẵn sàng thăm khám và tư vấn tận tình cho bé."
        ),
        "reason": "Triệu chứng bệnh lý hoặc theo dõi phát triển ở trẻ em (Nhi khoa)",
        "urgency": "HIGH",
    },
    5: {
        "dept_id": 5,
        "dept_name": "Khoa Tim mạch",
        "doctor_name": "BSCKII. Nguyễn Văn Hùng",
        "reply": (
            "Dựa trên triệu chứng bạn mô tả, hệ thống gợi ý bạn nên đến **Khoa Tim mạch** "
            "để được bác sĩ chuyên khoa thăm khám, đo điện tâm đồ (ECG) và siêu âm tim."
        ),
        "reason": "Triệu chứng gợi ý bệnh lý hệ tim mạch và tuần hoàn",
        "urgency": "HIGH",
    },
    3: {
        "dept_id": 3,
        "dept_name": "Khoa Hô hấp",
        "doctor_name": "BSCKI. Hoàng Mạnh Cường",
        "reply": (
            "Triệu chứng liên quan đến đường hô hấp. Bạn nên đến **Khoa Hô hấp** để bác sĩ "
            "thăm khám, nghe phổi và chỉ định chụp X-quang nếu cần."
        ),
        "reason": "Dấu hiệu viêm đường hô hấp hoặc bệnh lý phổi",
        "urgency": "HIGH",
    },
    6: {
        "dept_id": 6,
        "dept_name": "Khoa Tiêu hóa",
        "doctor_name": "ThS. BS. Phạm Thu Hương",
        "reply": (
            "Triệu chứng của bạn liên quan đến đường tiêu hóa. **Khoa Tiêu hóa** sẽ giúp bạn "
            "thăm khám và có thể chỉ định nội soi dạ dày/đại tràng để xác định nguyên nhân."
        ),
        "reason": "Triệu chứng bệnh lý tiêu hóa / dạ dày - ruột",
        "urgency": "MEDIUM",
    },
    7: {
        "dept_id": 7,
        "dept_name": "Khoa Thần kinh",
        "doctor_name": "TS. BS. Nguyễn Minh Đức",
        "reply": (
            "Triệu chứng của bạn cần được đánh giá bởi **Khoa Thần kinh**. Bác sĩ sẽ khám "
            "lâm sàng thần kinh và chỉ định chụp chiếu nếu cần thiết."
        ),
        "reason": "Triệu chứng thần kinh / tuần hoàn não",
        "urgency": "MEDIUM",
    },
    9: {
        "dept_id": 9,
        "dept_name": "Khoa Cơ xương khớp",
        "doctor_name": "BSCKII. Đặng Văn Long",
        "reply": (
            "Triệu chứng cơ xương khớp của bạn nên được thăm khám tại **Khoa Cơ xương khớp** "
            "để bác sĩ chụp X-quang, MRI và đưa ra phác đồ điều trị."
        ),
        "reason": "Dấu hiệu bệnh lý cơ xương khớp, thoái hóa hoặc viêm khớp",
        "urgency": "MEDIUM",
    },
    10: {
        "dept_id": 10,
        "dept_name": "Khoa Tai mũi họng",
        "doctor_name": "BSCKI. Vũ Đình Trọng",
        "reply": (
            "Triệu chứng tai mũi họng của bạn cần được nội soi kiểm tra tại **Khoa Tai mũi họng** "
            "để xác định mức độ viêm nhiễm và điều trị dứt điểm."
        ),
        "reason": "Triệu chứng viêm nhiễm hoặc bệnh lý vùng tai mũi họng",
        "urgency": "MEDIUM",
    },
    1: {
        "dept_id": 1,
        "dept_name": "Khoa Nội tổng quát",
        "doctor_name": "PGS. TS. Trần Thị Mai",
        "reply": (
            "Với triệu chứng bạn mô tả, **Khoa Nội tổng quát** là lựa chọn phù hợp để bác sĩ "
            "đánh giá tổng thể ban đầu và chỉ định các xét nghiệm cần thiết."
        ),
        "reason": "Khám sức khỏe tổng quát và sàng lọc ban đầu",
        "urgency": "MEDIUM",
    },
}

# Biến singleton lưu trữ mô hình nạp trong bộ nhớ
_MODEL_PIPELINE = None
_MODEL_LOADED = False


def load_trained_model():
    """Tải mô hình ML đã huấn luyện từ đĩa vào bộ nhớ."""
    global _MODEL_PIPELINE, _MODEL_LOADED
    if _MODEL_LOADED:
        return _MODEL_PIPELINE

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, "models", "trained_triage_model.joblib")

    if os.path.exists(model_path):
        try:
            artifact = joblib.load(model_path)
            _MODEL_PIPELINE = artifact.get("pipeline")
            _MODEL_LOADED = True
            logger.info(f"Đã nạp thành công mô hình ML Triage từ {model_path}")
            return _MODEL_PIPELINE
        except Exception as e:
            logger.warning(f"Không thể nạp mô hình ML Triage từ {model_path}: {e}")
            _MODEL_LOADED = True
            _MODEL_PIPELINE = None
            return None
    else:
        logger.warning(f"Không tìm thấy file mô hình tại {model_path}")
        _MODEL_LOADED = True
        _MODEL_PIPELINE = None
        return None


def predict_department(text: str) -> Optional[Tuple[int, str, float, Dict[str, Any]]]:
    """
    Dự đoán chuyên khoa dựa trên văn bản triệu chứng.
    Trả về: (dept_id, dept_name, confidence, metadata_dict) hoặc None nếu không dự đoán được.
    """
    if not text or len(text.strip()) < 3:
        return None

    clean_text = text.lower().strip()

    # Thử nạp và dự đoán bằng mô hình ML
    pipeline = load_trained_model()
    if pipeline is not None:
        try:
            pred_id = int(pipeline.predict([clean_text])[0])
            probs = pipeline.predict_proba([clean_text])[0]
            classes = pipeline.classes_
            prob_dict = {int(c): float(p) for c, p in zip(classes, probs)}
            confidence = prob_dict.get(pred_id, 0.0)

            # Ngưỡng tin cậy tối thiểu của mô hình
            if confidence >= 0.25 and pred_id in DEPT_METADATA:
                meta = DEPT_METADATA[pred_id]
                return pred_id, meta["dept_name"], confidence, meta
        except Exception as e:
            logger.warning(f"Lỗi khi dự đoán bằng mô hình ML: {e}")

    return None
