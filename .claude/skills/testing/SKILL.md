---
name: testing
description: Viết unit test và integration test cho dự án HMS-AI. Sử dụng khi cần viết test cho service, controller, hoặc test tích hợp.
---

# Skill: Viết Test (Unit + Integration)

## Khi nào dùng
Sử dụng khi cần viết test cho service layer, controller layer, hoặc integration test cho các luồng chính.

## Tech Stack Test
- **JUnit 5** – framework test
- **Mockito** – mock dependencies
- **MockMvc** – test controller (Spring MVC Test)
- **@SpringBootTest** – integration test
- **Testcontainers** (optional) – MySQL container cho integration test

## Cấu trúc Test
```
src/test/java/com/hospital/hmsai/
├── auth/
│   ├── service/AuthServiceTest.java
│   └── controller/AuthControllerTest.java
├── patient/
│   ├── service/PatientServiceTest.java
│   └── controller/PatientControllerTest.java
├── clinical/
│   └── service/PrescriptionServiceTest.java
├── ai/
│   └── service/AiClientServiceTest.java
└── integration/
    ├── AppointmentFlowTest.java
    └── PrescriptionAiWarningFlowTest.java
```

## Unit Test – Service Layer

```java
@ExtendWith(MockitoExtension.class)
class PatientServiceImplTest {

    @Mock
    private PatientRepository patientRepository;
    
    @InjectMocks
    private PatientServiceImpl patientService;
    
    @Test
    @DisplayName("Tạo bệnh nhân thành công")
    void createPatient_Success() {
        // Given
        CreatePatientRequest request = CreatePatientRequest.builder()
                .fullName("Nguyễn Văn A")
                .phone("0901234567")
                .build();
        Patient savedPatient = Patient.builder().id(1L).fullName("Nguyễn Văn A").build();
        when(patientRepository.save(any(Patient.class))).thenReturn(savedPatient);
        
        // When
        PatientResponse result = patientService.create(request);
        
        // Then
        assertNotNull(result);
        assertEquals("Nguyễn Văn A", result.getFullName());
        verify(patientRepository).save(any(Patient.class));
    }
    
    @Test
    @DisplayName("Tìm bệnh nhân không tồn tại → throw exception")
    void getById_NotFound_ThrowsException() {
        when(patientRepository.findById(999L)).thenReturn(Optional.empty());
        
        assertThrows(ResourceNotFoundException.class, 
                () -> patientService.getById(999L));
    }
}
```

## Unit Test – Controller Layer (MockMvc)

```java
@WebMvcTest(PatientController.class)
@Import(SecurityConfig.class)  // import security config
class PatientControllerTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private PatientService patientService;
    
    @Test
    @WithMockUser(roles = "RECEPTIONIST")
    @DisplayName("POST /api/v1/patients - tạo bệnh nhân thành công")
    void createPatient_Authorized() throws Exception {
        PatientResponse response = PatientResponse.builder()
                .id(1L).fullName("Nguyễn Văn A").build();
        when(patientService.create(any())).thenReturn(response);
        
        mockMvc.perform(post("/api/v1/patients")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Nguyễn Văn A\",\"phone\":\"0901234567\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Văn A"));
    }
    
    @Test
    @WithMockUser(roles = "PATIENT")
    @DisplayName("POST /api/v1/patients - bệnh nhân không có quyền tạo → 403")
    void createPatient_Forbidden() throws Exception {
        mockMvc.perform(post("/api/v1/patients")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Test\"}"))
                .andExpect(status().isForbidden());
    }
}
```

## Integration Test – Luồng chính

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Transactional  // rollback sau mỗi test
class PrescriptionAiWarningFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private PatientRepository patientRepository;
    
    @Test
    @DisplayName("Kê đơn 2 thuốc tương tác → nhận cảnh báo AI")
    void prescriptionWithDrugInteraction_ReturnsWarning() {
        // 1. Tạo bệnh nhân
        // 2. Tạo lượt khám
        // 3. Kê đơn với 2 thuốc có tương tác
        // 4. Assert: response chứa warning
        // 5. Assert: ai_clinical_suggestions có record mới
    }
}
```

## Test AI Service (Python – pytest)

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_check_interaction_with_warning():
    response = client.post("/api/v1/ai/check-interaction", 
                          json={"drug_ids": [12, 27]})
    assert response.status_code == 200
    data = response.json()
    assert data["has_warning"] == True
    assert "disclaimer" in data

def test_check_interaction_no_warning():
    response = client.post("/api/v1/ai/check-interaction", 
                          json={"drug_ids": [1, 2]})
    assert response.status_code == 200
    assert response.json()["has_warning"] == False

def test_chat_emergency_symptoms():
    """Triệu chứng cấp cứu → khuyến nghị cấp cứu"""
    response = client.post("/api/v1/ai/chat/sessions/1/messages",
                          json={"message": "Tôi bị đau ngực dữ dội khó thở"})
    assert response.status_code == 200
    data = response.json()
    assert "cấp cứu" in data["data"]["reply"].lower() or \
           "115" in data["data"]["reply"]
```

## Checklist
- [ ] Service test: mock repository, test happy path + edge cases
- [ ] Controller test: test phân quyền (authorized + forbidden)
- [ ] Controller test: test validation (invalid input → 400)
- [ ] AI warning test: đơn có tương tác → có cảnh báo
- [ ] AI warning test: đơn không tương tác → không cảnh báo
- [ ] AI allergy test: thuốc trùng dị ứng → cảnh báo
- [ ] Integration test: luồng đặt lịch → khám → kê đơn → AI → thanh toán
- [ ] Test name mô tả rõ ràng (`@DisplayName` tiếng Việt OK)
