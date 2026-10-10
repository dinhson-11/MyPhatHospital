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
        """Triệu chứng tim mạch quy về Khoa Khám bệnh / Cấp cứu ban đầu (bệnh viện không có khoa Tim mạch riêng)."""
        result = ChatbotService.process_message("Tôi bị đau ngực trái và hồi hộp")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 1
        assert "Khám bệnh" in result.suggested_department.dept_name
        assert result.show_booking_button is True

    def test_respiratory_symptom_routing(self):
        """Triệu chứng hô hấp quy về Khoa Khám bệnh / Cấp cứu ban đầu."""
        result = ChatbotService.process_message("Tôi ho nhiều và khó thở")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 1

    def test_gastrointestinal_symptom_routing(self):
        """Triệu chứng tiêu hóa quy về Khoa Khám bệnh / Cấp cứu ban đầu."""
        result = ChatbotService.process_message("Đau bụng vùng thượng vị, ợ chua sau ăn")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 1

    def test_pediatric_symptom_routing(self):
        """Triệu chứng trẻ em quy về Khoa Khám bệnh / Cấp cứu ban đầu."""
        result = ChatbotService.process_message("Bé nhà tôi bị sốt cao và quấy khóc")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 1

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
        assert result.suggested_department.dept_id == 14
        assert "Thẩm mỹ" in result.suggested_department.dept_name

    def test_child_with_skin_allergy_routes_to_dermatology_not_pediatrics(self):
        """Bé bị dị ứng, nổi mẩn da phải vào Khoa Da liễu thay vì Khoa Nhi."""
        result = ChatbotService.process_message("bé bị dị ứng, nổi mẩn da")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 14
        assert "Thẩm mỹ" in result.suggested_department.dept_name

    def test_dialect_noi_man_da_routes_to_dermatology(self):
        """Biến thể 'nổi mần da' hoặc 'dị ứng, nổi mần da' phải vào Khoa Da liễu."""
        result = ChatbotService.process_message("dị ứng, nổi mần da")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 14
        assert "Thẩm mỹ" in result.suggested_department.dept_name

    def test_suggested_departments_exist_in_hospital_catalog(self):
        """Mọi khoa AI gợi ý phải là khoa thật của bệnh viện (khớp bảng departments)."""
        from services.hospital_catalog import HOSPITAL_DEPARTMENTS
        messages = [
            "Tôi bị đau ngực trái và hồi hộp", "Tôi ho nhiều và khó thở", "Đau bụng vùng thượng vị, ợ chua",
            "Bé nhà tôi bị sốt cao và quấy khóc", "dị ứng, nổi mẩn da", "tôi bị đau họng và ngạt mũi",
            "đau khớp gối nhiều", "khám thai định kỳ", "Tôi cảm thấy không khỏe lắm hôm nay",
        ]
        for msg in messages:
            dept = ChatbotService.process_message(msg).suggested_department
            assert dept is not None, msg
            assert dept.dept_id in HOSPITAL_DEPARTMENTS, f"{msg} -> khoa không tồn tại: {dept.dept_id}"
            assert dept.dept_name == HOSPITAL_DEPARTMENTS[dept.dept_id][0]

    def test_ent_symptom_routes_to_ent_department(self):
        result = ChatbotService.process_message("tôi bị đau họng và ngạt mũi")
        assert result.suggested_department.dept_id == 10

    def test_obstetric_symptom_routes_to_obgyn_department(self):
        result = ChatbotService.process_message("tôi muốn khám thai định kỳ")
        assert result.suggested_department.dept_id == 3

    def test_working_hours_faq_covers_both_seasons(self):
        """Giờ làm việc: T2–CN, mùa hè/mùa đông (lùi 30'), BHYT T2–T7, cấp cứu 24/24 kể cả ngày lễ."""
        reply = ChatbotService.process_message("giờ làm việc của bệnh viện").reply
        assert "Thứ 2 – Chủ nhật" in reply
        assert "07h00 – 11h00" in reply and "13h00 – 17h30" in reply
        assert "07h30 – 11h30" in reply and "13h30 – 18h00" in reply
        assert "Thứ 2 – Thứ 7" in reply
        assert "kể cả ngày lễ" in reply
