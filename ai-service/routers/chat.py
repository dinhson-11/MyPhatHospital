"""Chat router – placeholder for Sprint 7."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/ai/chat", tags=["AI Chatbot"])


@router.post("/sessions")
async def create_session() -> dict:
    """Tạo phiên chat mới. (Placeholder – Sprint 7)"""
    return {"message": "Chat endpoint – sẽ triển khai ở Sprint 7"}
