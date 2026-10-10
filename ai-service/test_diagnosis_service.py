"""
Unit Tests – Diagnosis Suggestion Service (FR-11.3 – Sprint 6)
Kiểm tra cơ chế gợi ý chẩn đoán ICD-10 từ triệu chứng.
"""

import pytest
from services.diagnosis_suggestion_service import DiagnosisSuggestionService
from models.clinical import MEDICAL_AI_DISCLAIMER


class TestDiagnosisSuggestionService:
    """Test suite cho DiagnosisSuggestionService."""

    def test_cardiovascular_symptoms_returns_i10(self):
        """Triệu chứng tim mạch phải trả về mã I10 (Tăng huyết áp)."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="Bệnh nhân đau tức ngực, huyết áp tăng cao 160/95, hoa mắt chóng mặt"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert "I10" in codes
        # Mã I10 phải có confidence cao
        i10 = next(s for s in result.suggestions if s.code == "I10")
        assert i10.confidence >= 80
        assert result.disclaimer == MEDICAL_AI_DISCLAIMER

    def test_respiratory_symptoms_returns_j00(self):
        """Triệu chứng hô hấp phải trả về mã J00 (Viêm mũi họng cấp)."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="Ho khan 3 ngày nay, sốt nhẹ 37.8 độ, rát họng và sổ mũi"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert "J00" in codes or "J02.9" in codes

    def test_gastrointestinal_symptoms_returns_k29(self):
        """Triệu chứng tiêu hóa phải trả về mã K29.7 (Viêm dạ dày)."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="Đau bụng vùng thượng vị, ợ chua, buồn nôn sau ăn"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert "K29.7" in codes

    def test_endocrine_symptoms_returns_e11(self):
        """Triệu chứng nội tiết phải trả về mã E11.9 (Đái tháo đường typ 2)."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="Khát nước nhiều, tiểu nhiều lần trong ngày, sụt cân không rõ nguyên nhân, mệt mỏi"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert "E11.9" in codes

    def test_no_match_returns_r69_default(self):
        """Triệu chứng không khớp nhóm nào phải trả về R69 (Nguyên nhân chưa xác định)."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="Cảm thấy không khỏe lắm"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert "R69" in codes
        assert result.disclaimer == MEDICAL_AI_DISCLAIMER

    def test_empty_symptoms_returns_empty(self):
        """Triệu chứng rỗng phải trả về danh sách trống."""
        result = DiagnosisSuggestionService.suggest_diagnosis(symptoms="")
        assert result.total_suggestions == 0
        assert len(result.suggestions) == 0

    def test_max_3_suggestions_returned(self):
        """Luôn trả về tối đa 3 gợi ý."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="Sốt cao, ho đờm, rát họng, nghẹt mũi, sổ mũi, hắt hơi liên tục"
        )
        assert result.total_suggestions <= 3
        assert len(result.suggestions) <= 3

    def test_suggestions_sorted_by_confidence_desc(self):
        """Gợi ý phải sắp xếp theo confidence giảm dần."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="Đau bụng quặn vùng thượng vị, ợ chua, buồn nôn, chướng bụng"
        )
        if len(result.suggestions) >= 2:
            for i in range(len(result.suggestions) - 1):
                assert result.suggestions[i].confidence >= result.suggestions[i + 1].confidence

    def test_allergy_and_skin_rash_suggests_urticaria_l50(self):
        """Triệu chứng dị ứng, nổi mẩn da phải gợi ý mã L50.9 (Mề đay) hoặc L27/L30."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="dị ứng, nổi mẩn da"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert any(c in codes for c in ["L50.9", "L27.2", "L30.9"])
        top_suggestion = result.suggestions[0]
        assert top_suggestion.code in ["L50.9", "L27.2", "L30.9"]
        assert top_suggestion.confidence >= 75

    def test_dialect_noi_man_da_suggests_dermatology_icd10(self):
        """Biến thể 'nổi mần da' hoặc 'dị ứng, nổi mần da' phải gợi ý mã ICD-10 Da liễu."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="dị ứng, nổi mần da"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert any(c in codes for c in ["L50.9", "L27.2", "L30.9"])

    def test_child_with_skin_allergy_suggests_dermatology_icd10(self):
        """Bé bị dị ứng nổi mẩn da phải gợi ý mã ICD-10 Da liễu."""
        result = DiagnosisSuggestionService.suggest_diagnosis(
            symptoms="bé bị dị ứng, nổi mẩn da"
        )
        assert result.total_suggestions > 0
        codes = [s.code for s in result.suggestions]
        assert any(c in codes for c in ["L50.9", "L27.2", "L30.9"])


def _codes(symptoms, **kwargs):
    return [s.code for s in DiagnosisSuggestionService.suggest_diagnosis(symptoms=symptoms, **kwargs).suggestions]


class TestDiagnosisRedFlags:
    """H7 / M5: nhóm cờ đỏ được đánh giá trước và luôn xếp đầu."""

    @pytest.mark.parametrize("symptoms, code", [
        ("Đau ngực dữ dội lan ra tay trái, vã mồ hôi", "I21.9"),
        ("đau thắt ngực kèm vã mồ hôi 30 phút", "I21.9"),
        ("Đột ngột méo miệng, yếu nửa người phải, nói khó", "I64"),
        ("phù môi, khó thở sau tiêm kháng sinh", "T78.2"),
        ("khó thở sau uống thuốc", "T78.2"),
        ("đau đầu dữ dội, cứng gáy, sốt 39 độ", "G03.9"),
        ("đang mang thai 8 tuần, ra máu âm đạo", "O20.9"),
        ("có bầu, ra huyết", "O20.9"),
        ("sốt xuất huyết ngày 4, chảy máu chân răng", "A91"),
    ])
    def test_red_flag_ranked_first(self, symptoms, code):
        result = DiagnosisSuggestionService.suggest_diagnosis(symptoms=symptoms)
        assert result.suggestions[0].code == code, [s.code for s in result.suggestions]
        assert "CỜ ĐỎ" in result.suggestions[0].reason

    def test_red_flags_keep_confidence_order(self):
        result = DiagnosisSuggestionService.suggest_diagnosis(symptoms="đau ngực dữ dội, vã mồ hôi, khó thở, huyết áp")
        confs = [s.confidence for s in result.suggestions]
        assert confs == sorted(confs, reverse=True)

    def test_dengue_without_bleeding_is_not_a91(self):
        assert "A91" not in _codes("nghi sốt xuất huyết, sốt cao 3 ngày, đau nhức toàn thân")

    def test_meningitis_requires_fever(self):
        assert "G03.9" not in _codes("đau đầu dữ dội, cứng gáy, nhiệt độ 37.2")

    def test_pregnancy_bleeding_not_flagged_for_male(self):
        assert "O20.9" not in _codes("thai ra máu", patient_gender="MALE")


class TestDiagnosisVitalSigns:
    """H7: đọc huyết áp / nhiệt độ / SpO2 từ văn bản và từ trường vital_signs."""

    @pytest.mark.parametrize("symptoms", [
        "đau tức ngực, chóng mặt, huyết áp 80/50",
        "chóng mặt, hoa mắt, HA 90/60 mmHg",
        "mệt, tụt huyết áp, hoa mắt",
    ])
    def test_low_or_normal_bp_never_suggests_hypertension(self, symptoms):
        assert "I10" not in _codes(symptoms)

    def test_hypotension_suggests_i95(self):
        codes = _codes("chóng mặt, hoa mắt, huyết áp 80/50")
        assert codes[0] == "I95.9"

    def test_bp_90_60_is_not_hypotension_by_rule(self):
        codes = _codes("chóng mặt, hoa mắt, HA 90/60 mmHg")
        assert "I95.9" not in codes and "I10" not in codes

    def test_high_bp_suggests_i10_even_without_cardiac_keywords(self):
        assert "I10" in _codes("đau đầu, HA 170/100")

    def test_i10_demoted_without_bp_evidence(self):
        result = DiagnosisSuggestionService.suggest_diagnosis(symptoms="đau tức ngực, hồi hộp, đánh trống ngực")
        assert result.suggestions[0].code == "I20.9"

    def test_temperature_below_38_is_not_fever(self):
        # 37.2 không phải sốt -> không suy luận nhiễm trùng toàn thân chỉ từ chữ "sốt"
        codes = _codes("sốt 37.2 độ, mệt mỏi")
        assert "A90" not in codes and "J00" not in codes

    def test_temperature_from_number_implies_fever(self):
        codes = _codes("ớn lạnh, đau nhức toàn thân, nhiệt độ 39.5")
        assert any(c in codes for c in ["A09", "A90", "B34.9"])

    def test_spo2_critical_and_abnormal(self):
        assert _codes("khó thở, SpO2 85%")[0] == "J96.0"
        codes = _codes("ho, khó thở nhẹ, SpO2 92%")
        assert "R09.8" in codes and "J96.0" not in codes
        codes = _codes("ho, khó thở nhẹ, SpO2 97%")
        assert "R09.8" not in codes and "J96.0" not in codes

    def test_structured_vital_signs_override_text(self):
        from models.clinical import VitalSigns
        vitals = VitalSigns(bloodPressureSystolic=82, bloodPressureDiastolic=50, spO2=88)
        codes = _codes("đau tức ngực, chóng mặt, huyết áp 160/95", vital_signs=vitals)
        assert "I10" not in codes
        assert codes[0] in ("J96.0", "I95.9")


class TestDiagnosisAgeAndMatching:
    """H7 age gate, M1 word-boundary, model validation."""

    def test_child_with_diabetes_symptoms_gets_type1(self):
        codes = _codes("khát nước nhiều, tiểu nhiều, sụt cân", patient_age=12)
        assert "E10.9" in codes and "E11.9" not in codes

    def test_adult_with_diabetes_symptoms_keeps_type2(self):
        codes = _codes("khát nước nhiều, tiểu nhiều, sụt cân", patient_age=55)
        assert "E11.9" in codes and "E10.9" not in codes

    def test_short_keywords_do_not_match_inside_words(self):
        # "ho" không được khớp "cho", "khoa"; "run" không được khớp "trung"
        assert _codes("cho tôi khám khoa trung tâm") == ["R69", "Z00.0"]

    def test_unaccented_input_matches(self):
        assert "K29.7" in _codes("dau bung vung thuong vi, o chua")

    @pytest.mark.parametrize("age", [-1, 131])
    def test_patient_age_validation(self, age):
        from pydantic import ValidationError
        from models.clinical import DiagnosisSuggestionRequest
        with pytest.raises(ValidationError):
            DiagnosisSuggestionRequest(symptoms="đau đầu", patient_age=age)

    def test_request_accepts_vital_signs_aliases(self):
        from models.clinical import DiagnosisSuggestionRequest
        req = DiagnosisSuggestionRequest.model_validate({
            "symptoms": "đau đầu", "patient_age": 40,
            "vitalSigns": {"bloodPressureSystolic": 150, "bloodPressureDiastolic": 95, "temperature": 37.0},
        })
        assert req.vital_signs.blood_pressure_systolic == 150
