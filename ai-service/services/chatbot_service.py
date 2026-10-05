"""
AI Chatbot Service (FR-10 – Sprint 7):
- Intent classification: SYMPTOM_CHECK / BOOKING / FAQ / OUT_OF_SCOPE / GREETING
- Gợi ý chuyên khoa theo triệu chứng (rule-based)
- Trả lời FAQ về dịch vụ y tế (giờ khám, BHYT, thủ tục…)
- Xử lý câu hỏi vượt phạm vi → cảnh báo gọi 115
- Tuân thủ NFR-8: Disclaimer y tế bắt buộc
"""

import re
import uuid
from typing import Optional

from models.chat import ChatMessageResponse, DepartmentSuggestion

CHATBOT_DISCLAIMER = (
    "Trợ lý AI chỉ hỗ trợ tư vấn sơ bộ, không thay thế thăm khám và chỉ định của bác sĩ."
)

from services.ml_triage_service import predict_department, DEPT_METADATA

# ============================================================================
# DEPARTMENT ROUTING KNOWLEDGE BASE (Rule-based Fallback & Knowledge Base)
# ============================================================================
DEPT_ROUTING: list[dict] = [
    # Khoa Da liễu – Ưu tiên cao cho các tổn thương da, dị ứng, nổi mẩn, nổi mần
    {
        "dept_id": 8, "dept_name": "Khoa Da liễu",
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
        "dept_id": 5, "dept_name": "Khoa Tim mạch",
        "keywords": ["đau ngực", "tức ngực", "đánh trống ngực", "hồi hộp",
                     "huyết áp", "tim đập nhanh", "loạn nhịp", "phù chân",
                     "mệt khi gắng sức", "khó thở khi nằm"],
        "reply": ("Dựa trên triệu chứng bạn mô tả, hệ thống gợi ý bạn nên "
                  "đến **Khoa Tim mạch** để được bác sĩ chuyên khoa thăm khám. "
                  "Bác sĩ sẽ chỉ định đo điện tim (ECG), siêu âm tim và các "
                  "xét nghiệm cần thiết để có chẩn đoán chính xác."),
    },
    {
        "dept_id": 3, "dept_name": "Khoa Hô hấp",
        "keywords": ["ho", "đờm", "khó thở", "thở khò khè", "viêm phổi",
                     "hen suyễn", "suyễn", "ho ra máu", "rát họng", "khàn tiếng"],
        "reply": ("Triệu chứng liên quan đến đường hô hấp. Bạn nên đến "
                  "**Khoa Hô hấp** để bác sĩ thăm khám, nghe phổi và "
                  "chỉ định X-quang phổi hoặc spirometry nếu cần."),
    },
    {
        "dept_id": 6, "dept_name": "Khoa Tiêu hóa",
        "keywords": ["đau bụng", "đau dạ dày", "ợ chua", "ợ nóng", "buồn nôn",
                     "tiêu chảy", "táo bón", "xuất huyết tiêu hóa", "phân đen",
                     "đau thượng vị", "đầy hơi", "chướng bụng", "viêm dạ dày"],
        "reply": ("Triệu chứng của bạn liên quan đến đường tiêu hóa. "
                  "**Khoa Tiêu hóa** sẽ giúp bạn thăm khám và có thể chỉ định "
                  "nội soi dạ dày/đại tràng để xác định nguyên nhân chính xác."),
    },
    {
        "dept_id": 4, "dept_name": "Khoa Nhi",
        "keywords": ["trẻ em", "trẻ nhỏ", "bé sốt", "trẻ sốt", "bé quấy",
                     "trẻ quấy khóc", "quấy khóc trẻ", "sơ sinh", "bỏ bú",
                     "trẻ không chịu ăn", "biếng ăn", "suy dinh dưỡng", "tiêm chủng",
                     "tiêm vắc xin", "tiêm vacxin", "bé nhà tôi bị sốt", "bé bị sốt"],
        "reply": ("Bạn đang hỏi về sức khỏe trẻ em. **Khoa Nhi** của chúng tôi "
                  "có đội ngũ bác sĩ chuyên khoa nhi giàu kinh nghiệm, sẵn sàng "
                  "thăm khám và tư vấn cho bé."),
    },
    {
        "dept_id": 1, "dept_name": "Khoa Nội tổng quát",
        "keywords": ["mệt mỏi", "sốt", "đổ mồ hôi đêm", "sụt cân", "chán ăn",
                     "tiểu đường", "đái tháo đường", "khát nước nhiều", "tiểu nhiều",
                     "tăng huyết áp", "mỡ máu", "kiểm tra sức khỏe"],
        "reply": ("Với triệu chứng bạn mô tả, **Khoa Nội tổng quát** là lựa chọn "
                  "phù hợp để bác sĩ đánh giá tổng thể, chỉ định xét nghiệm máu, "
                  "đường huyết và các chỉ số sinh hóa cần thiết."),
    },
    {
        "dept_id": 7, "dept_name": "Khoa Thần kinh",
        "keywords": ["đau đầu", "nhức đầu", "chóng mặt", "mất thăng bằng",
                     "tê bì tay chân", "run tay", "co giật", "động kinh",
                     "mất ngủ", "đột quỵ", "liệt"],
        "reply": ("Triệu chứng của bạn cần được đánh giá bởi **Khoa Thần kinh**. "
                  "Bác sĩ sẽ khám lâm sàng thần kinh và có thể chỉ định CT/MRI sọ "
                  "não để loại trừ các nguyên nhân nghiêm trọng."),
    },
    {
        "dept_id": 9, "dept_name": "Khoa Cơ xương khớp",
        "keywords": ["đau khớp", "sưng khớp", "viêm khớp", "đau lưng", "đau cổ",
                     "thoái hóa", "thoát vị đĩa đệm", "đau vai", "đau gối",
                     "cứng khớp buổi sáng"],
        "reply": ("Triệu chứng cơ xương khớp của bạn nên được thăm khám tại "
                  "**Khoa Cơ xương khớp**. Bác sĩ sẽ chỉ định X-quang, MRI và "
                  "đánh giá chức năng vận động để có hướng điều trị tốt nhất."),
    },
    {
        "dept_id": 10, "dept_name": "Khoa Sản phụ khoa",
        "keywords": ["kinh nguyệt", "thai kỳ", "mang thai", "khám phụ khoa",
                     "đau bụng kinh", "rối loạn kinh nguyệt", "vô sinh",
                     "siêu âm thai", "khám thai"],
        "reply": ("Với vấn đề bạn chia sẻ, **Khoa Sản phụ khoa** sẽ tư vấn và "
                  "thăm khám chuyên sâu, đảm bảo sức khỏe tối ưu cho bạn."),
    },
]

