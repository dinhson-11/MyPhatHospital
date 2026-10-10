"""
AI Chatbot Service (FR-10 – Sprint 7):
- Intent classification: EMERGENCY / SYMPTOM_CHECK / BOOKING / FAQ / OUT_OF_SCOPE / GREETING
- Phát hiện dấu hiệu cấp cứu (cờ đỏ) TRƯỚC mọi bước khác → hướng dẫn gọi 115
- Gợi ý chuyên khoa theo triệu chứng (ML + rule-based)
- Trả lời FAQ về dịch vụ y tế (giờ khám, BHYT, thủ tục…)
- Xử lý câu hỏi vượt phạm vi
- Tuân thủ NFR-8: Disclaimer y tế bắt buộc

Mọi so khớp từ khóa dùng services.text_normalizer: chuẩn hóa NFC, khớp nguyên từ
(word-boundary) và chấp nhận người dùng gõ không dấu ("dot quy", "muon chet").
"""

import re
import uuid
from typing import Optional

from models.chat import ChatMessageResponse, DepartmentSuggestion

CHATBOT_DISCLAIMER = (
    "Trợ lý AI chỉ hỗ trợ tư vấn sơ bộ, không thay thế thăm khám và chỉ định của bác sĩ."
)

from services.ml_triage_service import predict_department
from services.hospital_catalog import (
    department_name, DEFAULT_DEPT_ID,
    HOURS_DAYS, HOURS_SUMMER, HOURS_WINTER, HOURS_BHYT, HOURS_EMERGENCY,
)
from services.text_normalizer import contains_any, exact, normalize_text, strip_accents

