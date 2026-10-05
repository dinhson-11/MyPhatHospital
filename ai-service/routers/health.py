"""Health check router."""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint cho monitoring và Docker healthcheck."""
    return {
        "status": "UP",
        "service": "hmsai-ai-service",
        "timestamp": datetime.now().isoformat(),
    }
