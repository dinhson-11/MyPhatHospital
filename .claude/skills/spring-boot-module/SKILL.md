---
name: spring-boot-module
description: Tạo module mới trong Spring Boot backend (entity, repository, service, controller, DTO). Sử dụng khi cần thêm module/tính năng mới cho backend.
---

# Skill: Tạo Module Spring Boot mới

## Khi nào dùng
Sử dụng skill này khi cần tạo một module mới hoàn chỉnh trong backend Spring Boot (ví dụ: patient, appointment, billing...).

## Quy trình thực hiện

### Bước 1: Tạo cấu trúc thư mục
Tạo package mới dưới `com.hospital.hmsai.<module_name>/` với cấu trúc:
```
<module_name>/
├── entity/
│   └── <EntityName>.java
├── repository/
│   └── <EntityName>Repository.java
├── service/
│   ├── <EntityName>Service.java          (interface)
│   └── impl/
│       └── <EntityName>ServiceImpl.java  (implementation)
├── controller/
│   └── <EntityName>Controller.java
└── dto/
    ├── <EntityName>Request.java
    └── <EntityName>Response.java
```

### Bước 2: Entity
```java
@Entity
@Table(name = "<table_name>")   // snake_case, số nhiều
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class <EntityName> {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ... fields theo 03_DB_Design.md
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")  
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    
    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
```

### Bước 3: Repository
```java
@Repository
public interface <EntityName>Repository extends JpaRepository<<EntityName>, Long> {
    // Custom query methods
}
```

### Bước 4: Service Interface + Implementation
```java
// Interface
public interface <EntityName>Service {
    <EntityName>Response create(<EntityName>Request request);
    <EntityName>Response getById(Long id);
    Page<<EntityName>Response> getAll(Pageable pageable);
    <EntityName>Response update(Long id, <EntityName>Request request);
    void delete(Long id);  // soft delete
}

// Implementation
@Service @RequiredArgsConstructor @Slf4j
public class <EntityName>ServiceImpl implements <EntityName>Service {
    private final <EntityName>Repository repository;
    // implement methods...
}
```

### Bước 5: Controller
```java
@RestController
@RequestMapping("/api/v1/<endpoint>")
@RequiredArgsConstructor
@Tag(name = "<Module Name>", description = "APIs for ...")
public class <EntityName>Controller {
    private final <EntityName>Service service;
    
    @PostMapping
    @PreAuthorize("hasRole('...')")
    public ResponseEntity<ApiResponse<<EntityName>Response>> create(
            @Valid @RequestBody <EntityName>Request request) {
        return ResponseEntity.ok(ApiResponse.success(service.create(request)));
    }
    // ... other endpoints
}
```

### Bước 6: DTO
- Request DTO: dùng `@NotNull`, `@NotBlank`, `@Size`, `@Email`, `@Pattern` cho validation.
- Response DTO: chỉ chứa các field cần thiết cho client, KHÔNG expose entity trực tiếp.

### Bước 7: Kiểm tra
- Đảm bảo endpoint khớp với `02_API_Design.md`.
- Đảm bảo entity khớp với `03_DB_Design.md`.
- Đảm bảo role phân quyền đúng theo SRS (`01_SRS.md`).

## Checklist
- [ ] Entity có `@PrePersist` / `@PreUpdate` cho timestamps
- [ ] Repository extends `JpaRepository`
- [ ] Service có interface + impl, dùng `@Transactional` cho write operations
- [ ] Controller có `@PreAuthorize` với đúng role
- [ ] DTO có Bean Validation annotations
- [ ] Response dùng `ApiResponse<T>` wrapper
- [ ] Exception cases throw custom exceptions (handled by `@ControllerAdvice`)
- [ ] Logging (`log.info/warn/error`) ở service layer