# ============================================================================
# DEPARTMENT ROUTING KNOWLEDGE BASE (Rule-based Fallback & Knowledge Base)
# ============================================================================
DEPT_ROUTING: list[dict] = [
    # Khoa Da liễu – Ưu tiên cao cho các tổn thương da, dị ứng, nổi mẩn, nổi mần
    {
        "dept_id": 14, "dept_name": department_name(14),
        "keywords": ["dị ứng, nổi mẩn da", "dị ứng, nổi mần da", "nổi mẩn da", "nổi mần da",
                     "nổi mẩn", "nổi mần", "dị ứng", "mẩn ngứa", "mần ngứa", "mẩn đỏ",
                     "ngứa", "phát ban", "mề đay", "mày đay", "dị ứng da", "nấm da",
                     "mụn", "vảy nến", "rụng tóc", "viêm da", "chàm", "dị ứng thời tiết",
                     "dị ứng thức ăn", "dị ứng hải sản", "viêm da cơ địa"],
        "reply": ("Triệu chứng trên da và dị ứng của bạn cần được bác sĩ **Khoa Da liễu** "
                  "thăm khám trực tiếp để xác định chẩn đoán và có phác đồ điều trị "
                  "phù hợp."),
    },
    {
        "dept_id": 10, "dept_name": department_name(10),
        "keywords": ["đau họng", "rát họng", "viêm họng", "khàn tiếng", "ngạt mũi", "chảy mũi",
                     "viêm xoang", "đau tai", "ù tai", "viêm amidan", "nghẹt mũi"],
        "reply": ("Triệu chứng tai mũi họng của bạn nên được nội soi kiểm tra tại **Khoa Tai Mũi Họng** "
                  "để xác định mức độ viêm nhiễm và điều trị dứt điểm."),
    },
    {
        "dept_id": 1, "dept_name": department_name(1),
        "keywords": ["đau ngực", "tức ngực", "đánh trống ngực", "hồi hộp",
                     "huyết áp", "tim đập nhanh", "loạn nhịp", "phù chân",
                     "mệt khi gắng sức", "khó thở khi nằm"],
        "reply": ("Dựa trên triệu chứng bạn mô tả, hệ thống gợi ý bạn nên "
                  "đến **Khoa Tim mạch** để được bác sĩ chuyên khoa thăm khám. "
                  "Bác sĩ sẽ chỉ định đo điện tim (ECG), siêu âm tim và các "
                  "xét nghiệm cần thiết để có chẩn đoán chính xác."),
    },
    {
        "dept_id": 1, "dept_name": department_name(1),
        "keywords": ["ho", "đờm", "khó thở", "thở khò khè", "viêm phổi",
                     "hen suyễn", "suyễn", "ho ra máu"],
        "reply": ("Triệu chứng liên quan đến đường hô hấp. Bạn nên đến "
                  "**Khoa Hô hấp** để bác sĩ thăm khám, nghe phổi và "
                  "chỉ định X-quang phổi hoặc spirometry nếu cần."),
    },
    {
        "dept_id": 1, "dept_name": department_name(1),
        "keywords": ["đau bụng", "đau dạ dày", "ợ chua", "ợ nóng", "buồn nôn",
                     "tiêu chảy", "táo bón", "xuất huyết tiêu hóa", "phân đen",
                     "đau thượng vị", "đầy hơi", "chướng bụng", "viêm dạ dày"],
        "reply": ("Triệu chứng của bạn liên quan đến đường tiêu hóa. "
                  "**Khoa Tiêu hóa** sẽ giúp bạn thăm khám và có thể chỉ định "
                  "nội soi dạ dày/đại tràng để xác định nguyên nhân chính xác."),
    },
    {
        "dept_id": 1, "dept_name": department_name(1),
        "keywords": ["trẻ em", "trẻ nhỏ", "bé sốt", "trẻ sốt", "bé quấy",
                     "trẻ quấy khóc", "quấy khóc trẻ", "sơ sinh", "bỏ bú",
                     "trẻ không chịu ăn", "biếng ăn", "suy dinh dưỡng", "tiêm chủng",
                     "tiêm vắc xin", "tiêm vacxin", "bé nhà tôi bị sốt", "bé bị sốt"],
        "reply": ("Bạn đang hỏi về sức khỏe trẻ em. **Khoa Nhi** của chúng tôi "
                  "có đội ngũ bác sĩ chuyên khoa nhi giàu kinh nghiệm, sẵn sàng "
                  "thăm khám và tư vấn cho bé."),
    },
    {
        "dept_id": 1, "dept_name": department_name(1),
        "keywords": ["mệt mỏi", "sốt", "đổ mồ hôi đêm", "sụt cân", "chán ăn",
                     "tiểu đường", "đái tháo đường", "khát nước nhiều", "tiểu nhiều",
                     "tăng huyết áp", "mỡ máu", "kiểm tra sức khỏe"],
        "reply": ("Với triệu chứng bạn mô tả, **Khoa Nội tổng quát** là lựa chọn "
                  "phù hợp để bác sĩ đánh giá tổng thể, chỉ định xét nghiệm máu, "
                  "đường huyết và các chỉ số sinh hóa cần thiết."),
    },
    {
        "dept_id": 1, "dept_name": department_name(1),
        "keywords": ["đau đầu", "nhức đầu", "chóng mặt", "mất thăng bằng",
                     "tê bì tay chân", "run tay", "co giật", "động kinh",
                     "mất ngủ", "đột quỵ", "liệt"],
        "reply": ("Triệu chứng của bạn cần được đánh giá bởi **Khoa Thần kinh**. "
                  "Bác sĩ sẽ khám lâm sàng thần kinh và có thể chỉ định CT/MRI sọ "
                  "não để loại trừ các nguyên nhân nghiêm trọng."),
    },
    {
        "dept_id": 13, "dept_name": department_name(13),
        "keywords": ["đau khớp", "sưng khớp", "viêm khớp", "đau lưng", "đau cổ",
                     "thoái hóa", "thoát vị đĩa đệm", "đau vai", "đau gối",
                     "cứng khớp buổi sáng"],
        "reply": ("Triệu chứng cơ xương khớp của bạn nên được thăm khám tại "
                  "**Khoa Cơ xương khớp**. Bác sĩ sẽ chỉ định X-quang, MRI và "
                  "đánh giá chức năng vận động để có hướng điều trị tốt nhất."),
    },
    {
        "dept_id": 3, "dept_name": department_name(3),
        "priority": True,  # Mô hình ML chưa có nhãn Sản - Phụ khoa nên luật từ khóa được ưu tiên
        "keywords": ["kinh nguyệt", "thai kỳ", "mang thai", "có thai", "có bầu", "mang bầu",
                     "bà bầu", "khám phụ khoa", "đau bụng kinh", "rối loạn kinh nguyệt",
                     "vô sinh", "siêu âm thai", "khám thai"],
        "reply": ("Với vấn đề bạn chia sẻ, **Khoa Sản phụ khoa** sẽ tư vấn và "
                  "thăm khám chuyên sâu, đảm bảo sức khỏe tối ưu cho bạn."),
    },
]

