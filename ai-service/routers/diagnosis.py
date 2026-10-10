"""
Router AI Diagnosis Suggestion (FR-11.3 – Sprint 6):
Endpoint gợi ý chẩn đoán ICD-10 dựa trên triệu chứng bệnh nhân.
Tuân thủ NFR-8: Disclaimer y tế bắt buộc.
"""

from fastapi import APIRouter, status
from models.clinical import (
    DiagnosisSuggestionRequest,
    DiagnosisSuggestionResponse,
)
from services.diagnosis_suggestion_service import DiagnosisSuggestionService

router = APIRouter(prefix="/api/v1/ai/clinical", tags=["AI Diagnosis Suggestion"])


@router.post(
    "/suggest-diagnosis",
    response_model=DiagnosisSuggestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Gợi ý chẩn đoán phân biệt ICD-10 từ triệu chứng (FR-11.3)",
)
async def suggest_diagnosis(request: DiagnosisSuggestionRequest) -> DiagnosisSuggestionResponse:
    """
    Phân tích triệu chứng bệnh nhân mô tả bằng ngôn ngữ tự nhiên (tiếng Việt)
    và trả về Top 3 mã ICD-10 gợi ý kèm mức độ tin cậy (%).

    Bác sĩ có thể click chọn gợi ý để điền nhanh chẩn đoán xác định.
    Kết quả AI chỉ mang tính tham khảo, không thay thế phán đoán lâm sàng (NFR-8).
    """
    return DiagnosisSuggestionService.suggest_diagnosis(
        symptoms=request.symptoms,
        patient_age=request.patient_age,
        patient_gender=request.patient_gender,
        medical_history=request.medical_history,
        vital_signs=request.vital_signs,
    )
