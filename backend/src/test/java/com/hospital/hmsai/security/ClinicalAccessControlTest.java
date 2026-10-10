package com.hospital.hmsai.security;

import com.hospital.hmsai.appointment.dto.AppointmentResponse;
import com.hospital.hmsai.appointment.dto.CreateAppointmentRequest;
import com.hospital.hmsai.appointment.entity.AppointmentSource;
import com.hospital.hmsai.appointment.service.AppointmentService;
import com.hospital.hmsai.clinical.dto.CreateVisitRequest;
import com.hospital.hmsai.clinical.dto.LabOrderResponse;
import com.hospital.hmsai.clinical.dto.PrescriptionResponse;
import com.hospital.hmsai.clinical.dto.UpdateVisitRequest;
import com.hospital.hmsai.clinical.dto.VisitResponse;
import com.hospital.hmsai.clinical.safety.PrescriptionSafetyException;
import com.hospital.hmsai.clinical.service.LabOrderService;
import com.hospital.hmsai.clinical.service.VisitService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử phân quyền theo quyền sở hữu dữ liệu (IDOR) và hợp đồng API an toàn kê đơn ở tầng HTTP.
 * SecurityService được mock để điều khiển kết quả kiểm tra sở hữu.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClinicalAccessControlTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SecurityService securityService;

    @MockBean
    private VisitService visitService;

    @MockBean
    private LabOrderService labOrderService;

    @MockBean
    private AppointmentService appointmentService;

    private static final String PRESCRIPTION_BODY =
            "{\"items\":[{\"drugId\":3,\"dosage\":\"1 viên\",\"quantity\":10}]}";

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("Bệnh nhân xem được lượt khám, đơn thuốc, chỉ định CLS của chính mình")
    void patientOwner_CanReadOwnClinicalData() throws Exception {
        when(securityService.isVisitPatient(eq(5L), any())).thenReturn(true);
        when(securityService.isLabOrderPatient(eq(6L), any())).thenReturn(true);
        when(visitService.getVisitById(5L)).thenReturn(VisitResponse.builder().id(5L).build());
        when(visitService.getPrescriptionsByVisitId(5L)).thenReturn(List.of());
        when(labOrderService.getOrderById(6L)).thenReturn(LabOrderResponse.builder().id(6L).build());

        mockMvc.perform(get("/api/v1/visits/5")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/visits/5/prescriptions")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/lab-orders/6")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("IDOR: bệnh nhân không sở hữu bản ghi → 403 với lượt khám, đơn thuốc, CLS, cấp phát, lịch hẹn")
    void patientNotOwner_Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/visits/5")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/visits/5/prescriptions")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/visits/5/lab-orders")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/lab-orders/5")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/prescriptions/5/dispense")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/prescriptions/5/is-dispensed")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/appointments/5")).andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/appointments/5/cancel")).andExpect(status().isForbidden());

        verify(visitService, never()).getVisitById(any());
        verify(visitService, never()).getPrescriptionsByVisitId(any());
        verify(labOrderService, never()).getOrderById(any());
        verify(appointmentService, never()).cancel(any(), any());
        verify(securityService, times(3)).isVisitPatient(eq(5L), any());
        verify(securityService).isLabOrderPatient(eq(5L), any());
        verify(securityService, times(2)).isPrescriptionPatient(eq(5L), any());
        verify(securityService, times(2)).isAppointmentOwner(eq(5L), any());
    }

    @Test
    @WithMockUser(username = "bacsi-khac", roles = {"DOCTOR"})
    @DisplayName("Bác sĩ không phụ trách lượt khám không được sửa chẩn đoán, kê đơn, chỉ định CLS, hoàn tất → 403")
    void nonAssignedDoctor_CannotMutateVisit() throws Exception {
        mockMvc.perform(post("/api/v1/visits/5/prescriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRESCRIPTION_BODY))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/visits/5/lab-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"testType\":\"Công thức máu\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/visits/5/complete")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/visits/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"diagnosisCode\":\"I10\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(visitService);
    }

    @Test
    @WithMockUser(username = "bacsi", roles = {"DOCTOR"})
    @DisplayName("Bác sĩ phụ trách lượt khám được kê đơn")
    void assignedDoctor_CanPrescribe() throws Exception {
        when(securityService.isVisitDoctor(eq(5L), any())).thenReturn(true);
        when(visitService.createPrescription(eq(5L), any())).thenReturn(PrescriptionResponse.builder().id(77L).build());

        mockMvc.perform(post("/api/v1/visits/5/prescriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRESCRIPTION_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(77));
    }

    @Test
    @WithMockUser(username = "bacsi", roles = {"DOCTOR"})
    @DisplayName("Hợp đồng API: đơn thuốc bị chặn → 400 PRESCRIPTION_SAFETY_BLOCK kèm danh sách cảnh báo")
    void prescriptionSafetyBlock_ContractForFrontend() throws Exception {
        when(securityService.isVisitDoctor(eq(5L), any())).thenReturn(true);
        when(visitService.createPrescription(eq(5L), any())).thenThrow(new PrescriptionSafetyException(
                List.of("Tương tác thuốc nghiêm trọng: Aspirin 81mg + Warfarin 5mg")));

        mockMvc.perform(post("/api/v1/visits/5/prescriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRESCRIPTION_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("PRESCRIPTION_SAFETY_BLOCK"))
                .andExpect(jsonPath("$.message").value("Đơn thuốc có cảnh báo nghiêm trọng – cần bác sĩ xác nhận lý do kê đơn"))
                .andExpect(jsonPath("$.details[0]").value("Tương tác thuốc nghiêm trọng: Aspirin 81mg + Warfarin 5mg"));
    }

    @Test
    @WithMockUser(username = "bacsi", roles = {"DOCTOR"})
    @DisplayName("overrideReason quá 500 ký tự → 400 VALIDATION_ERROR")
    void overrideReasonTooLong_ValidationError() throws Exception {
        when(securityService.isVisitDoctor(eq(5L), any())).thenReturn(true);
        String body = "{\"items\":[{\"drugId\":3,\"dosage\":\"1 viên\",\"quantity\":1}],\"overrideReason\":\""
                + "x".repeat(501) + "\"}";

        mockMvc.perform(post("/api/v1/visits/5/prescriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
        verify(visitService, never()).createPrescription(any(), any());
    }

    @Test
    @WithMockUser(username = "dieuduong", roles = {"NURSE"})
    @DisplayName("Điều dưỡng cập nhật lượt khám ở chế độ chỉ sinh hiệu")
    void nurseUpdate_IsVitalsOnly() throws Exception {
        when(visitService.updateVisit(eq(5L), any(UpdateVisitRequest.class), anyBoolean()))
                .thenReturn(VisitResponse.builder().id(5L).build());

        mockMvc.perform(put("/api/v1/visits/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vitalSigns\":{\"pulse\":90}}"))
                .andExpect(status().isOk());

        verify(visitService).updateVisit(eq(5L), any(UpdateVisitRequest.class), eq(true));
    }

    @Test
    @WithMockUser(username = "dieuduong", roles = {"NURSE"})
    @DisplayName("Sinh hiệu ngoài ngưỡng bị từ chối 400 trước khi vào service")
    void invalidVitals_Rejected() throws Exception {
        mockMvc.perform(put("/api/v1/visits/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vitalSigns\":{\"bloodPressureSystolic\":80,\"bloodPressureDiastolic\":90}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
        verify(visitService, never()).updateVisit(any(), any(), anyBoolean());
    }

    @Test
    @WithMockUser(username = "bacsi", roles = {"DOCTOR"})
    @DisplayName("Bác sĩ phụ trách cập nhật đầy đủ (chẩn đoán + sinh hiệu)")
    void assignedDoctorUpdate_IsFullEdit() throws Exception {
        when(securityService.isVisitDoctor(eq(5L), any())).thenReturn(true);
        when(visitService.updateVisit(eq(5L), any(UpdateVisitRequest.class), anyBoolean()))
                .thenReturn(VisitResponse.builder().id(5L).build());

        mockMvc.perform(put("/api/v1/visits/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"diagnosisCode\":\"I10\"}"))
                .andExpect(status().isOk());

        verify(visitService).updateVisit(eq(5L), any(UpdateVisitRequest.class), eq(false));
    }

    @Test
    @WithMockUser(username = "letan", roles = {"RECEPTIONIST"})
    @DisplayName("Lễ tân tạo lượt khám: chẩn đoán gửi lên bị bỏ qua")
    void receptionistCreateVisit_DiagnosisNulledOut() throws Exception {
        when(visitService.createVisit(any())).thenReturn(VisitResponse.builder().id(9L).build());

        mockMvc.perform(post("/api/v1/visits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":1,\"doctorId\":2,\"diagnosisCode\":\"I10\",\"diagnosisNote\":\"THA\"}"))
                .andExpect(status().isCreated());

        ArgumentCaptor<CreateVisitRequest> captor = ArgumentCaptor.forClass(CreateVisitRequest.class);
        verify(visitService).createVisit(captor.capture());
        assertNull(captor.getValue().getDiagnosisCode());
        assertNull(captor.getValue().getDiagnosisNote());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("Bệnh nhân đặt lịch: patientId bị ép về hồ sơ của chính mình, nguồn = PATIENT")
    void patientCreateAppointment_ForcedToOwnPatient() throws Exception {
        when(securityService.currentPatientId(any())).thenReturn(42L);
        when(appointmentService.create(any())).thenReturn(AppointmentResponse.builder().id(1L).patientId(42L).build());
        String scheduledAt = LocalDate.now().plusDays(7).atTime(8, 30).toString();

        mockMvc.perform(post("/api/v1/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":99,\"doctorId\":2,\"scheduledAt\":\"" + scheduledAt
                                + "\",\"source\":\"RECEPTIONIST\"}"))
                .andExpect(status().isCreated());

        ArgumentCaptor<CreateAppointmentRequest> captor = ArgumentCaptor.forClass(CreateAppointmentRequest.class);
        verify(appointmentService).create(captor.capture());
        assertEquals(42L, captor.getValue().getPatientId());
        assertEquals(AppointmentSource.PATIENT, captor.getValue().getSource());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("Tài khoản bệnh nhân chưa liên kết hồ sơ không đặt lịch được (403)")
    void patientWithoutProfile_CannotBook() throws Exception {
        when(securityService.currentPatientId(any())).thenReturn(null);
        String scheduledAt = LocalDate.now().plusDays(7).atTime(8, 30).toString();

        mockMvc.perform(post("/api/v1/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"doctorId\":2,\"scheduledAt\":\"" + scheduledAt + "\"}"))
                .andExpect(status().isForbidden());
        verify(appointmentService, never()).create(any());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("Bệnh nhân hủy được lịch hẹn của chính mình")
    void patientCancelOwnAppointment_Allowed() throws Exception {
        when(securityService.isAppointmentOwner(eq(8L), any())).thenReturn(true);
        when(appointmentService.cancel(eq(8L), any())).thenReturn(AppointmentResponse.builder().id(8L).build());

        mockMvc.perform(patch("/api/v1/appointments/8/cancel").param("reason", "Bận"))
                .andExpect(status().isOk());
    }
}
