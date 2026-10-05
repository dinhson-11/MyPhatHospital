"""
Router AI Chatbot (FR-10 – Sprint 7):
Endpoint nhận tin nhắn bệnh nhân → phân loại intent → trả phản hồi y tế.
Tuân thủ NFR-8: Disclaimer y tế bắt buộc.
"""

from fastapi import APIRouter, status
from models.chat import ChatMessageRequest, ChatMessageResponse
from services.chatbot_service import ChatbotService

router = APIRouter(prefix="/api/v1/ai/chat", tags=["AI Chatbot"])


@router.post(
    "/message",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Gửi tin nhắn đến AI Chatbot y tế (FR-10)",
)
async def send_message(request: ChatMessageRequest) -> ChatMessageResponse:
    """
    Nhận tin nhắn từ bệnh nhân, phân loại intent và trả về phản hồi phù hợp.

    Intent types:
    - **SYMPTOM_CHECK**: Phân tích triệu chứng → gợi ý chuyên khoa
    - **BOOKING**: Hỏi đặt lịch khám
    - **FAQ**: Câu hỏi về giờ khám, BHYT, chi phí, địa chỉ...
    - **GREETING**: Lời chào hỏi
    - **OUT_OF_SCOPE**: Ngoài phạm vi y tế → cảnh báo / chuyển hướng

    Disclaimer y tế NFR-8 luôn được đính kèm.
    """
    return ChatbotService.process_message(
        message=request.message,
        session_id=request.session_id,
    )
