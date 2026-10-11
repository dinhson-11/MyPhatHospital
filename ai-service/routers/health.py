"""Health check router."""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint cho monitoring và Docker healthcheck."""
    from services.ml_triage_service import load_trained_model
    return {
        "status": "UP",
        "service": "hmsai-ai-service",
        # Không có mô hình ML vẫn phục vụ được (luật từ khóa) nên không đổi status, chỉ báo để giám sát
        "mlModelLoaded": load_trained_model() is not None,
        "timestamp": datetime.now().isoformat(),
    }
