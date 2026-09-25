# Rule: Code Style & Architecture

## Java (Spring Boot Backend)

### Layered Architecture – BẮT BUỘC
Mọi module PHẢI tuân thủ cấu trúc phân lớp:
```
Controller → Service (interface) → ServiceImpl → Repository → Entity
```
- **Controller**: Chỉ xử lý HTTP request/response, validation, phân quyền. KHÔNG chứa business logic.
- **Service**: Chứa business logic. Dùng interface + implementation.
- **Repository**: Extends `JpaRepository`. KHÔNG viết native query trừ khi JPA derived query không đáp ứng.
- **Entity**: Map 1-1 với bảng DB. KHÔNG trả Entity trực tiếp qua API, luôn dùng DTO.

### Naming Conventions
- **Package**: `com.hospital.hmsai.<module>` (lowercase)
- **Entity class**: PascalCase, số ít (`Patient`, `Appointment`)
- **Table name**: snake_case, số nhiều (`patients`, `appointments`)
- **Repository**: `<Entity>Repository`
- **Service**: `<Entity>Service` (interface), `<Entity>ServiceImpl`
- **Controller**: `<Entity>Controller`
- **DTO**: `<Action><Entity>Request`, `<Entity>Response` (vd: `CreatePatientRequest`, `PatientResponse`)
- **Constants**: UPPER_SNAKE_CASE

### Annotations bắt buộc
- Entity: `@Entity`, `@Table`, `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`
- Service: `@Service`, `@RequiredArgsConstructor`, `@Slf4j`, `@Transactional` (cho write)
- Controller: `@RestController`, `@RequestMapping`, `@RequiredArgsConstructor`, `@Tag` (Swagger)
- Repository: `@Repository`

### Error Handling
- Custom exceptions: `ResourceNotFoundException`, `BusinessException`, `DuplicateResourceException`
- Xử lý tập trung qua `@RestControllerAdvice`
- KHÔNG dùng generic `Exception` catch trong controller

## Python (AI Service)

### Style
- Type hints cho mọi function
- Pydantic models cho request/response
- `async def` cho FastAPI endpoints
- Docstrings cho public functions
- Constants trong file `constants.py`

### Error Handling
- Custom HTTPException với detail message rõ ràng
- Logging dùng `logging` module
- KHÔNG để exception leak ra client dạng traceback
