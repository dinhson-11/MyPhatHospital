# Multi-stage build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve
COPY src ./src
RUN mvn clean package -DskipTests

# Bản Ubuntu (không dùng -alpine): 17-jre-alpine không có image ARM64 nên không chạy được trên Oracle Ampere A1
FROM eclipse-temurin:17-jre
# wget dùng cho healthcheck trong docker-compose.yml và scripts/deploy/oracle-setup.sh
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Giờ Việt Nam cho toàn bộ ứng dụng (LocalDateTime.now(), "hôm nay" trong báo cáo, ghi nhận giờ thu tiền).
# Không đặt thì container chạy UTC và lệch 7 giờ.
ENV TZ=Asia/Ho_Chi_Minh
ENV JAVA_TOOL_OPTIONS="-Duser.timezone=Asia/Ho_Chi_Minh"
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