# Đồng bộ tên khoa in đậm trong câu trả lời với tên khoa thực tế của bệnh viện
for _dept in DEPT_ROUTING:
    _dept["reply"] = re.sub(r"\*\*Khoa [^*]+\*\*", f"**{_dept['dept_name']}**", _dept["reply"])

# ============================================================================
# FAQ KNOWLEDGE BASE
# ============================================================================
FAQ_KB: list[dict] = [
    {
        "keywords": ["bhyt", "bảo hiểm y tế", "bảo hiểm", "thẻ bhyt"],
        "reply": ("🏥 **Thông tin BHYT tại Mỹ Phát Hospital:**\n\n"
                  "• Tiếp nhận BHYT thông tuyến toàn quốc\n"
                  f"• {HOURS_BHYT} (trong giờ khám bệnh của bệnh viện)\n"
                  "• Mang CCCD gắn chip hoặc thẻ BHYT trên ứng dụng VssID\n"
                  "• Cấp cứu 24/7 không cần thủ tục trước"),
    },
    {
        "keywords": ["giờ khám", "giờ làm việc", "mấy giờ", "khám buổi", "lịch làm việc"],
        "reply": ("⏰ **Lịch khám bệnh Mỹ Phát Hospital:**\n\n"
                  f"• {HOURS_DAYS}\n"
                  f"• {HOURS_SUMMER}\n"
                  f"• {HOURS_WINTER}\n"
                  f"• {HOURS_BHYT}\n"
                  f"• {HOURS_EMERGENCY}\n"
                  "• Đăng ký đặt lịch trước để tránh chờ đợi"),
    },
    {
        # Không dùng từ đơn "giá" (dễ khớp nhầm "cảm giác", "gia đình" khi gõ không dấu)
        "keywords": ["chi phí", "giá khám", "giá dịch vụ", "bảng giá", "báo giá", "giá cả",
                     "giá bao nhiêu", "phí khám", "bao nhiêu tiền", "hết bao nhiêu", "phí dịch vụ"],
        "reply": ("💰 **Chi phí dịch vụ khám:**\n\n"
                  "• Khám BHYT đúng tuyến: theo quy định Nhà nước\n"
                  "• Khám dịch vụ: từ 150.000 – 350.000đ/lượt (tùy chuyên khoa)\n"
                  "• Xét nghiệm, siêu âm, X-quang: báo giá niêm yết công khai tại quầy\n"
                  "• Hỗ trợ thanh toán: Tiền mặt / Chuyển khoản / VietQR"),
    },
    {
        "keywords": ["đặt lịch", "đặt hẹn", "book", "lịch khám", "hẹn khám"],
        "reply": ("📅 **Đặt lịch khám trực tuyến:**\n\n"
                  "Bạn có thể đặt lịch khám ngay trên hệ thống bằng cách bấm "
                  "nút **\"Đặt lịch khám\"** ở góc trên màn hình. Chọn chuyên khoa, "
                  "bác sĩ và khung giờ phù hợp — nhận ngay phiếu khám điện tử có mã vạch!"),
        "show_booking": True,
    },
    {
        "keywords": ["địa chỉ", "ở đâu", "đường đến", "vị trí", "google map"],
        "reply": ("📍 **Địa chỉ Mỹ Phát Hospital:**\n\n"
                  "1170 Quang Trung, Thị Trấn Chũ, Huyện Lục Ngạn, Tỉnh Bắc Giang\n"
                  "📞 Hotline: 0789 065 493 (24/7)\n"
                  "🌐 Chỉ đường: https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6\n"
                  "⏰ Cấp cứu 24/7: 0789 065 493"),
    },
    {
        "keywords": ["xét nghiệm", "làm xét nghiệm", "lấy máu", "kết quả xét nghiệm"],
        "reply": ("🔬 **Dịch vụ Xét nghiệm:**\n\n"
                  "• Nhận kết quả trong ngày với xét nghiệm thông thường\n"
                  "• Xét nghiệm nhanh COVID-19, Dengue, D-Dimer trong 30 phút\n"
                  "• Không cần hẹn trước, chỉ cần đến quầy tiếp nhận\n"
                  "• Tra cứu kết quả online qua mã phiếu xét nghiệm"),
    },
]

