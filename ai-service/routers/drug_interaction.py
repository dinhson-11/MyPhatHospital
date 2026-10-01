"""
Router AI Clinical Safety:
Endpoints:
- POST /api/v1/ai/clinical/check-interaction: Kiểm tra tương tác thuốc
- POST /api/v1/ai/clinical/check-allergy: Kiểm tra dị ứng thuốc & dị ứng chéo
- POST /api/v1/ai/clinical/check-prescription-safety: Kiểm tra an toàn đơn thuốc tổng thể
"""

from fastapi import APIRouter, status
from models.clinical import (
    InteractionCheckRequest,
    InteractionCheckResponse,
    AllergyCheckRequest,
    AllergyCheckResponse,
    PrescriptionSafetyCheckRequest,
    PrescriptionSafetyResponse,
)
from services.clinical_alert_service import ClinicalAlertService

router = APIRouter(prefix="/api/v1/ai/clinical", tags=["AI Clinical Safety"])


@router.post(
    "/check-interaction",
    response_model=InteractionCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Kiểm tra tương tác thuốc trong đơn (FR-11.1)",
)
async def check_drug_interaction(request: InteractionCheckRequest) -> InteractionCheckResponse:
    """
    Phát hiện các cặp thuốc tương tác bất lợi trong đơn thuốc.
    Trả về mức độ cảnh báo (CRITICAL, WARNING, INFO), cơ chế dược lý, khuyến cáo xử trí
    và disclaimer y tế bắt buộc theo NFR-8.
    """
    return ClinicalAlertService.check_drug_interactions(request.drugs)


@router.post(
    "/check-allergy",
    response_model=AllergyCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Kiểm tra dị ứng thuốc & dị ứng chéo (FR-11.2)",
)
async def check_patient_allergy(request: AllergyCheckRequest) -> AllergyCheckResponse:
    """
    So khớp danh sách thuốc kê đơn với tiền sử dị ứng của bệnh nhân.
    Phát hiện trùng khớp trực tiếp hoặc nguy cơ dị ứng chéo theo họ dược động học.
    Kèm disclaimer y tế bắt buộc theo NFR-8.
    """
    return ClinicalAlertService.check_patient_allergies(
        allergies=request.patient_allergies,
        drugs=request.drugs,
    )


@router.post(
    "/check-prescription-safety",
    response_model=PrescriptionSafetyResponse,
    status_code=status.HTTP_200_OK,
    summary="Kiểm tra an toàn đơn thuốc tổng thể (FR-11.1 + FR-11.2)",
)
async def check_prescription_safety(
    request: PrescriptionSafetyCheckRequest,
) -> PrescriptionSafetyResponse:
    """
    Kiểm tra tổng thể toàn bộ đơn thuốc: đồng thời phát hiện tương tác thuốc lẫn dị ứng bệnh nhân.
    Được gọi tự động khi bác sĩ lưu đơn thuốc hoặc kiểm tra trước khi lưu.
    """
    return ClinicalAlertService.check_prescription_safety(
        drugs=request.drugs,
        allergies=request.patient_allergies,
    )
