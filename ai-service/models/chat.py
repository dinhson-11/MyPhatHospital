"""
Pydantic models cho AI Chatbot (FR-10 – Sprint 7).
Hỗ trợ các intent: SYMPTOM_CHECK / BOOKING / FAQ / OUT_OF_SCOPE.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    """Tin nhắn người dùng gửi lên AI."""
    session_id: Optional[str] = Field(None, description="ID phiên chat (nếu chưa có sẽ tạo mới)")
    message: str = Field(..., min_length=1, description="Nội dung tin nhắn")
    patient_id: Optional[int] = Field(None, description="ID bệnh nhân đã đăng nhập (nếu có)")


class DepartmentSuggestion(BaseModel):
    """Gợi ý chuyên khoa cho bệnh nhân."""
    dept_id: int
    dept_name: str
    reason: str


class ChatMessageResponse(BaseModel):
    """Phản hồi của AI Chatbot."""
    session_id: str
    reply: str
    intent: str = Field(..., description="SYMPTOM_CHECK | BOOKING | FAQ | OUT_OF_SCOPE | GREETING")
    suggested_department: Optional[DepartmentSuggestion] = None
    show_booking_button: bool = False
    is_out_of_scope: bool = False
    disclaimer: str = "Trợ lý AI chỉ hỗ trợ tư vấn sơ bộ, không thay thế thăm khám và chỉ định của bác sĩ."