# ============================================================================
# EMERGENCY (DẤU HIỆU CỜ ĐỎ) – kiểm tra TRƯỚC FAQ, ngoài phạm vi và luật ưu tiên Sản khoa
# ============================================================================
# Mỗi luật: "any" = khớp một cụm bất kỳ; "all" = MỖI danh sách con phải khớp ít nhất một cụm.
# exact(...) = chỉ khớp khi gõ đúng dấu (dạng không dấu bị nhập nhằng: "xiu" ~ "xíu", "tu tu" ~ "từ từ").
CHEST_PAIN_TERMS = ["đau ngực", "tức ngực", "đau thắt ngực", "đau tức ngực", "nặng ngực"]
CHEST_PAIN_SEVERITY_TERMS = [
    "dữ dội", "lan tay", "lan ra tay", "lan xuống tay", "lan lên hàm", "lan ra sau lưng",
    "vã mồ hôi", "toát mồ hôi", "khó thở", "ngất xỉu", exact("ngất"),
]
PREGNANCY_TERMS = ["mang thai", "có thai", "có bầu", "mang bầu", "bà bầu", "đang bầu", "thai"]
PREGNANCY_DANGER_TERMS = [
    "ra máu", "ra huyết", "chảy máu âm đạo", "chảy máu vùng kín", "đau bụng dữ dội",
    "vỡ ối", "rỉ ối", "ra nước ối",
]
ALLERGY_TRIGGER_TERMS = [
    "dị ứng", "mề đay", "mày đay", "mẩn ngứa", "sau tiêm", "sau khi tiêm", "sau uống thuốc",
    "sau khi uống thuốc", "sau dùng thuốc", "ong đốt",
]

EMERGENCY_RULES: list[dict] = [
    {"group": "GENERAL", "any": ["cấp cứu", "nguy kịch", "hôn mê", "ngừng thở", "ngưng thở",
                                 "ngừng tim", "tai nạn", "mất ý thức", "khó thở nặng"]},
    {"group": "CHEST_PAIN", "any": ["nhồi máu cơ tim", "đau ngực dữ dội", "đau ngực lan tay",
                                    "đau ngực lan ra tay"]},
    {"group": "CHEST_PAIN", "all": [CHEST_PAIN_TERMS, CHEST_PAIN_SEVERITY_TERMS]},
    {"group": "STROKE", "any": ["đột quỵ", "tai biến", "méo miệng", "méo mồm", "méo mặt",
                                "nói ngọng", "nói khó", "yếu nửa người", "liệt nửa người",
                                "tê nửa người"]},
    {"group": "AIRWAY", "any": ["khó thở dữ dội", "không thở được", "thở không được",
                                "không thở nổi", "thở không nổi", "tím tái", "môi tím",
                                "tím môi", "ngạt thở", "hóc dị vật"]},
    {"group": "ANAPHYLAXIS", "any": ["sốc phản vệ", "phản vệ", "sưng môi", "phù môi", "phù mặt",
                                     "phù họng", "sưng lưỡi", "phù lưỡi"]},
    {"group": "ANAPHYLAXIS", "all": [ALLERGY_TRIGGER_TERMS, ["khó thở", "tụt huyết áp", "choáng"]]},
    {"group": "SEIZURE", "any": ["co giật"]},
    {"group": "SYNCOPE", "any": [exact("ngất"), "ngất xỉu", "ngất đi", exact("xỉu"), "bất tỉnh"]},
    {"group": "BLEEDING", "any": ["nôn ra máu", "ói ra máu", "ho ra máu", "khạc ra máu",
                                  "chảy máu không cầm", "chảy máu không ngừng", "chảy máu nhiều",
                                  "mất máu nhiều", "băng huyết"]},
    {"group": "PREGNANCY", "all": [PREGNANCY_TERMS, PREGNANCY_DANGER_TERMS]},
    {"group": "SUICIDE", "any": ["muốn chết", exact("tự tử"), "tự sát", "tự vẫn",
                                 "không muốn sống", "tự làm hại bản thân", "tự hại"]},
    # Quá liều / ngộ độc: "quá liều" ở bất kỳ vị trí nào ("uống quá liều thuốc", "uống thuốc quá liều")
    {"group": "POISONING", "any": ["quá liều", "uống thuốc độc", "uống thuốc trừ sâu",
                                   "uống thuốc diệt cỏ", "uống thuốc chuột", "ngộ độc cấp",
                                   "ngộ độc rượu", "ngộ độc methanol", "ngộ độc thuốc",
                                   "ngộ độc nấm", "ngộ độc khí"]},
]

