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
        """Triệu chứng cấp cứu phải trả intent EMERGENCY (frontend ChatMessage.jsx & Java fallback dùng EMERGENCY) + số 115."""
        result = ChatbotService.process_message("Tôi đang đau ngực dữ dội nghi nhồi máu cơ tim")
        assert result.intent == "EMERGENCY"
        assert result.is_out_of_scope is True
        assert "115" in result.reply
        assert result.show_booking_button is False

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


class TestChatbotEmergencyRedFlags:
    """C1/C2/H3: Dấu hiệu cờ đỏ phải trả EMERGENCY trước FAQ, ngoài phạm vi và luật Sản khoa."""

    @pytest.mark.parametrize("message", [
        # Đau ngực
        "Tôi bị đau ngực dữ dội",
        "đau ngực lan ra tay trái",
        "đau thắt ngực kèm vã mồ hôi",
        # Đột quỵ
        "bố tôi tự nhiên méo miệng, nói ngọng",
        "mẹ tôi yếu nửa người bên phải",
        "liệt nửa người từ sáng",
        "ông bị tê nửa người, nói khó",
        "nghi bị tai biến",
        # Đường thở
        "khó thở dữ dội",
        "con tôi không thở được",
        "bé bị tím tái, môi tím",
        # Phản vệ
        "bị sốc phản vệ",
        "sau khi uống thuốc bị sưng môi",
        "dị ứng hải sản rồi khó thở",
        # Co giật / ngất
        "con tôi bị co giật",
        "tôi vừa bị ngất",
        "bà bị bất tỉnh",
        # Chảy máu
        "nôn ra máu nhiều",
        "ho ra máu",
        "vết thương chảy máu không cầm",
        "sản phụ bị băng huyết",
        # Ý định tự sát
        "tôi muốn chết",
        "tôi không muốn sống nữa",
        "tôi định tự tử",
        # Quá liều – thứ tự từ linh hoạt
        "tôi uống thuốc quá liều",
        "lỡ uống quá liều thuốc ngủ",
        "uống thuốc trừ sâu",
        # Trẻ nhỏ < 3 tháng có sốt
        "bé 2 tháng tuổi bị sốt",
        "trẻ sơ sinh bị sốt",
        "con tôi 20 ngày tuổi sốt 38 độ",
    ])
    def test_red_flags_return_emergency(self, message):
        result = ChatbotService.process_message(message)
        assert result.intent == "EMERGENCY", message
        assert "115" in result.reply
        assert "0789 065 493" in result.reply
        assert result.suggested_department is None

    @pytest.mark.parametrize("message", [
        "dot quy",
        "muon chet",
        "dau nguc du doi kho tho",
        "me toi bi meo mieng noi kho",
        "uong thuoc qua lieu",
        "Tôi bị ĐỘT QUỴ",
        # Unicode NFD (dấu tổ hợp) phải được chuẩn hóa NFC trước khi so khớp
        __import__("unicodedata").normalize("NFD", "tôi muốn chết"),
    ])
    def test_unaccented_and_unnormalized_input_detected(self, message):
        assert ChatbotService.process_message(message).intent == "EMERGENCY", message

    def test_suicide_reply_includes_mental_health_support(self):
        reply = ChatbotService.process_message("tôi muốn chết").reply
        assert "115" in reply
        assert "Hỗ trợ tâm lý" in reply
        assert "0789 065 493" in reply

    @pytest.mark.parametrize("message", [
        "tôi đang mang thai bị ra máu",
        "có bầu 8 tuần bị đau bụng dữ dội",
        "mang bầu tháng thứ 8 bị vỡ ối",
    ])
    def test_pregnancy_danger_signs_beat_obgyn_priority_rule(self, message):
        assert ChatbotService.process_message(message).intent == "EMERGENCY", message

    def test_emergency_runs_before_faq_and_out_of_scope(self):
        # Có từ khóa FAQ ("ở đâu") và ngoài phạm vi ("rượu bia") nhưng vẫn phải là cấp cứu
        assert ChatbotService.process_message("bệnh viện ở đâu, bố tôi bị đột quỵ").intent == "EMERGENCY"
        assert ChatbotService.process_message("uống rượu bia xong nôn ra máu").intent == "EMERGENCY"

    @pytest.mark.parametrize("message", [
        "Tôi bị đau ngực trái và hồi hộp",   # không có dấu hiệu nặng (dữ dội/lan tay/vã mồ hôi/khó thở)
        "tôi bị đau họng và ngạt mũi",       # "ngạt" không được khớp nhầm thành "ngất"
        "đau từ từ tăng dần",                # "từ từ" không phải "tự tử"
        "bé 2 tuổi bị sốt",                  # không phải trẻ < 3 tháng
        "con tôi bị sốt 2 ngày nay",         # "2 ngày" là thời gian bệnh, không phải tuổi
        "bé 5 tháng tuổi bị sốt nhẹ",
    ])
    def test_non_emergency_messages_are_not_escalated(self, message):
        assert ChatbotService.process_message(message).intent != "EMERGENCY", message


