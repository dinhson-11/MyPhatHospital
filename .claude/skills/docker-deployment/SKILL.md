---
name: docker-deployment
description: Cấu hình Docker và Docker Compose cho triển khai dự án HMS-AI. Sử dụng khi cần tạo Dockerfile, docker-compose, hoặc cấu hình deployment.
---

# Skill: Docker & Deployment

## Khi nào dùng
Sử dụng khi cần:
- Tạo Dockerfile cho backend hoặc AI service
- Cấu hình Docker Compose cho toàn hệ thống
- Setup môi trường dev/prod

## Kiến trúc triển khai
```
┌─────────────┐     ┌──────────────────┐     ┌────────────┐
│ Nginx:80/443│────▶│ Backend:8080     │────▶│ MySQL:3306 │
└─────────────┘     └──────────────────┘     └────────────┘
       │                     │
       │                     ▼
       │            ┌──────────────────┐
       └───────────▶│ AI Service:8000  │
                    └──────────────────┘
```

## Dockerfile – Backend (Spring Boot)

```dockerfile
# Multi-stage build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
```

## Dockerfile – AI Service (FastAPI)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: hmsai-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: hmsai_db
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: hmsai-backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/hmsai_db?useSSL=false&allowPublicKeyRetrieval=true
      SPRING_DATASOURCE_USERNAME: ${MYSQL_USER}
      SPRING_DATASOURCE_PASSWORD: ${MYSQL_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      AI_SERVICE_URL: http://ai-service:8000
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy

  ai-service:
    build: ./ai-service
    container_name: hmsai-ai
    environment:
      DATABASE_URL: mysql+pymysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/hmsai_db
      LLM_API_KEY: ${LLM_API_KEY:-}
    ports:
      - "8000:8000"

  nginx:
    image: nginx:alpine
    container_name: hmsai-nginx
    volumes:
      - ./frontend/build:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    ports:
      - "80:80"
    depends_on:
      - backend
      - ai-service

volumes:
  mysql_data:
```

## .env file (KHÔNG commit vào Git)
```env
MYSQL_ROOT_PASSWORD=root_password_here
MYSQL_USER=hmsai_user
MYSQL_PASSWORD=hmsai_password
JWT_SECRET=your-256-bit-secret-key-here
LLM_API_KEY=optional-openai-key
```

## nginx.conf
```nginx
server {
    listen 80;
    server_name localhost;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;  # SPA routing
    }
    
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/v1/ai/ {
        proxy_pass http://ai-service:8000;
        proxy_set_header Host $host;
        proxy_read_timeout 10s;  # AI timeout
    }
}
```

## Commands
```bash
# Build & start all services
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f ai-service

# Stop
docker-compose down

# Reset database
docker-compose down -v  # xóa volume
docker-compose up -d
```

## Checklist
- [ ] Dockerfile multi-stage build (giảm image size)
- [ ] Environment variables cho secrets (KHÔNG hardcode)
- [ ] `.env` file trong `.gitignore`
- [ ] MySQL healthcheck trước khi backend start
- [ ] Nginx reverse proxy cho frontend + backend + AI
- [ ] Volume cho MySQL data persistence
- [ ] AI service timeout cấu hình hợp lý
