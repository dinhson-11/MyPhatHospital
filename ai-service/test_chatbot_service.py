"""
Unit Tests – AI Chatbot Service (FR-10 – Sprint 7)
Kiểm tra intent routing, department suggestion, FAQ, emergency escalation.
"""

import pytest
from services.chatbot_service import ChatbotService


class TestChatbotService:
    """Test suite cho ChatbotService."""

    def test_greeting_intent(self):
        """Lời chào phải trả về GREETING intent."""
        result = ChatbotService.process_message("Xin chào, bạn là ai?")
        assert result.intent == "GREETING"
        assert "Trợ lý AI" in result.reply
        assert result.disclaimer != ""

    def test_cardiovascular_symptom_routing(self):
        """Triệu chứng tim mạch phải gợi ý Khoa Tim mạch."""
        result = ChatbotService.process_message("Tôi bị đau ngực trái và hồi hộp")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert "Tim mạch" in result.suggested_department.dept_name
        assert result.show_booking_button is True

    def test_respiratory_symptom_routing(self):
        """Triệu chứng hô hấp phải gợi ý Khoa Hô hấp."""
        result = ChatbotService.process_message("Tôi ho nhiều và khó thở")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert "Hô hấp" in result.suggested_department.dept_name

    def test_gastrointestinal_symptom_routing(self):
        """Triệu chứng tiêu hóa phải gợi ý Khoa Tiêu hóa."""
        result = ChatbotService.process_message("Đau bụng vùng thượng vị, ợ chua sau ăn")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert "Tiêu hóa" in result.suggested_department.dept_name

    def test_pediatric_symptom_routing(self):
        """Triệu chứng trẻ em phải gợi ý Khoa Nhi."""
        result = ChatbotService.process_message("Bé nhà tôi bị sốt cao và quấy khóc")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert "Nhi" in result.suggested_department.dept_name

    def test_faq_bhyt(self):
        """Câu hỏi BHYT phải trả về FAQ intent với thông tin đúng."""
        result = ChatbotService.process_message("Bệnh viện có nhận BHYT không?")
        assert result.intent == "FAQ"
        assert "BHYT" in result.reply or "bảo hiểm" in result.reply.lower()

    def test_faq_booking(self):
        """Câu hỏi đặt lịch phải trả về FAQ intent và show_booking_button."""
        result = ChatbotService.process_message("Tôi muốn đặt lịch khám bệnh")
        assert result.intent == "FAQ"
        assert result.show_booking_button is True

    def test_faq_hours(self):
        """Câu hỏi giờ khám phải trả về FAQ intent."""
        result = ChatbotService.process_message("Bệnh viện mấy giờ mở cửa?")
        assert result.intent == "FAQ"
        assert "07h" in result.reply or "7h" in result.reply

    def test_emergency_escalation(self):
        """Triệu chứng cấp cứu phải trả OUT_OF_SCOPE + số 115."""
        result = ChatbotService.process_message("Tôi đang đau ngực dữ dội nghi nhồi máu cơ tim")
        assert result.intent == "OUT_OF_SCOPE"
        assert result.is_out_of_scope is True
        assert "115" in result.reply

    def test_out_of_scope_blocked(self):
        """Câu hỏi ngoài phạm vi y tế phải bị chặn."""
        result = ChatbotService.process_message("Cho tôi hỏi về mua bán ma túy")
        assert result.intent == "OUT_OF_SCOPE"
        assert result.is_out_of_scope is True

    def test_session_id_preserved(self):
        """Session ID được truyền vào phải được giữ nguyên."""
        result = ChatbotService.process_message("Xin chào", session_id="test-session-123")
        assert result.session_id == "test-session-123"

    def test_session_id_auto_generated(self):
        """Nếu không truyền session_id, phải tự tạo."""
        result = ChatbotService.process_message("Xin chào")
        assert result.session_id is not None
        assert len(result.session_id) > 0

    def test_disclaimer_always_present(self):
        """Disclaimer NFR-8 phải có trong mọi phản hồi."""
        messages = [
            "Xin chào",
            "Tôi bị đau đầu",
            "Giờ khám bệnh viện?",
            "Cấp cứu ngay",
        ]
        for msg in messages:
            result = ChatbotService.process_message(msg)
            assert result.disclaimer != "", f"Thiếu disclaimer cho tin nhắn: '{msg}'"

    def test_default_fallback_returns_general_dept(self):
        """Triệu chứng không khớp phải trả về Khoa Nội tổng quát."""
        result = ChatbotService.process_message("Tôi cảm thấy không khỏe lắm hôm nay")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.show_booking_button is True

    def test_allergy_and_skin_rash_routes_to_dermatology(self):
        """Triệu chứng dị ứng, nổi mẩn da phải được điều hướng vào Khoa Da liễu."""
        result = ChatbotService.process_message("dị ứng, nổi mẩn da")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 8
        assert "Da liễu" in result.suggested_department.dept_name

    def test_child_with_skin_allergy_routes_to_dermatology_not_pediatrics(self):
        """Bé bị dị ứng, nổi mẩn da phải vào Khoa Da liễu thay vì Khoa Nhi."""
        result = ChatbotService.process_message("bé bị dị ứng, nổi mẩn da")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 8
        assert "Da liễu" in result.suggested_department.dept_name

    def test_dialect_noi_man_da_routes_to_dermatology(self):
        """Biến thể 'nổi mần da' hoặc 'dị ứng, nổi mần da' phải vào Khoa Da liễu."""
        result = ChatbotService.process_message("dị ứng, nổi mần da")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 8
        assert "Da liễu" in result.suggested_department.dept_name
