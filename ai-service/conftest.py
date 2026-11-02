"""
Cấu hình chung cho pytest của AI Service.

File mô hình (*.joblib) bị .gitignore nên không có sau khi clone; một số test cần mô hình đã huấn luyện.
Fixture bên dưới tự huấn luyện (~7 giây) khi thiếu file, giống bước `python train_model.py` trong CI và Dockerfile.
"""

import os

import pytest

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "trained_triage_model.joblib")


@pytest.fixture(scope="session", autouse=True)
def trained_triage_model():
    if not os.path.exists(MODEL_PATH):
        from train_model import train_and_save_model
        train_and_save_model(MODEL_PATH)
    return MODEL_PATH
