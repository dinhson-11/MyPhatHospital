"""
AI Diagnosis Suggestion Engine (FR-11.3 – Sprint 6):
Gợi ý chẩn đoán phân biệt ICD-10 dựa trên triệu chứng bệnh nhân.
Rule-based weighted keyword scoring với cơ sở tri thức lâm sàng tiếng Việt.
- Nhóm CỜ ĐỎ (nhồi máu cơ tim, đột quỵ, phản vệ, viêm màng não, ra máu khi mang thai,
  sốt xuất huyết có chảy máu, suy hô hấp, tụt huyết áp) được đánh giá trước và luôn xếp đầu.
- Đọc chỉ số sinh hiệu từ văn bản / trường vital_signs: HA ≥ 140/90 mới là tăng huyết áp,
  HA tâm thu < 90 là hạ huyết áp, nhiệt độ ≥ 38.0 °C mới là sốt, SpO2 < 94% bất thường, < 90% nguy kịch.
Tuân thủ NFR-8: Disclaimer y tế bắt buộc và hỗ trợ quyết định lâm sàng.
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from models.clinical import (
    DiagnosisSuggestionItem,
    DiagnosisSuggestionResponse,
    MEDICAL_AI_DISCLAIMER,
)
from services.text_normalizer import contains_any, matched_phrases, normalize_text


# ============================================================================
# CƠ SỞ TRI THỨC CHẨN ĐOÁN LÂM SÀNG ICD-10 (10 NHÓM BỆNH LÝ)
# ============================================================================
DIAGNOSIS_KNOWLEDGE_BASE: List[Dict[str, Any]] = [
    # 1. TIM MẠCH (Cardiovascular)
    {
        "group": "Tim mạch",
        "keywords": ["đau ngực", "tức ngực", "khó thở", "huyết áp", "hoa mắt",
                     "chóng mặt", "hồi hộp", "đánh trống ngực", "phù chân",
                     "mệt khi gắng sức", "đau thắt ngực", "tim đập nhanh"],
        "suggestions": [
            {
                "code": "I10",
                "name": "Tăng huyết áp vô căn (nguyên phát)",
                "base_confidence": 94,
                "reason": "Triệu chứng đau tức ngực, chóng mặt, hoa mắt phù hợp với biến thiên huyết áp cao. Cần đo HA liên tục và đánh giá tổn thương cơ quan đích.",
            },
            {
                "code": "I20.9",
                "name": "Cơn đau thắt ngực, không đặc hiệu",
                "base_confidence": 85,
                "reason": "Cảm giác đau thắt, tức nặng vùng ngực trái cần theo dõi điện tim (ECG 12 chuyển đạo) và xét nghiệm men tim Troponin-I/T.",
            },
            {
                "code": "I25.1",
                "name": "Bệnh tim thiếu máu cục bộ xơ vữa động mạch",
                "base_confidence": 78,
                "reason": "Nguy cơ bệnh mạch vành mạn tính cần đánh giá yếu tố nguy cơ tim mạch (tuổi, hút thuốc, đái tháo đường, rối loạn lipid máu).",
            },
        ],
    },
    # 2. HÔ HẤP (Respiratory)
    {
        "group": "Hô hấp",
        "keywords": ["ho", "sốt", "đờm", "rát họng", "viêm họng", "khàn tiếng",
                     "sổ mũi", "nghẹt mũi", "hắt hơi", "khó thở", "thở khò khè",
                     "đau ngực khi ho", "ho khan", "ho có đờm"],
        "suggestions": [
            {
                "code": "J00",
                "name": "Viêm mũi họng cấp (Cảm lạnh thông thường)",
                "base_confidence": 96,
                "reason": "Hội chứng viêm long đường hô hấp trên cấp tính: sổ mũi, hắt hơi, đau rát họng, sốt nhẹ. Thường do virus gây ra, tự khỏi trong 5-7 ngày.",
            },
            {
                "code": "J02.9",
                "name": "Viêm họng cấp, không đặc hiệu",
                "base_confidence": 88,
                "reason": "Đau rát họng tăng khi nuốt kèm sung huyết niêm mạc họng. Cần phân biệt viêm họng do vi khuẩn (liên cầu nhóm A) để chỉ định kháng sinh đúng.",
            },
            {
                "code": "J20.9",
                "name": "Viêm phế quản cấp, không đặc hiệu",
                "base_confidence": 82,
                "reason": "Ho khan chuyển sang ho đờm đục kèm sốt, ran phế quản khi nghe phổi. X-quang phổi loại trừ viêm phổi.",
            },
        ],
    },
    # 3. TIÊU HÓA (Gastrointestinal)
    {
        "group": "Tiêu hóa",
        "keywords": ["đau bụng", "dạ dày", "ợ chua", "buồn nôn", "thượng vị",
                     "tiêu chảy", "táo bón", "ợ nóng", "chướng bụng", "đầy hơi",
                     "nôn", "trào ngược", "đau vùng bụng", "khó tiêu"],
        "suggestions": [
            {
                "code": "K29.7",
                "name": "Viêm dạ dày, không đặc hiệu",
                "base_confidence": 95,
                "reason": "Đau quặn vùng thượng vị, ợ hơi ợ chua sau bữa ăn. Cần nội soi dạ dày tá tràng và test H.pylori nếu tái phát nhiều lần.",
            },
            {
                "code": "K21.9",
                "name": "Bệnh trào ngược dạ dày - thực quản (GERD)",
                "base_confidence": 89,
                "reason": "Ợ nóng rát sau xương ức, đắng miệng, khàn giọng buổi sáng. Đáp ứng tốt với thuốc ức chế bơm proton (PPI).",
            },
            {
                "code": "K58.9",
                "name": "Hội chứng ruột kích thích (IBS)",
                "base_confidence": 76,
                "reason": "Rối loạn tiêu hóa mạn tính: đau bụng quặn giảm sau đi ngoài, phân lỏng xen kẽ táo bón, liên quan stress tâm lý.",
            },
        ],
    },
    # 4. NỘI TIẾT – CHUYỂN HÓA (Endocrine / Metabolic)
    {
        "group": "Nội tiết – Chuyển hóa",
        "keywords": ["đái tháo đường", "tiểu đường", "khát nước", "sụt cân",
                     "tiểu nhiều", "mệt mỏi", "tăng cân", "đường huyết",
                     "tuyến giáp", "run tay", "ra mồ hôi nhiều", "béo phì"],
        "suggestions": [
            {
                "code": "E11.9",
                "name": "Đái tháo đường typ 2 không có biến chứng",
                "base_confidence": 93,
                "reason": "Bộ ba triệu chứng kinh điển: ăn nhiều, uống nhiều, tiểu nhiều (3 Poly) kèm sụt cân không rõ nguyên nhân. Cần xét nghiệm HbA1c và đường huyết lúc đói.",
            },
            {
                "code": "E05.9",
                "name": "Cường giáp (Thyrotoxicosis), không đặc hiệu",
                "base_confidence": 80,
                "reason": "Sụt cân nhanh mặc dù ăn nhiều, run tay, tim đập nhanh, ra mồ hôi nhiều. Cần đo TSH, FT3, FT4.",
            },
            {
                "code": "E14.9",
                "name": "Đái tháo đường không đặc hiệu",
                "base_confidence": 84,
                "reason": "Triệu chứng mệt mỏi dai dẳng, vết thương chậm lành, thị lực giảm. Cần sàng lọc glucose máu.",
            },
        ],
    },
    # 5. CƠ XƯƠNG KHỚP (Musculoskeletal)
    {
        "group": "Cơ xương khớp",
        "keywords": ["vai gáy", "cột sống", "đau lưng", "thoái hóa", "tê bì",
                     "đau khớp", "sưng khớp", "cứng khớp", "đau cơ", "đau vai",
                     "đau cổ", "thoát vị đĩa đệm", "đau gối"],
        "suggestions": [
            {
                "code": "M54.2",
                "name": "Đau cổ gáy (Cervicalgia)",
                "base_confidence": 92,
                "reason": "Co cứng cơ cạnh cột sống cổ, đau mỏi vai gáy lan lên đầu. Thường liên quan tư thế làm việc sai và thoái hóa đốt sống cổ.",
            },
            {
                "code": "M47.8",
                "name": "Thoái hóa cột sống khác",
                "base_confidence": 86,
                "reason": "Đau âm ỉ cột sống tăng khi vận động, giai đoạn đầu đáp ứng nghỉ ngơi. X-quang có thể thấy gai xương, hẹp khe khớp.",
            },
            {
                "code": "M54.5",
                "name": "Đau thắt lưng (Low back pain)",
                "base_confidence": 80,
                "reason": "Hạn chế tầm vận động thắt lưng, đau tăng khi cúi/nâng vật nặng. Cần phân biệt với thoát vị đĩa đệm bằng MRI nếu có dấu hiệu chèn ép rễ thần kinh.",
            },
        ],
    },
    # 6. THẦN KINH (Neurology)
    {
        "group": "Thần kinh",
        "keywords": ["đau đầu", "chóng mặt", "mất ngủ", "hoa mắt", "co giật",
                     "tê tay", "tê chân", "yếu liệt", "run", "mất thăng bằng",
                     "nhức đầu", "đau nửa đầu", "giảm trí nhớ"],
        "suggestions": [
            {
                "code": "G43.9",
                "name": "Đau nửa đầu (Migraine), không đặc hiệu",
                "base_confidence": 91,
                "reason": "Đau nửa đầu từng cơn theo nhịp mạch đập, buồn nôn, sợ ánh sáng/tiếng ồn (photophobia/phonophobia). Tiền triệu aura có thể xuất hiện.",
            },
            {
                "code": "G47.0",
                "name": "Rối loạn khởi phát và duy trì giấc ngủ (Mất ngủ)",
                "base_confidence": 85,
                "reason": "Khó vào giấc, ngủ không sâu, thức giấc sớm, mệt mỏi ban ngày. Cần đánh giá yếu tố tâm lý và vệ sinh giấc ngủ.",
            },
            {
                "code": "R51",
                "name": "Đau đầu, không đặc hiệu",
                "base_confidence": 79,
                "reason": "Đau đầu cần phân biệt nguyên phát (căng cơ, migraine) và thứ phát (tăng huyết áp, u não, viêm màng não). Cần CT/MRI sọ nếu có dấu hiệu cờ đỏ.",
            },
        ],
    },
    # 7. TIẾT NIỆU (Urology)
    {
        "group": "Tiết niệu",
        "keywords": ["tiểu buốt", "tiểu rắt", "đau hông lưng", "nước tiểu đục",
                     "tiểu máu", "tiểu khó", "tiểu đêm", "sỏi thận",
                     "đau vùng bàng quang", "tiểu gấp"],
        "suggestions": [
            {
                "code": "N39.0",
                "name": "Nhiễm khuẩn đường tiết niệu, vị trí không xác định",
                "base_confidence": 93,
                "reason": "Tiểu buốt, tiểu rắt, nước tiểu đục mùi hôi. Cần tổng phân tích nước tiểu (UA) và cấy nước tiểu nếu tái phát.",
            },
            {
                "code": "N20.0",
                "name": "Sỏi thận",
                "base_confidence": 87,
                "reason": "Cơn đau quặn thắt lưng/mạn sườn lan xuống bẹn, buồn nôn, tiểu máu vi thể. Siêu âm hoặc CT scan hệ tiết niệu xác định.",
            },
            {
                "code": "N30.0",
                "name": "Viêm bàng quang cấp",
                "base_confidence": 82,
                "reason": "Tiểu gấp, tiểu nhiều lần, đau vùng hạ vị, nước tiểu đục. Thường gặp ở nữ giới.",
            },
        ],
    },
    # 8. DA LIỄU (Dermatology)
    {
        "group": "Da liễu",
        "dept_id": 8,
        "keywords": ["dị ứng, nổi mẩn da", "dị ứng, nổi mần da", "nổi mẩn da", "nổi mần da",
                     "nổi mẩn", "nổi mần", "dị ứng", "mẩn ngứa", "mần ngứa", "mẩn đỏ",
                     "phát ban", "ngứa", "mề đay", "mày đay", "chàm", "nấm da", "mụn",
                     "vảy nến", "rụng tóc", "da khô", "sẩn ngứa", "nổi mề đay", "dị ứng da",
                     "dị ứng thức ăn", "dị ứng thời tiết", "dị ứng hải sản", "viêm da dị ứng",
                     "viêm da cơ địa", "viêm da"],
        "suggestions": [
            {
                "code": "L50.9",
                "name": "Mề đay (Urticaria), không đặc hiệu",
                "base_confidence": 95,
                "reason": "Phát ban sẩn phù ngứa dữ dội, nổi mẩn/mần mảng đỏ sau dị ứng thời tiết hoặc thức ăn. Chỉ định kháng histamine H1 thế hệ 2.",
            },
            {
                "code": "L27.2",
                "name": "Viêm da do ăn phải thức ăn (Dị ứng thức ăn)",
                "base_confidence": 90,
                "reason": "Phát ban sẩn ngứa nổi mẩn đỏ trên da sau khi ăn hải sản, đồ lạ. Cần loại trừ sốc phản vệ và dùng thuốc chống dị ứng.",
            },
            {
                "code": "L30.9",
                "name": "Viêm da (Dermatitis), không đặc hiệu",
                "base_confidence": 86,
                "reason": "Vùng da đỏ, nổi mẩn ngứa, bong vảy. Phân biệt viêm da cơ địa, viêm da tiếp xúc và viêm da dị ứng.",
            },
            {
                "code": "B35.9",
                "name": "Bệnh nấm da (Dermatophytosis), không đặc hiệu",
                "base_confidence": 78,
                "reason": "Vùng da đỏ hình tròn viền rõ, bong vảy, ngứa vừa. Cần soi nấm KOH trực tiếp xác định.",
            },
        ],
    },
    # 9. MẮT – TAI MŨI HỌNG (Ophthalmology / ENT)
    {
        "group": "Mắt – Tai Mũi Họng",
        "keywords": ["đau mắt", "mờ mắt", "ù tai", "đau tai", "chảy mủ tai",
                     "viêm tai", "nghẹt tai", "giảm thị lực", "chảy nước mắt",
                     "viêm xoang", "đau xoang", "chảy mũi"],
        "suggestions": [
            {
                "code": "J01.9",
                "name": "Viêm xoang cấp, không đặc hiệu",
                "base_confidence": 92,
                "reason": "Đau nhức vùng xoang (trán, gò má), nghẹt mũi, chảy dịch mũi đục, sốt nhẹ. X-quang hoặc CT xoang xác nhận.",
            },
            {
                "code": "H66.9",
                "name": "Viêm tai giữa, không đặc hiệu",
                "base_confidence": 85,
                "reason": "Đau tai nhức nhối, ù tai, giảm thính lực, có thể chảy mủ tai. Nội soi tai xác nhận màng nhĩ sưng đỏ.",
            },
            {
                "code": "H10.9",
                "name": "Viêm kết mạc (Đau mắt đỏ), không đặc hiệu",
                "base_confidence": 80,
                "reason": "Đỏ mắt, chảy nước mắt, tiết dịch, cộm rát. Cần phân biệt nguyên nhân vi khuẩn, virus, dị ứng.",
            },
        ],
    },
    # 10. TRUYỀN NHIỄM (Infectious Disease)
    {
        "group": "Truyền nhiễm",
        "keywords": ["sốt cao", "ớn lạnh", "sốt rét", "tiêu chảy cấp",
                     "nôn ói", "mệt mỏi", "đau nhức toàn thân", "phát ban sốt",
                     "sốt xuất huyết", "dengue", "sốt kéo dài"],
        "suggestions": [
            {
                "code": "A09",
                "name": "Viêm dạ dày ruột và viêm đại tràng do nhiễm khuẩn",
                "base_confidence": 93,
                "reason": "Sốt, tiêu chảy cấp nhiều lần, nôn ói, đau bụng quanh rốn. Cần bù dịch điện giải và cấy phân nếu kéo dài.",
            },
            {
                "code": "A90",
                "name": "Sốt Dengue (Sốt xuất huyết)",
                "base_confidence": 88,
                "reason": "Sốt cao đột ngột, đau nhức hốc mắt/cơ khớp toàn thân, phát ban dạng chấm xuất huyết dưới da. Cần xét nghiệm NS1 Ag và công thức máu theo dõi tiểu cầu.",
            },
            {
                "code": "B34.9",
                "name": "Nhiễm virus, không đặc hiệu",
                "base_confidence": 80,
                "reason": "Sốt nhẹ đến vừa, mệt mỏi toàn thân, đau cơ khớp lan tỏa. Thường tự giới hạn trong 5-7 ngày, điều trị triệu chứng.",
            },
        ],
    },
]

# Gợi ý mặc định khi không khớp nhóm nào
DEFAULT_SUGGESTIONS: List[Dict[str, Any]] = [
    {
        "code": "R69",
        "name": "Nguyên nhân gây bệnh chưa xác định",
        "base_confidence": 70,
        "reason": "Triệu chứng chưa đủ đặc hiệu để gợi ý chẩn đoán cụ thể. Cần khai thác thêm bệnh sử chi tiết và chỉ định cận lâm sàng để chẩn đoán phân biệt.",
    },
    {
        "code": "Z00.0",
        "name": "Khám sức khỏe tổng quát định kỳ",
        "base_confidence": 65,
        "reason": "Tầm soát đánh giá chức năng các cơ quan: công thức máu, sinh hóa máu, tổng phân tích nước tiểu, X-quang phổi, điện tim.",
    },
]


# ============================================================================
# DẤU HIỆU CỜ ĐỎ (RED FLAGS) – đánh giá TRƯỚC các nhóm bệnh thông thường
# ============================================================================
CHEST_PAIN_TERMS = ["đau ngực", "tức ngực", "đau thắt ngực", "đau tức ngực", "nặng ngực"]
ACS_FEATURE_TERMS = ["dữ dội", "lan tay", "lan ra tay", "lan xuống tay", "lan lên hàm",
                     "lan ra sau lưng", "vã mồ hôi", "toát mồ hôi"]
STROKE_TERMS = ["đột quỵ", "tai biến mạch máu não", "méo miệng", "méo mồm", "yếu nửa người",
                "liệt nửa người", "tê nửa người", "nói khó", "nói ngọng"]
ANGIOEDEMA_TERMS = ["phù môi", "sưng môi", "phù họng", "phù lưỡi", "sưng lưỡi", "phù thanh quản"]
DRUG_TRIGGER_TERMS = ["sau tiêm", "sau khi tiêm", "sau uống thuốc", "sau khi uống thuốc",
                      "sau dùng thuốc", "sau khi dùng thuốc", "sau truyền", "dị ứng thuốc"]
HEADACHE_TERMS = ["đau đầu", "nhức đầu"]
PREGNANCY_TERMS = ["mang thai", "có thai", "có bầu", "mang bầu", "thai phụ", "thai"]
PREGNANCY_BLEEDING_TERMS = ["ra máu", "ra huyết", "chảy máu âm đạo", "xuất huyết âm đạo", "rong huyết"]
DENGUE_TERMS = ["sốt xuất huyết", "dengue", "sxh"]
DENGUE_BLEEDING_TERMS = ["chảy máu chân răng", "chảy máu cam", "chảy máu mũi", "chấm xuất huyết",
                         "xuất huyết dưới da", "nôn ra máu", "ói ra máu", "phân đen", "đi ngoài ra máu",
                         "tiểu ra máu", "rong kinh", "xuất huyết niêm mạc", "chảy máu"]
FEVER_TERMS = ["sốt"]
HYPERTENSION_TERMS = ["tăng huyết áp", "huyết áp cao", "cao huyết áp"]
HYPOTENSION_TERMS = ["huyết áp thấp", "tụt huyết áp", "hạ huyết áp", "tụt áp"]
DIABETES_TERMS = ["đái tháo đường", "tiểu đường", "khát nước", "tiểu nhiều", "đường huyết"]

# Bỏ từ "sốt" khỏi văn bản chấm điểm khi nhiệt độ đo được < 38 °C
# (giữ nguyên tên bệnh "sốt xuất huyết", "sốt rét")
_FEVER_WORD_RE = re.compile(
    r"(?<!\w)s[ốôo]t(?:\s+(?:cao|nhẹ|nhe|kéo dài|keo dai|nóng|nong))?(?!\w)"
    r"(?!\s+(?:xuất|xuat|rét|ret))"
)

FEVER_THRESHOLD_C = 38.0
SPO2_ABNORMAL = 94
SPO2_CRITICAL = 90
HTN_SYSTOLIC, HTN_DIASTOLIC = 140, 90
HYPOTENSION_SYSTOLIC = 90


def _red_flag(code: str, name: str, confidence: float, reason: str) -> Dict[str, Any]:
    return {"code": code, "name": name, "base_confidence": confidence,
            "reason": f"⚠️ CỜ ĐỎ – cần xử trí cấp cứu / loại trừ ngay: {reason}"}


# ============================================================================
# ĐỌC CHỈ SỐ SINH HIỆU TỪ VĂN BẢN
# ============================================================================
# Không bắt số thập phân ("37.5/…") hay ngày tháng đầy đủ ("15/10/2024"); dấu phẩy câu sau số vẫn hợp lệ
_BP_RE = re.compile(r"(?<![\d/])(?<!\d[.,])(\d{2,3})\s*/\s*(\d{2,3})(?!\d)(?![.,]\d)(?!\s*/)")
_TEMP_RES = [
    re.compile(r"(?<![\d/])(?<!\d[.,])(\d{2}(?:[.,]\d{1,2})?)\s*(?:°\s*c?|℃|độ\s*c(?!\w)|độ|do\s*c(?!\w)|oc(?!\w))"),
    re.compile(r"(?:nhiệt độ|nhiet do|thân nhiệt|than nhiet|sốt|sot|t°|temp)\s*[:=]?\s*"
               r"(\d{2}(?:[.,]\d{1,2})?)(?![\d/])"),
]
_SPO2_RE = re.compile(r"(?:spo2|sp02|spo₂|sao2|bão hòa oxy|bao hoa oxy)\s*(?:máu|mau)?\s*[:=]?\s*(\d{2,3})\s*%?")


@dataclass
class VitalReadings:
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    temperature: Optional[float] = None
    spo2: Optional[int] = None


def parse_vitals_from_text(text: str) -> VitalReadings:
    """Đọc huyết áp (vd 160/95), nhiệt độ (vd 38.5 độ, sốt 39), SpO2 (vd SpO2 92%) từ văn bản đã chuẩn hóa."""
    v = VitalReadings()
    for m in _BP_RE.finditer(text):
        sys_bp, dia_bp = int(m.group(1)), int(m.group(2))
        # Loại các chuỗi không phải huyết áp (ngày tháng "12/05", phân số…)
        if 40 <= sys_bp <= 300 and 20 <= dia_bp <= 200 and sys_bp > dia_bp:
            v.systolic, v.diastolic = sys_bp, dia_bp
            break
    temps = []
    for pattern in _TEMP_RES:
        for m in pattern.finditer(text):
            value = float(m.group(1).replace(",", "."))
            if 34.0 <= value <= 43.5:
                temps.append(value)
    if temps:
        v.temperature = max(temps)
    m = _SPO2_RE.search(text)
    if m and 50 <= int(m.group(1)) <= 100:
        v.spo2 = int(m.group(1))
    return v


def _merge_vitals(text_vitals: VitalReadings, vital_signs: Any) -> VitalReadings:
    """Chỉ số có cấu trúc trong request (nếu có) được ưu tiên hơn giá trị đọc từ văn bản."""
    if vital_signs is None:
        return text_vitals

    def pick(attr: str, fallback):
        value = getattr(vital_signs, attr, None)
        return value if value is not None else fallback

    return VitalReadings(
        systolic=pick("blood_pressure_systolic", text_vitals.systolic),
        diastolic=pick("blood_pressure_diastolic", text_vitals.diastolic),
        temperature=pick("temperature", text_vitals.temperature),
        spo2=pick("spo2", text_vitals.spo2),
    )


class DiagnosisSuggestionService:
    """
    Dịch vụ AI gợi ý chẩn đoán ICD-10 dựa trên triệu chứng (FR-11.3).
    Sử dụng rule-based weighted keyword scoring + nhóm cờ đỏ + chỉ số sinh hiệu.
    """

    @staticmethod
    def _detect_red_flags(text: str, vitals: VitalReadings, has_fever: bool,
                          patient_gender: Optional[str]) -> List[Dict[str, Any]]:
        flags: List[Dict[str, Any]] = []
        has_chest_pain = contains_any(text, CHEST_PAIN_TERMS)

        if contains_any(text, ["nhồi máu cơ tim"]) or (has_chest_pain and contains_any(text, ACS_FEATURE_TERMS)):
            flags.append(_red_flag(
                "I21.9", "Nhồi máu cơ tim cấp, không đặc hiệu", 97,
                "Đau ngực dữ dội / lan tay – hàm / vã mồ hôi gợi ý hội chứng vành cấp. Làm ngay ECG 12 chuyển đạo, "
                "Troponin hs, cho Aspirin nếu không chống chỉ định và chuyển can thiệp mạch vành."))

        if contains_any(text, STROKE_TERMS):
            flags.append(_red_flag(
                "I64", "Đột quỵ, không xác định do xuất huyết hay nhồi máu", 97,
                "Dấu hiệu thần kinh khu trú cấp (méo miệng, yếu/liệt nửa người, nói khó). Đánh giá FAST, "
                "ghi nhận thời điểm khởi phát, chụp CT sọ não khẩn để quyết định tiêu sợi huyết."))

        if (contains_any(text, ["phản vệ"]) or contains_any(text, ANGIOEDEMA_TERMS)
                or (contains_any(text, ["khó thở", "phù mặt"]) and contains_any(text, DRUG_TRIGGER_TERMS))):
            flags.append(_red_flag(
                "T78.2", "Sốc phản vệ, không đặc hiệu", 97,
                "Phù môi/họng/lưỡi hoặc khó thở sau dùng thuốc – nguy cơ phản vệ tắc nghẽn đường thở. "
                "Ngừng ngay thuốc nghi ngờ, tiêm bắp Adrenalin theo phác đồ phản vệ của Bộ Y tế."))

        if contains_any(text, ["cứng gáy"]) and has_fever and contains_any(text, HEADACHE_TERMS):
            flags.append(_red_flag(
                "G03.9", "Viêm màng não, không đặc hiệu", 95,
                "Tam chứng đau đầu – sốt – cứng gáy. Cấy máu, chọc dịch não tủy (sau CT nếu có dấu hiệu "
                "thần kinh khu trú) và dùng kháng sinh theo kinh nghiệm sớm."))

        is_male = (patient_gender or "").strip().upper() == "MALE"
        if not is_male and contains_any(text, PREGNANCY_TERMS) and contains_any(text, PREGNANCY_BLEEDING_TERMS):
            flags.append(_red_flag(
                "O20.9", "Xuất huyết trong giai đoạn sớm của thai kỳ, không đặc hiệu", 95,
                "Ra máu khi mang thai – cần loại trừ dọa sẩy thai, thai ngoài tử cung vỡ, rau tiền đạo "
                "(thai > 20 tuần cân nhắc O46.9). Siêu âm, định lượng β-hCG, chuyển Sản khoa ngay."))

        if contains_any(text, DENGUE_TERMS) and contains_any(text, DENGUE_BLEEDING_TERMS):
            flags.append(_red_flag(
                "A91", "Sốt xuất huyết Dengue", 96,
                "Sốt xuất huyết kèm dấu hiệu chảy máu (chân răng, cam, dưới da, tiêu hóa) – dấu hiệu cảnh báo "
                "Dengue nặng. Theo dõi Hct, tiểu cầu, dấu hiệu sốc; nhập viện theo hướng dẫn Bộ Y tế."))

        if vitals.spo2 is not None and vitals.spo2 < SPO2_CRITICAL:
            flags.append(_red_flag(
                "J96.0", "Suy hô hấp cấp", 96,
                f"SpO2 {vitals.spo2}% (< {SPO2_CRITICAL}%) – thiếu oxy máu nặng. Thở oxy ngay, khí máu động mạch, "
                "tìm nguyên nhân (viêm phổi, hen, COPD, phù phổi, thuyên tắc phổi)."))

        is_hypotensive = (vitals.systolic is not None and vitals.systolic < HYPOTENSION_SYSTOLIC) or (
            vitals.systolic is None and contains_any(text, HYPOTENSION_TERMS))
        if is_hypotensive:
            bp = f"{vitals.systolic}/{vitals.diastolic} mmHg" if vitals.systolic is not None else "tụt huyết áp"
            flags.append(_red_flag(
                "I95.9", "Hạ huyết áp, không đặc hiệu", 93,
                f"Huyết áp {bp} (tâm thu < {HYPOTENSION_SYSTOLIC} mmHg). Đánh giá dấu hiệu sốc (mạch, tri giác, "
                "nước tiểu, chi lạnh), tìm nguyên nhân mất dịch / nhiễm khuẩn / tim / phản vệ."))

        flags.sort(key=lambda f: f["base_confidence"], reverse=True)
        return flags

    @staticmethod
    def suggest_diagnosis(
        symptoms: str,
        patient_age: int | None = None,
        patient_gender: str | None = None,
        medical_history: list[str] | None = None,
        vital_signs: Any = None,
    ) -> DiagnosisSuggestionResponse:
        """
        Phân tích triệu chứng văn bản và trả về Top 3 gợi ý ICD-10:
        cờ đỏ (nếu có) luôn đứng đầu, sau đó các gợi ý theo nhóm bệnh sắp xếp theo confidence giảm dần.
        """
        if not symptoms or len(symptoms.strip()) < 2:
            return DiagnosisSuggestionResponse(
                suggestions=[],
                total_suggestions=0,
                confidence_score=0.0,
                disclaimer=MEDICAL_AI_DISCLAIMER,
            )

        symptoms_lower = normalize_text(symptoms)
        history_text = normalize_text(" ".join(medical_history or []))

        # --- Chỉ số sinh hiệu (văn bản + trường có cấu trúc) ---
        vitals = _merge_vitals(parse_vitals_from_text(symptoms_lower), vital_signs)
        if vitals.temperature is not None:
            has_fever = vitals.temperature >= FEVER_THRESHOLD_C
        else:
            has_fever = contains_any(symptoms_lower, FEVER_TERMS)
        bp_measured = vitals.systolic is not None and vitals.diastolic is not None
        bp_high = bp_measured and (vitals.systolic >= HTN_SYSTOLIC or vitals.diastolic >= HTN_DIASTOLIC)
        bp_not_high = bp_measured and not bp_high
        htn_by_text = contains_any(symptoms_lower, HYPERTENSION_TERMS) or contains_any(history_text, HYPERTENSION_TERMS)
        hypotension_by_text = contains_any(symptoms_lower, HYPOTENSION_TERMS)

        # Văn bản dùng để chấm điểm nhóm bệnh: nhiệt độ đo được quyết định có sốt hay không
        scoring_text = symptoms_lower
        if vitals.temperature is not None and not has_fever:
            scoring_text = re.sub(r"\s+", " ", _FEVER_WORD_RE.sub(" ", scoring_text)).strip()
        elif has_fever and not contains_any(scoring_text, FEVER_TERMS):
            scoring_text += " sốt cao" if vitals.temperature and vitals.temperature >= 39.0 else " sốt"

        red_flags = DiagnosisSuggestionService._detect_red_flags(
            symptoms_lower, vitals, has_fever, patient_gender)

        # Gợi ý từ chỉ số sinh hiệu bất thường (không phải cờ đỏ)
        vital_items: List[Dict[str, Any]] = []
        if bp_high:
            vital_items.append({
                "code": "I10", "name": "Tăng huyết áp vô căn (nguyên phát)", "base_confidence": 92,
                "reason": f"Huyết áp đo được {vitals.systolic}/{vitals.diastolic} mmHg (≥ {HTN_SYSTOLIC}/{HTN_DIASTOLIC}). "
                          "Cần đo lại nhiều lần / theo dõi HA tại nhà để khẳng định và đánh giá tổn thương cơ quan đích.",
            })
        if vitals.spo2 is not None and SPO2_CRITICAL <= vitals.spo2 < SPO2_ABNORMAL:
            # WHO ICD-10 (Bộ Y tế): R09.0 là "Ngạt" nên dùng R09.8 cho giảm bão hòa oxy chưa suy hô hấp
            vital_items.append({
                "code": "R09.8", "name": "Giảm độ bão hòa oxy máu (SpO2 thấp)", "base_confidence": 88,
                "reason": f"SpO2 {vitals.spo2}% (< {SPO2_ABNORMAL}%). Đánh giá lại SpO2, nhịp thở, khí máu; "
                          "tìm nguyên nhân hô hấp / tim mạch.",
            })

        # Dự đoán gợi ý chuyên khoa từ ML Model để định hướng nhóm chẩn đoán
        ml_dept_id = None
        try:
            from services.ml_triage_service import predict_department
            ml_pred = predict_department(symptoms_lower)
            if ml_pred is not None:
                ml_dept_id = ml_pred[0]
        except Exception:
            ml_dept_id = None

        # Tính điểm cho từng nhóm bệnh lý (khớp NGUYÊN TỪ: "ho" không khớp "cho", "run" không khớp "trung")
        scored_groups: list[tuple[float, dict, int]] = []

        for group in DIAGNOSIS_KNOWLEDGE_BASE:
            matched = matched_phrases(scoring_text, group["keywords"])
            match_count = len(matched)
            matched_len = sum(len(k) for k in matched)

            if match_count > 0 or (ml_dept_id is not None and group.get("dept_id") == ml_dept_id):
                # Điểm số kết hợp số từ khóa khớp và ưu tiên từ mô hình ML
                score = match_count * 10.0 + (matched_len / 10.0)
                if ml_dept_id is not None and group.get("dept_id") == ml_dept_id:
                    score += 25.0
                scored_groups.append((score, group, match_count))

        group_items: List[Dict[str, Any]] = []
        if scored_groups:
            # Sắp xếp theo score giảm dần, lấy nhóm cao nhất
            scored_groups.sort(key=lambda x: x[0], reverse=True)
            _, best_group, match_count = scored_groups[0]

            # Tính adjustment cho confidence dựa trên mức khớp
            match_ratio = match_count / max(1, len(best_group["keywords"]))

            for sug in best_group["suggestions"][:3]:
                # Điều chỉnh confidence: giữ base nếu match nhiều, giảm nhẹ nếu match ít
                adjusted_confidence = sug["base_confidence"]
                if match_ratio < 0.3:
                    adjusted_confidence = max(60, adjusted_confidence - 10)
                elif match_ratio >= 0.5:
                    adjusted_confidence = min(99, adjusted_confidence + 2)
                group_items.append({**sug, "base_confidence": adjusted_confidence})

            # Nếu có nhóm thứ 2 match tốt, thêm gợi ý phụ (để bác sĩ phân biệt)
            if len(scored_groups) >= 2 and len(group_items) < 3:
                _, second_group, _ = scored_groups[1]
                extra = second_group["suggestions"][0]
                group_items.append({
                    **extra,
                    "base_confidence": max(60, extra["base_confidence"] - 15),
                    "reason": f"[Phân biệt - nhóm {second_group['group']}] {extra['reason']}",
                })

        # --- Chốt chặn lâm sàng trên gợi ý thường ---
        adjusted_items: List[Dict[str, Any]] = []
        for item in group_items + vital_items:
            code = item["code"]
            if code == "I10":
                if bp_not_high or hypotension_by_text or any(f["code"] == "I95.9" for f in red_flags):
                    continue  # HA đo được không cao (vd 90/60, 80/50) -> không gợi ý Tăng huyết áp
                if not (bp_high or htn_by_text):
                    # Chưa có bằng chứng tăng huyết áp -> hạ mức ưu tiên I10
                    item = {**item, "base_confidence": max(60, item["base_confidence"] - 20),
                            "reason": item["reason"] + " (Chưa có trị số huyết áp ≥ 140/90 – cần đo HA để xác nhận.)"}
            if code == "E11.9" and patient_age is not None and patient_age < 18:
                # Trẻ em / vị thành niên: đái tháo đường typ 1 thường gặp hơn typ 2
                item = {
                    **item, "code": "E10.9", "name": "Đái tháo đường typ 1 không có biến chứng",
                    "reason": "Bệnh nhân < 18 tuổi có triệu chứng uống nhiều, tiểu nhiều, sụt cân: nghĩ nhiều đái tháo "
                              "đường typ 1. Xét nghiệm đường huyết, HbA1c, ceton máu/niệu để loại trừ nhiễm toan ceton.",
                }
            adjusted_items.append(item)

        if not red_flags and not adjusted_items:
            # Không khớp nhóm nào → trả về gợi ý mặc định
            default_items = [
                DiagnosisSuggestionItem(
                    code=s["code"],
                    name=s["name"],
                    confidence=s["base_confidence"],
                    reason=s["reason"],
                )
                for s in DEFAULT_SUGGESTIONS
            ]
            return DiagnosisSuggestionResponse(
                suggestions=default_items,
                total_suggestions=len(default_items),
                confidence_score=0.70,
                disclaimer=MEDICAL_AI_DISCLAIMER,
            )

        # Gộp trùng mã (giữ confidence cao nhất), cờ đỏ luôn đứng trước
        merged: Dict[str, Dict[str, Any]] = {}
        for item in adjusted_items:
            prev = merged.get(item["code"])
            if prev is None or item["base_confidence"] > prev["base_confidence"]:
                merged[item["code"]] = item
        red_codes = {f["code"] for f in red_flags}
        others = [it for code, it in merged.items() if code not in red_codes]
        if red_flags:
            # Giữ thứ tự confidence giảm dần: gợi ý thường luôn thấp hơn cờ đỏ thấp nhất
            cap = min(f["base_confidence"] for f in red_flags) - 1
            others = [{**it, "base_confidence": min(it["base_confidence"], cap)} for it in others]
        others.sort(key=lambda it: it["base_confidence"], reverse=True)

        top3 = [
            DiagnosisSuggestionItem(
                code=it["code"],
                name=it["name"],
                confidence=round(it["base_confidence"], 1),
                reason=it["reason"],
            )
            for it in (red_flags + others)[:3]
        ]

        avg_confidence = sum(s.confidence for s in top3) / len(top3) / 100

        return DiagnosisSuggestionResponse(
            suggestions=top3,
            total_suggestions=len(top3),
            confidence_score=round(avg_confidence, 2),
            disclaimer=MEDICAL_AI_DISCLAIMER,
        )
