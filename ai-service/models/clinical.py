"""
Pydantic models for AI Clinical Safety endpoints:
- Drug interaction check
- Patient allergy check
- Comprehensive prescription safety
"""

from typing import List, Optional
from pydantic import BaseModel, Field

MEDICAL_AI_DISCLAIMER: str = (
    "Kết quả do AI phân tích chỉ mang tính tham khảo, "
    "không thay thế phán đoán lâm sàng của bác sĩ."
)


class DrugItem(BaseModel):
    """Thông tin thuốc đầu vào."""
    id: Optional[int] = None
    code: Optional[str] = None
    name: str = Field(..., description="Tên thuốc / biệt dược")
    dosage: Optional[str] = None
    active_ingredient: Optional[str] = None


class PatientAllergyItem(BaseModel):
    """Thông tin dị ứng của bệnh nhân."""
    id: Optional[int] = None
    allergen: str = Field(..., description="Tên tác nhân / hoạt chất / nhóm thuốc dị ứng")
    severity: Optional[str] = Field("MILD", description="Mức độ nghiêm trọng: MILD, MODERATE, SEVERE")
    note: Optional[str] = None


class DrugInteractionDetail(BaseModel):
    """Chi tiết một cặp tương tác thuốc."""
    drug_a_id: Optional[int] = None
    drug_a_name: str
    drug_b_id: Optional[int] = None
    drug_b_name: str
    severity: str = Field(..., description="CRITICAL, WARNING, INFO")
    mechanism: str = Field(..., description="Cơ chế tác động dược lý")
    description: str = Field(..., description="Hậu quả lâm sàng")
    recommendation: str = Field(..., description="Khuyến cáo xử trí y khoa")


class AllergyAlertDetail(BaseModel):
    """Chi tiết một cảnh báo dị ứng thuốc."""
    drug_id: Optional[int] = None
    drug_name: str
    allergen: str
    reaction_type: str = Field("DIRECT_MATCH", description="DIRECT_MATCH hoặc CROSS_REACTIVITY")
    severity: str = Field("CRITICAL", description="CRITICAL hoặc WARNING")
    description: str = Field(..., description="Mô tả nguy cơ dị ứng")
    recommendation: str = Field(..., description="Khuyến cáo xử trí y khoa")


# Requests
class InteractionCheckRequest(BaseModel):
    drugs: List[DrugItem] = Field(..., min_length=1, description="Danh sách thuốc cần kiểm tra")


class AllergyCheckRequest(BaseModel):
    patient_id: Optional[int] = None
    patient_allergies: List[PatientAllergyItem] = Field(default_factory=list, description="Tiền sử dị ứng của bệnh nhân")
    drugs: List[DrugItem] = Field(..., min_length=1, description="Danh sách thuốc cần kiểm tra")


class PrescriptionSafetyCheckRequest(BaseModel):
    visit_id: Optional[int] = None
    patient_id: Optional[int] = None
    patient_allergies: List[PatientAllergyItem] = Field(default_factory=list)
    drugs: List[DrugItem] = Field(..., min_length=1)


# Responses
class InteractionCheckResponse(BaseModel):
    has_interaction: bool = False
    has_critical: bool = False
    total_interactions: int = 0
    interactions: List[DrugInteractionDetail] = Field(default_factory=list)
    confidence_score: float = 0.95
    disclaimer: str = MEDICAL_AI_DISCLAIMER


class AllergyCheckResponse(BaseModel):
    has_allergy_conflict: bool = False
    has_critical: bool = False
    total_alerts: int = 0
    alerts: List[AllergyAlertDetail] = Field(default_factory=list)
    confidence_score: float = 0.95
    disclaimer: str = MEDICAL_AI_DISCLAIMER


class PrescriptionSafetyResponse(BaseModel):
    is_safe: bool = True
    has_warning: bool = False
    has_critical: bool = False
    interaction_count: int = 0
    allergy_count: int = 0
    interactions: List[DrugInteractionDetail] = Field(default_factory=list)
    allergy_alerts: List[AllergyAlertDetail] = Field(default_factory=list)
    confidence_score: float = 0.95
    disclaimer: str = MEDICAL_AI_DISCLAIMER
