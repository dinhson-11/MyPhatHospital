"""
HMS-AI – AI Service
FastAPI application for AI-powered clinical features:
- Chatbot tư vấn bệnh nhân
- Drug interaction checker
- Diagnosis suggestion
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, chat, drug_interaction, diagnosis

app = FastAPI(
    title="HMS-AI – AI Service",
    description="AI Service cho Hệ thống Quản lý Bệnh viện: Chatbot, Cảnh báo tương tác thuốc, Gợi ý chẩn đoán",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # React dev
        "http://localhost:5173",    # Vite dev
        "http://localhost:8080",    # Spring Boot backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(drug_interaction.router)
app.include_router(diagnosis.router)


@app.on_event("startup")
async def startup_event():
    print("🏥 HMS-AI Service started successfully!")