# Trẻ < 3 tháng tuổi có sốt / bỏ bú / li bì là dấu hiệu nguy hiểm (IMCI)
INFANT_DANGER_TERMS = ["sốt", "bỏ bú", "li bì"]
_AGE_UNIT = r"(tháng|thang|tuần|tuan|ngày|ngay)"
_INFANT_AGE_PATTERNS = [
    # "2 tháng tuổi", "3 tuần tuổi", "10 ngày tuổi"
    re.compile(r"(?<!\w)(\d{1,2})\s*" + _AGE_UNIT + r"\s*(?:tuổi|tuoi)(?!\w)"),
    # "bé 2 tháng", "bé nhà tôi 6 tuần", "con tôi 20 ngày" (không bắt "con tôi bị sốt 2 ngày")
    re.compile(r"(?<!\w)(?:bé|be|trẻ|tre|con|cháu|chau)(?:\s+(?:nhà\s+|nha\s+)?(?:tôi|toi|em|mình|minh))?"
               r"\s+(\d{1,2})\s*" + _AGE_UNIT + r"(?!\w)"),
]
_NEWBORN_TERMS = ["sơ sinh"]


def _is_young_infant(msg: str) -> bool:
    """Trẻ sơ sinh hoặc dưới 3 tháng tuổi (msg đã normalize_text)."""
    if contains_any(msg, _NEWBORN_TERMS):
        return True
    for pattern in _INFANT_AGE_PATTERNS:
        for m in pattern.finditer(msg):
            n, unit = int(m.group(1)), strip_accents(m.group(2))
            if (unit == "thang" and n < 3) or (unit == "tuan" and n < 13) or (unit == "ngay" and n <= 90):
                return True
    return False


EMERGENCY_REPLY = (
    "🚨 **TÌNH TRẠNG KHẨN CẤP – Gọi 115 ngay!**\n\n"
    "Triệu chứng bạn mô tả có thể là dấu hiệu cấp cứu nghiêm trọng. "
    "Vui lòng **gọi ngay số 115** hoặc đến **Khoa Khám bệnh / Cấp cứu ban đầu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n\n"
    "• Không tự ý dùng thuốc hoặc chờ đợi tại nhà.\n\n"
    "Mỹ Phát Hospital – Cấp cứu 24/7: 0789 065 493"
)

SUICIDE_REPLY = (
    "🚨 **Bạn không đơn độc – hãy tìm trợ giúp ngay bây giờ**\n\n"
    "Nếu bạn đang có ý định làm hại bản thân hoặc đang gặp nguy hiểm, vui lòng **gọi ngay số 115** "
    "hoặc đến **Khoa Khám bệnh / Cấp cứu ban đầu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n\n"
    "• Hỗ trợ tâm lý khẩn cấp 24/7: Hotline Mỹ Phát Hospital **0789 065 493** – nhân viên y tế sẽ lắng nghe "
    "và kết nối bạn với bác sĩ.\n"
    "• Nếu bạn là trẻ em (dưới 16 tuổi): Tổng đài quốc gia bảo vệ trẻ em **111** (miễn phí, 24/7).\n"
    "• Hãy ở cạnh hoặc gọi ngay cho người thân, bạn bè mà bạn tin tưởng; cất xa thuốc và vật sắc nhọn.\n\n"
    "Mỹ Phát Hospital – Cấp cứu 24/7: 0789 065 493"
)

# ============================================================================
# TRIỆU CHỨNG / NGỮ CẢNH Y TẾ – dùng để KHÔNG trả lời FAQ và KHÔNG chặn "ngoài phạm vi"
# khi người dùng đang mô tả triệu chứng (vd: "đau ở vị trí nào", "hút thuốc lá bị ho")
# ============================================================================
SYMPTOM_TERMS = [
    "đau", "nhức", "sốt", "ho", "nôn", "ói", "buồn nôn", "mệt", "mệt mỏi", "ngứa", "sưng", "phù",
    "chảy máu", "ra máu", "khó thở", "chóng mặt", "hoa mắt", "tiêu chảy", "táo bón", "triệu chứng",
    "viêm", "nổi mẩn", "nổi mần", "phát ban", "dị ứng", "tê bì", "tê tay", "tê chân", "co giật",
    "ợ chua", "ợ nóng", "đầy hơi", "khàn tiếng", "ngạt mũi", "nghẹt mũi", "sổ mũi", "chảy mũi",
    "ù tai", "mất ngủ", "hồi hộp", "đánh trống ngực", "tức ngực", "rụng tóc", "mụn", "khó chịu",
    "bị bệnh", "bị ốm", "khó nuốt", "tiểu buốt", "tiểu rắt",
]

