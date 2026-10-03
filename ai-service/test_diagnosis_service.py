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
