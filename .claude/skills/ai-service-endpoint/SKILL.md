---
name: ai-service-endpoint
description: Tạo endpoint mới cho AI Service (Python FastAPI). Sử dụng khi cần thêm tính năng AI mới (chatbot, drug interaction, diagnosis suggestion).
---

# Skill: Tạo Endpoint AI Service (FastAPI)

## Khi nào dùng
Sử dụng khi cần tạo endpoint mới cho AI Service Python: chatbot, kiểm tra tương tác thuốc, gợi ý chẩn đoán, hoặc bất kỳ tính năng AI nào.

## Nguyên tắc bắt buộc
1. **Mọi output AI PHẢI có `disclaimer`**: "Đây là gợi ý tham khảo, không thay thế chẩn đoán/chỉ định y khoa."
2. **Mọi gợi ý AI PHẢI được log** lại (trả về data đủ để backend lưu vào `ai_clinical_suggestions`).
3. **Có timeout + fallback**: nếu AI service lỗi, backend vẫn cho bác sĩ thao tác, chỉ ẩn phần gợi ý.
4. **Triệu chứng cấp cứu**: chatbot phải nhận diện và khuyến nghị liên hệ y tế/cấp cứu ngay.

## Cấu trúc AI Service
```
ai-service/
├── main.py                  # FastAPI app, router mount
├── routers/
│   ├── chat.py              # /chat endpoints
│   ├── drug_interaction.py  # /check-interaction, /check-allergy
│   └── diagnosis.py         # /suggest-diagnosis
├── models/
│   ├── request.py           # Pydantic request models
│   └── response.py          # Pydantic response models
├── services/
│   ├── chat_service.py      # Chatbot logic
│   ├── interaction_service.py # Drug interaction check logic
│   └── diagnosis_service.py # Diagnosis suggestion logic
├── data/                    # Dữ liệu mẫu, rules
│   ├── drug_interactions.json
│   └── symptom_diagnosis.json
├── requirements.txt
└── Dockerfile
```

## Template Endpoint

### Router
```python
from fastapi import APIRouter, HTTPException
from models.request import CheckInteractionRequest
from models.response import CheckInteractionResponse
from services.interaction_service import InteractionService

router = APIRouter(prefix="/api/v1/ai", tags=["AI Clinical"])
service = InteractionService()

@router.post("/check-interaction", response_model=CheckInteractionResponse)
async def check_interaction(request: CheckInteractionRequest):
    try:
        result = await service.check(request.drug_ids)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Pydantic Models
```python
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class Severity(str, Enum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"

class CheckInteractionRequest(BaseModel):
    drug_ids: List[int] = Field(..., min_items=2, description="Danh sách ID thuốc cần kiểm tra")

class DrugWarning(BaseModel):
    drug_a: str
    drug_b: str
    severity: Severity
    description: str

class CheckInteractionResponse(BaseModel):
    has_warning: bool
    warnings: List[DrugWarning] = []
    disclaimer: str = "Kết quả chỉ mang tính tham khảo, bác sĩ ra quyết định cuối cùng."
```

### Service
```python
from typing import List

class InteractionService:
    def __init__(self):
        # Load drug interaction data
        pass
    
    async def check(self, drug_ids: List[int]) -> dict:
        # Logic kiểm tra tương tác
        # PHẢI trả disclaimer
        pass
```

## Tích hợp với Backend (Spring Boot)
Backend gọi AI Service qua `AiClientService`:
```java
@Service @RequiredArgsConstructor @Slf4j
public class AiClientService {
    private final RestTemplate restTemplate;
    
    @Value("${ai-service.base-url}")
    private String aiServiceBaseUrl;
    
    public CheckInteractionResponse checkInteraction(List<Long> drugIds) {
        try {
            // POST to ai-service/api/v1/ai/check-interaction
            // timeout 3s (NFR-3)
        } catch (Exception e) {
            log.warn("AI Service unavailable, skipping interaction check", e);
            return null; // fallback: bác sĩ vẫn thao tác được
        }
    }
}
```

## Checklist
- [ ] Pydantic model có type hints và Field validation
- [ ] Response LUÔN có `disclaimer`
- [ ] Endpoint xử lý exception, trả JSON error nhất quán
- [ ] Có healthcheck endpoint (`GET /health`)
- [ ] Backend AiClientService có timeout + fallback
- [ ] Log đủ thông tin để lưu vào `ai_clinical_suggestions`
- [ ] Triệu chứng cấp cứu → phản hồi khẩn cấp (chatbot)
