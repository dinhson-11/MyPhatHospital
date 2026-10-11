"""
Dịch vụ Dự đoán Chuyên khoa bằng Mô hình Máy học (ML Triage Service)
Hệ thống HMS-AI Mỹ Phát Hospital.

Sử dụng mô hình TF-IDF + Logistic Regression đã được huấn luyện để phân loại
triệu chứng bệnh nhân vào chuyên khoa chính xác, giải quyết triệt để các ca:
- "dị ứng, nổi mẩn da" / "dị ứng, nổi mần da" -> Dịch vụ Thẩm mỹ / Tạo hình & Da liễu (dept_id: 14)
- "bé bị dị ứng, nổi mẩn da" / "con bị nổi mẩn ngứa" -> Dịch vụ Thẩm mỹ / Tạo hình & Da liễu (dept_id: 14)
- "bé sốt cao quấy khóc" / "trẻ 2 tuổi biếng ăn" -> Khoa Khám bệnh / Cấp cứu ban đầu (dept_id: 1)
"""

import os
import logging
from typing import Optional, Tuple, Dict, Any
import joblib

logger = logging.getLogger(__name__)

from services.hospital_catalog import ML_LABEL_TO_DEPT, department_name, doctor_name
from services.text_normalizer import normalize_text

# Nội dung tư vấn theo NHÃN của mô hình ML (bộ nhãn cũ). Khoa/bác sĩ đề xuất luôn là khoa THỰC TẾ
# của Mỹ Phát Hospital, quy đổi qua ML_LABEL_TO_DEPT (xem hospital_catalog.py).
_LABEL_ADVICE: Dict[int, Dict[str, str]] = {
    8: {
        "focus": "da liễu / dị ứng",
        "reply_tail": "bác sĩ sẽ soi da, xác định nguyên nhân dị ứng và kê đơn điều trị phù hợp",
        "reason": "Triệu chứng phù hợp với bệnh lý da liễu / dị ứng, mề đay, viêm da",
        "urgency": "MEDIUM",
    },
    4: {
        "focus": "sức khỏe trẻ em",
        "reply_tail": "bác sĩ sẽ thăm khám và tư vấn tận tình cho bé",
        "reason": "Triệu chứng bệnh lý hoặc theo dõi phát triển ở trẻ em",
        "urgency": "HIGH",
    },
    5: {
        "focus": "tim mạch",
        "reply_tail": "bác sĩ sẽ thăm khám, đo điện tâm đồ (ECG) và chỉ định thêm xét nghiệm nếu cần",
        "reason": "Triệu chứng gợi ý bệnh lý hệ tim mạch và tuần hoàn",
        "urgency": "HIGH",
    },
    3: {
        "focus": "đường hô hấp",
        "reply_tail": "bác sĩ sẽ thăm khám, nghe phổi và chỉ định chụp X-quang nếu cần",
        "reason": "Dấu hiệu viêm đường hô hấp hoặc bệnh lý phổi",
        "urgency": "HIGH",
    },
    6: {
        "focus": "đường tiêu hóa",
        "reply_tail": "bác sĩ sẽ thăm khám và chỉ định xét nghiệm để xác định nguyên nhân",
        "reason": "Triệu chứng bệnh lý tiêu hóa / dạ dày - ruột",
        "urgency": "MEDIUM",
    },
    7: {
        "focus": "thần kinh",
        "reply_tail": "bác sĩ sẽ khám lâm sàng và chỉ định thêm cận lâm sàng nếu cần thiết",
        "reason": "Triệu chứng thần kinh / tuần hoàn não",
        "urgency": "MEDIUM",
    },
    9: {
        "focus": "cơ xương khớp",
        "reply_tail": "bác sĩ sẽ thăm khám, tư vấn vật lý trị liệu và phục hồi chức năng phù hợp",
        "reason": "Dấu hiệu bệnh lý cơ xương khớp, thoái hóa hoặc viêm khớp",
        "urgency": "MEDIUM",
    },
    10: {
        "focus": "tai mũi họng",
        "reply_tail": "bác sĩ sẽ nội soi kiểm tra để xác định mức độ viêm nhiễm và điều trị dứt điểm",
        "reason": "Triệu chứng viêm nhiễm hoặc bệnh lý vùng tai mũi họng",
        "urgency": "MEDIUM",
    },
    1: {
        "focus": "sức khỏe tổng quát",
        "reply_tail": "bác sĩ sẽ đánh giá tổng thể ban đầu và chỉ định các xét nghiệm cần thiết",
        "reason": "Khám sức khỏe tổng quát và sàng lọc ban đầu",
        "urgency": "MEDIUM",
    },
}


def _build_metadata() -> Dict[int, Dict[str, Any]]:
    result: Dict[int, Dict[str, Any]] = {}
    for label, advice in _LABEL_ADVICE.items():
        dept_id = ML_LABEL_TO_DEPT[label]
        dept_name = department_name(dept_id)
        result[label] = {
            "label": label,
            "dept_id": dept_id,
            "dept_name": dept_name,
            "doctor_name": doctor_name(dept_id),
            "reply": (
                f"Dựa trên triệu chứng về {advice['focus']} bạn mô tả, hệ thống gợi ý bạn nên đến "
                f"**{dept_name}** của Mỹ Phát Hospital, {advice['reply_tail']}."
            ),
            "reason": advice["reason"],
            "urgency": advice["urgency"],
        }
    return result


# Khóa = nhãn mô hình ML; giá trị chứa khoa thật của bệnh viện
DEPT_METADATA: Dict[int, Dict[str, Any]] = _build_metadata()

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


# Ngưỡng tin cậy của mô hình. Mô hình gán ~0.40 cho chuỗi vô nghĩa ("xyz abc" -> Da liễu),
# nên chỉ chấp nhận dự đoán khi đủ tự tin VÀ bỏ xa nhãn thứ hai; ngược lại trả None để
# chatbot dùng luật từ khóa rồi mặc định Khoa Khám bệnh / Cấp cứu ban đầu (dept 1).
ML_MIN_CONFIDENCE = 0.6
ML_MIN_MARGIN = 0.2


def predict_department(text: str) -> Optional[Tuple[int, str, float, Dict[str, Any]]]:
    """
    Dự đoán chuyên khoa dựa trên văn bản triệu chứng.
    Trả về: (dept_id, dept_name, confidence, metadata_dict) hoặc None nếu không dự đoán được
    hoặc mô hình không đủ tự tin (confidence < ML_MIN_CONFIDENCE hoặc top1 - top2 < ML_MIN_MARGIN).
    """
    if not text or len(text.strip()) < 3:
        return None

    clean_text = normalize_text(text)

    # Thử nạp và dự đoán bằng mô hình ML
    pipeline = load_trained_model()
    if pipeline is not None:
        try:
            probs = pipeline.predict_proba([clean_text])[0]
            classes = pipeline.classes_
            ranked = sorted(
                ((float(p), int(c)) for c, p in zip(classes, probs)), reverse=True
            )
            confidence, pred_id = ranked[0]
            runner_up = ranked[1][0] if len(ranked) > 1 else 0.0

            # Ngưỡng tin cậy tối thiểu + khoảng cách tối thiểu với nhãn thứ hai
            if (
                confidence >= ML_MIN_CONFIDENCE
                and (confidence - runner_up) >= ML_MIN_MARGIN
                and pred_id in DEPT_METADATA
            ):
                meta = DEPT_METADATA[pred_id]
                return meta["dept_id"], meta["dept_name"], confidence, meta
        except Exception as e:
            logger.warning(f"Lỗi khi dự đoán bằng mô hình ML: {e}")

    return None
