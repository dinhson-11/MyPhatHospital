"""Diagnosis suggestion router – placeholder for Sprint 6."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/ai/clinical", tags=["AI Clinical"])


@router.post("/suggest-diagnosis")
async def suggest_diagnosis() -> dict:
    """Gợi ý chẩn đoán phân biệt. (Placeholder – Sprint 6)"""
    return {"message": "Diagnosis suggestion endpoint – sẽ triển khai ở Sprint 6"}
