"""
Kiểm tra hợp đồng JSON giữa FastAPI AI Service và backend Java (M2).
Tên trường snake_case ở đây phải khớp @JsonProperty trong com.hospital.hmsai.ai.dto.*
"""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_chat_response_fields_match_java_ai_chatbot_response():
    res = client.post("/api/v1/ai/chat/message", json={"message": "tôi bị đau họng", "session_id": "s-1"})
    assert res.status_code == 200
    body = res.json()
    # AiChatbotResponse: reply, intent, suggested_department, show_booking_button, session_id, is_out_of_scope, disclaimer
    assert {"reply", "intent", "suggested_department", "show_booking_button", "session_id",
            "is_out_of_scope", "disclaimer"} <= body.keys()
    # DepartmentSuggestionDto: dept_id, dept_name, reason
    assert {"dept_id", "dept_name", "reason"} <= body["suggested_department"].keys()


def test_chat_emergency_intent_over_http():
    body = client.post("/api/v1/ai/chat/message", json={"message": "dot quy"}).json()
    assert body["intent"] == "EMERGENCY"
    assert "115" in body["reply"]


def test_diagnosis_response_fields_match_java_dto():
    res = client.post("/api/v1/ai/clinical/suggest-diagnosis",
                      json={"symptoms": "đau đầu, HA 170/100", "patient_age": 50})
    assert res.status_code == 200
    body = res.json()
    # DiagnosisSuggestionResponse: suggestions, total_suggestions, confidence_score, disclaimer
    assert {"suggestions", "total_suggestions", "confidence_score", "disclaimer"} <= body.keys()
    assert {"code", "name", "confidence", "reason"} <= body["suggestions"][0].keys()


@pytest.mark.parametrize("age", [-5, 200])
def test_diagnosis_rejects_invalid_age(age):
    res = client.post("/api/v1/ai/clinical/suggest-diagnosis", json={"symptoms": "đau đầu", "patient_age": age})
    assert res.status_code == 422


def test_drug_item_active_ingredient_snake_case_is_used():
    # DrugItemDto.activeIngredient phải được serialize thành "active_ingredient"
    res = client.post("/api/v1/ai/clinical/check-interaction", json={"drugs": [
        {"id": 1, "name": "Klacid 500mg", "active_ingredient": "Clarithromycin"},
        {"id": 2, "name": "Lanoxin", "active_ingredient": "Digoxin"},
    ]})
    assert res.status_code == 200
    body = res.json()
    assert body["has_critical"] is True
    assert {"drug_a_id", "drug_a_name", "drug_b_id", "drug_b_name", "severity"} <= body["interactions"][0].keys()


def test_prescription_safety_fields():
    res = client.post("/api/v1/ai/clinical/check-prescription-safety", json={
        "patient_allergies": [{"allergen": "Penicilin", "severity": "SEVERE"}],
        "drugs": [{"id": 1, "name": "Ceftriaxon 1g"}],
    })
    body = res.json()
    assert {"is_safe", "has_warning", "has_critical", "interaction_count", "allergy_count",
            "interactions", "allergy_alerts", "confidence_score", "disclaimer"} <= body.keys()
    assert body["has_critical"] is True
    assert body["allergy_alerts"][0]["reaction_type"] == "CROSS_REACTIVITY"


def test_health_reports_status_and_ml_model():
    """Health check báo UP và cho biết mô hình ML đã nạp chưa; lifespan (không còn on_event) khởi động được."""
    with TestClient(app) as client:  # vào/ra lifespan
        body = client.get("/health").json()
    assert body["status"] == "UP"
    assert isinstance(body["mlModelLoaded"], bool)