# ============================================================================
# FAQ KNOWLEDGE BASE
# ============================================================================
FAQ_KB: list[dict] = [
    {
        "keywords": ["bhyt", "bảo hiểm y tế", "bảo hiểm", "thẻ bhyt"],
        "reply": ("🏥 **Thông tin BHYT tại Mỹ Phát Hospital:**\n\n"
                  "• Tiếp nhận BHYT thông tuyến toàn quốc\n"
                  "• Giờ khám: Thứ 2 – Chủ Nhật (07h00 – 17h30)\n"
                  "• Mang CCCD gắn chip hoặc thẻ BHYT trên ứng dụng VssID\n"
                  "• Cấp cứu 24/7 không cần thủ tục trước"),
    },
    {
        "keywords": ["giờ khám", "giờ làm việc", "mấy giờ", "khám buổi", "lịch làm việc"],
        "reply": ("⏰ **Lịch khám bệnh Mỹ Phát Hospital:**\n\n"
                  "• Thứ 2 – Chủ Nhật: 07h00 – 17h30\n"
                  "• Cấp cứu & Hồi sức: 24/7 liên tục tất cả các ngày\n"
                  "• Đăng ký đặt lịch trước để tránh chờ đợi"),
    },
    {
        "keywords": ["chi phí", "giá", "phí khám", "bao nhiêu tiền", "phí dịch vụ"],
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
# EMERGENCY / OUT-OF-SCOPE KEYWORDS
# ============================================================================
EMERGENCY_KEYWORDS = [
    "cấp cứu", "nguy kịch", "hôn mê", "ngừng thở", "nhồi máu cơ tim",
    "đột quỵ", "tai nạn", "chảy máu nhiều", "mất ý thức", "co giật liên tục",
    "uống thuốc quá liều", "tự tử", "ngộ độc cấp", "khó thở nặng",
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
        return text.lower().strip()

    @staticmethod
    def _match(text: str, keywords: list[str]) -> bool:
        t = text.lower()
        return any(kw in t for kw in keywords)

    @classmethod
    def process_message(
        cls,
        message: str,
        session_id: Optional[str] = None,
    ) -> ChatMessageResponse:
        sid = session_id or str(uuid.uuid4())[:12]
        msg = cls._normalize(message)

        # 1. EMERGENCY – Ưu tiên cao nhất
        if cls._match(msg, EMERGENCY_KEYWORDS):
            return ChatMessageResponse(
                session_id=sid,
                intent="OUT_OF_SCOPE",
                is_out_of_scope=True,
                reply=(
                    "🚨 **TÌNH TRẠNG KHẨN CẤP – Gọi 115 ngay!**\n\n"
                    "Triệu chứng bạn mô tả có thể là dấu hiệu cấp cứu nghiêm trọng. "
                    "Vui lòng **gọi ngay số 115** hoặc đến **Khoa Cấp cứu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n\n"
                    "Mỹ Phát Hospital – Cấp cứu 24/7: 0789 065 493"
                ),
                disclaimer=CHATBOT_DISCLAIMER,
            )

        # 2. OUT-OF-SCOPE
        if cls._match(msg, OUT_OF_SCOPE_KEYWORDS):
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

        # 3. FAQ – kiểm tra trước GREETING vì FAQ có thể chứa từ chào hỏi
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

        if is_greeting and not has_dept_keyword:
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
        # 5a. Ưu tiên mô hình máy học đã huấn luyện
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

        # 6. DEFAULT – Không xác định được intent
        return ChatMessageResponse(
            session_id=sid,
            intent="SYMPTOM_CHECK",
            reply=(
                "Cảm ơn bạn đã chia sẻ thông tin sức khỏe. Để được tư vấn chính xác nhất, "
                "bạn nên đến **Khoa Nội tổng quát** để bác sĩ thăm khám lâm sàng trực tiếp "
                "và chỉ định các xét nghiệm cần thiết.\n\n"
                "Bạn có muốn đặt lịch khám ngay không?"
            ),
            suggested_department=DepartmentSuggestion(
                dept_id=1,
                dept_name="Khoa Nội tổng quát",
                reason="Phù hợp cho đánh giá sức khỏe tổng thể ban đầu",
            ),
            show_booking_button=True,
            disclaimer=CHATBOT_DISCLAIMER,
        )
