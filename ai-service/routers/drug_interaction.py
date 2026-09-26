"""Drug interaction router – placeholder for Sprint 5."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/ai/clinical", tags=["AI Clinical"])


@router.post("/check-interaction")
async def check_interaction() -> dict:
    """Kiểm tra tương tác thuốc. (Placeholder – Sprint 5)"""
    return {"message": "Drug interaction endpoint – sẽ triển khai ở Sprint 5"}


@router.post("/check-allergy")
async def check_allergy() -> dict:
    """Kiểm tra dị ứng thuốc. (Placeholder – Sprint 5)"""
    return {"message": "Allergy check endpoint – sẽ triển khai ở Sprint 5"}