MEDICAL_CONTEXT_TERMS = SYMPTOM_TERMS + [
    "cai", "cai nghiện", "nghiện", "điều trị", "chữa", "khám", "xét nghiệm", "tác hại",
    "sức khỏe", "bác sĩ", "lây", "lây nhiễm", "bệnh xã hội", "biến chứng", "ngộ độc",
    "quá liều", "say", "tránh thai", "bao cao su",
]

OUT_OF_SCOPE_KEYWORDS = [
    "thuốc lá", "ma túy", "rượu bia", "cờ bạc", "tình dục",
    "chính trị", "hack", "lừa đảo",
]

GREETING_KEYWORDS = [
    "xin chào", "chào buổi", "chào bạn", "hello", "hi bạn",
    "bạn là ai", "bạn tên gì", "hỏi thăm", "cảm ơn bạn",
    "cảm ơn nhiều", "thank you", "tạm biệt",
]


class ChatbotService:
    """AI Chatbot tư vấn y tế (FR-10)."""

    @staticmethod
    def _normalize(text: str) -> str:
        return normalize_text(text)

    @staticmethod
    def _match(text: str, keywords: list[str]) -> bool:
        """So khớp nguyên từ (word-boundary), chịu được gõ không dấu."""
        return contains_any(normalize_text(text), keywords)

    @classmethod
    def detect_emergency_groups(cls, message: str) -> set[str]:
        """Trả về tập nhóm dấu hiệu cấp cứu phát hiện được (rỗng nếu không có)."""
        msg = normalize_text(message)
        groups: set[str] = set()
        for rule in EMERGENCY_RULES:
            if "any" in rule and contains_any(msg, rule["any"]):
                groups.add(rule["group"])
            elif "all" in rule and all(contains_any(msg, terms) for terms in rule["all"]):
                groups.add(rule["group"])
        if _is_young_infant(msg) and contains_any(msg, INFANT_DANGER_TERMS):
            groups.add("INFANT")
        return groups

    @classmethod
    def process_message(
        cls,
        message: str,
        session_id: Optional[str] = None,
    ) -> ChatMessageResponse:
        sid = session_id or str(uuid.uuid4())[:12]
        msg = cls._normalize(message)

        # 1. EMERGENCY – Ưu tiên cao nhất, chạy trước FAQ / ngoài phạm vi / luật Sản khoa
        emergency_groups = cls.detect_emergency_groups(msg)
        if emergency_groups:
            return ChatMessageResponse(
                session_id=sid,
                intent="EMERGENCY",
                is_out_of_scope=True,
                reply=SUICIDE_REPLY if "SUICIDE" in emergency_groups else EMERGENCY_REPLY,
                disclaimer=CHATBOT_DISCLAIMER,
            )

        has_symptom = cls._match(msg, SYMPTOM_TERMS)

        # 2. OUT-OF-SCOPE – chỉ chặn khi KHÔNG có triệu chứng / ngữ cảnh y tế
        #    ("hút thuốc lá bị ho kéo dài" vẫn được tư vấn triệu chứng)
        if cls._match(msg, OUT_OF_SCOPE_KEYWORDS) and not cls._match(msg, MEDICAL_CONTEXT_TERMS):
            return ChatMessageResponse(
                session_id=sid,
                intent="OUT_OF_SCOPE",
                is_out_of_scope=True,
                reply=(
                    "Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về sức khỏe và "
                    "dịch vụ y tế tại Mỹ Phát Hospital. Bạn có câu hỏi y tế nào "
                    "khác không ạ?"
                ),
                disclaimer=CHATBOT_DISCLAIMER,
            )

        # 3. FAQ – kiểm tra trước GREETING vì FAQ có thể chứa từ chào hỏi.
        #    Bỏ qua FAQ khi tin nhắn mô tả triệu chứng ("đau ở vị trí nào", "đau mấy giờ rồi").
        if not has_symptom:
            for faq in FAQ_KB:
                if cls._match(msg, faq["keywords"]):
                    return ChatMessageResponse(
                        session_id=sid,
                        intent="FAQ",
                        reply=faq["reply"],
                        show_booking_button=faq.get("show_booking", False),
                        disclaimer=CHATBOT_DISCLAIMER,
                    )

        # 4. GREETING – Kiểm tra lời chào thuần túy (không kèm triệu chứng bệnh lý)
        is_greeting = cls._match(msg, GREETING_KEYWORDS)
        has_dept_keyword = any(cls._match(msg, dept["keywords"]) for dept in DEPT_ROUTING)

        if is_greeting and not has_dept_keyword and not has_symptom:
            return ChatMessageResponse(
                session_id=sid,
                intent="GREETING",
                reply=(
                    "Xin chào! 👋 Tôi là Trợ lý AI Y tế của Mỹ Phát Hospital.\n\n"
                    "Tôi có thể giúp bạn:\n"
                    "• 🏥 Gợi ý chuyên khoa phù hợp theo triệu chứng\n"
                    "• 📅 Hướng dẫn đặt lịch khám\n"
                    "• ❓ Giải đáp thắc mắc về dịch vụ, giờ khám, BHYT\n\n"
                    "Bạn đang có triệu chứng hoặc thắc mắc gì cần tư vấn?"
                ),
                disclaimer=CHATBOT_DISCLAIMER,
            )

        # 5. SYMPTOM_CHECK – Dự đoán chuyên khoa (Mô hình máy học ML Triage & Knowledge Base)
        # 5a0. Khoa mà mô hình ML chưa có nhãn (Sản - Phụ khoa) -> dùng luật từ khóa trước
        for dept in DEPT_ROUTING:
            if dept.get("priority") and cls._match(msg, dept["keywords"]):
                return cls._dept_response(sid, dept)

        # 5a. Ưu tiên mô hình máy học đã huấn luyện (chỉ khi đủ tự tin, xem ml_triage_service)
        ml_result = predict_department(msg)
        if ml_result is not None:
            dept_id, dept_name, conf, meta = ml_result
            return ChatMessageResponse(
                session_id=sid,
                intent="SYMPTOM_CHECK",
                reply=meta["reply"],
                suggested_department=DepartmentSuggestion(
                    dept_id=dept_id,
                    dept_name=dept_name,
                    reason=meta["reason"],
                ),
                show_booking_button=True,
                disclaimer=CHATBOT_DISCLAIMER,
            )

        # 5b. Rule-based Fallback theo cơ sở tri thức chuyên khoa
        for dept in DEPT_ROUTING:
            if cls._match(msg, dept["keywords"]):
                return cls._dept_response(sid, dept)

        # 6. DEFAULT – Không xác định được intent → Khoa Khám bệnh / Cấp cứu ban đầu
        return ChatMessageResponse(
            session_id=sid,
            intent="SYMPTOM_CHECK",
            reply=(
                "Cảm ơn bạn đã chia sẻ thông tin sức khỏe. Để được tư vấn chính xác nhất, "
                "bạn nên đến **Khoa Khám bệnh / Cấp cứu ban đầu** để bác sĩ thăm khám lâm sàng trực tiếp "
                "và chỉ định các xét nghiệm cần thiết.\n\n"
                "Bạn có muốn đặt lịch khám ngay không?"
            ),
            suggested_department=DepartmentSuggestion(
                dept_id=DEFAULT_DEPT_ID,
                dept_name=department_name(DEFAULT_DEPT_ID),
                reason="Phù hợp cho đánh giá sức khỏe tổng thể ban đầu",
            ),
            show_booking_button=True,
            disclaimer=CHATBOT_DISCLAIMER,
        )

    @staticmethod
    def _dept_response(sid: str, dept: dict) -> ChatMessageResponse:
        return ChatMessageResponse(
            session_id=sid,
            intent="SYMPTOM_CHECK",
            reply=dept["reply"],
            suggested_department=DepartmentSuggestion(
                dept_id=dept["dept_id"],
                dept_name=dept["dept_name"],
                reason=f"Triệu chứng phù hợp với bệnh lý {dept['dept_name']}",
            ),
            show_booking_button=True,
            disclaimer=CHATBOT_DISCLAIMER,
        )
