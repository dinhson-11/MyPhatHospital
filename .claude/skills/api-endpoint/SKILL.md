---
name: api-endpoint
description: Tạo REST API endpoint mới cho backend Spring Boot. Sử dụng khi cần thêm API mới hoặc cần tham chiếu chuẩn API design.
---

# Skill: Tạo REST API Endpoint

## Khi nào dùng
Sử dụng khi cần tạo API endpoint mới, đảm bảo tuân thủ chuẩn API đã thiết kế trong `02_API_Design.md`.

## Chuẩn Response

### Success Response
```java
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;
    
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, "OK");
    }
    
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message);
    }
}
```

### Error Response
```java
public class ApiErrorResponse {
    private boolean success = false;
    private String errorCode;
    private String message;
    private List<String> details;
}
```

### Phân trang
```java
@GetMapping
public ResponseEntity<ApiResponse<Page<PatientResponse>>> getAll(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt,desc") String sort) {
    Pageable pageable = PageRequest.of(page, size, Sort.by(...));
    return ResponseEntity.ok(ApiResponse.success(service.getAll(pageable)));
}
```

## Phân quyền theo Role
Tham chiếu `02_API_Design.md` cho role chính xác của mỗi endpoint:

| Module | Roles chính |
|---|---|
| Auth | Public (register, login) |
| Users | ADMIN |
| Patients | RECEPTIONIST, DOCTOR, ADMIN, PATIENT(self) |
| Appointments | PATIENT, RECEPTIONIST, DOCTOR |
| Visits/Prescriptions | DOCTOR, NURSE, PHARMACIST |
| Drugs/Pharmacy | PHARMACIST, DOCTOR, ADMIN |
| Invoices | ACCOUNTANT, PATIENT(self) |
| Staff/Schedules | ADMIN |
| Reports | ADMIN, DOCTOR, ACCOUNTANT |
| AI Chat | PATIENT, Public(guest) |
| AI Clinical | DOCTOR, ADMIN |

## Template Controller Method

```java
@PostMapping
@PreAuthorize("hasRole('DOCTOR')")
@Operation(summary = "Mô tả ngắn gọn", description = "Mô tả chi tiết")
public ResponseEntity<ApiResponse<VisitResponse>> create(
        @Valid @RequestBody CreateVisitRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
    log.info("Creating visit for patient: {}", request.getPatientId());
    VisitResponse response = visitService.create(request, userDetails);
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "Tạo lượt khám thành công"));
}
```

## HTTP Status Codes
- `200 OK` – GET thành công, PUT/PATCH cập nhật thành công
- `201 Created` – POST tạo mới thành công
- `204 No Content` – DELETE thành công
- `400 Bad Request` – Dữ liệu đầu vào không hợp lệ
- `401 Unauthorized` – Chưa đăng nhập / token hết hạn
- `403 Forbidden` – Không đủ quyền
- `404 Not Found` – Resource không tồn tại
- `409 Conflict` – Xung đột dữ liệu (trùng lịch, trùng username)
- `500 Internal Server Error` – Lỗi hệ thống

## Checklist
- [ ] Endpoint path khớp `02_API_Design.md`
- [ ] Role phân quyền đúng
- [ ] Request DTO có `@Valid` + Bean Validation
- [ ] Response dùng `ApiResponse<T>` wrapper
- [ ] Swagger annotations (`@Operation`, `@Tag`)
- [ ] Error cases trả đúng HTTP status
- [ ] Logging ở controller/service
- [ ] Phân trang cho list endpoints