class TestChatbotMatchingFixes:
    """H1/H2/H8/M1/C2: so khớp nguyên từ, FAQ/ngoài phạm vi không nuốt câu hỏi y tế."""

    @pytest.mark.parametrize("message", [
        "tôi có cảm giác buồn nôn",          # "giá" nằm trong "cảm giác"
        "tôi bị đau ở vị trí thượng vị",     # "vị trí"
        "đau bụng mấy giờ nay rồi",          # "mấy giờ"
        "đau ở đâu thì nên khám khoa nào",   # "ở đâu"
    ])
    def test_symptom_messages_are_not_answered_as_faq(self, message):
        result = ChatbotService.process_message(message)
        assert result.intent == "SYMPTOM_CHECK", message
        assert result.suggested_department is not None

    def test_faq_price_still_answered(self):
        assert ChatbotService.process_message("giá khám bao nhiêu tiền?").intent == "FAQ"
        assert ChatbotService.process_message("bệnh viện ở đâu?").intent == "FAQ"

    @pytest.mark.parametrize("message", [
        "tôi hút thuốc lá và bị ho kéo dài",
        "uống rượu bia nhiều bị đau dạ dày",
        "tôi muốn cai thuốc lá",
    ])
    def test_out_of_scope_terms_with_medical_context_are_not_blocked(self, message):
        result = ChatbotService.process_message(message)
        assert result.intent == "SYMPTOM_CHECK", message
        assert result.is_out_of_scope is False

    @pytest.mark.parametrize("message", ["tôi có bầu được 3 tháng muốn đi khám", "mang bầu tháng thứ 4 cần khám gì"])
    def test_colloquial_pregnancy_terms_route_to_obgyn(self, message):
        result = ChatbotService.process_message(message)
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 3

    def test_short_keyword_ho_not_matched_inside_other_words(self):
        from services.chatbot_service import DEPT_ROUTING
        respiratory = next(d for d in DEPT_ROUTING if "ho" in d["keywords"])
        assert not ChatbotService._match("cho tôi hỏi khoa nào", respiratory["keywords"])
        assert ChatbotService._match("tôi bị ho nhiều", respiratory["keywords"])

    @pytest.mark.parametrize("message", ["xyz abc", "asdf qwer", "qwerty 123"])
    def test_gibberish_falls_back_to_general_department_not_cosmetics(self, message):
        result = ChatbotService.process_message(message)
        assert result.suggested_department is not None
        assert result.suggested_department.dept_id == 1, message

    def test_unaccented_symptom_routes_by_rules(self):
        result = ChatbotService.process_message("toi bi dau hong va ngat mui")
        assert result.intent == "SYMPTOM_CHECK"
        assert result.suggested_department.dept_id == 10


class TestMlTriageThreshold:
    """C2: Mô hình ML chỉ được dùng khi đủ tự tin và bỏ xa nhãn thứ hai."""

    def test_low_confidence_prediction_rejected(self):
        from services.ml_triage_service import predict_department
        assert predict_department("xyz abc") is None

    def test_confident_prediction_accepted(self):
        from services.ml_triage_service import predict_department, ML_MIN_CONFIDENCE
        result = predict_department("dị ứng, nổi mẩn da")
        assert result is not None
        assert result[0] == 14
        assert result[2] >= ML_MIN_CONFIDENCE
