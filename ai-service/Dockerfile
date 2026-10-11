FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# File mô hình bị .dockerignore/.gitignore loại khỏi ngữ cảnh build nên huấn luyện ngay trong image (~7 giây).
# Không có bước này, AI Service chạy bằng luật từ khóa (/health báo mlModelLoaded=false).
RUN python train_model.py > /dev/null

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
