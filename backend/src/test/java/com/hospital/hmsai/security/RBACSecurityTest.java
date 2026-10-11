package com.hospital.hmsai.security;

import com.hospital.hmsai.clinical.service.VisitService;
import com.hospital.hmsai.patient.service.PatientService;
import com.hospital.hmsai.pharmacy.service.DispenseService;
import com.hospital.hmsai.pharmacy.service.DrugService;
import com.hospital.hmsai.reporting.dto.KpiSummaryResponse;
import com.hospital.hmsai.reporting.dto.RevenueSummaryResponse;
import com.hospital.hmsai.reporting.service.ReportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import com.hospital.hmsai.hr.service.ScheduleService;
import com.hospital.hmsai.publicapi.PublicPortalService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RBACSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PatientService patientService;

    @MockBean
    private ReportService reportService;

    @MockBean
    private DispenseService dispenseService;

    @MockBean
    private DrugService drugService;

    @MockBean
    private VisitService visitService;

    @MockBean
    private ScheduleService scheduleService;

    @MockBean
    private PublicPortalService publicPortalService;

    @Test
    @DisplayName("SEC-01: Chưa đăng nhập truy cập API bảo mật bị từ chối (401 Unauthorized – để frontend làm mới token / đăng nhập lại)")
    void testUnauthenticatedAccess_Blocked() throws Exception {
        mockMvc.perform(get("/api/v1/patients"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("SEC-02: Bệnh nhân cố tình tra cứu danh sách toàn bộ bệnh nhân trả về 403 Forbidden")
    void testPatientSearchAllPatients_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/patients"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("SEC-03: Bệnh nhân cố tình truy cập xem danh sách thuốc sắp hết hạn trả về 403 Forbidden")
    void testPatientAccessExpiringDrugs_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/drugs/expiring-soon"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "bacsi", roles = {"DOCTOR"})
    @DisplayName("SEC-04: Bác sĩ cố tình cấp phát trừ kho thuốc trả về 403 Forbidden")
    void testDoctorDispenseDrugs_Returns403() throws Exception {
        mockMvc.perform(post("/api/v1/prescriptions/1/dispense")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"Thử cấp phát\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "letan", roles = {"RECEPTIONIST"})
    @DisplayName("SEC-05: Lễ tân - Kế toán cố tình thêm thuốc mới vào danh mục kho dược trả về 403 Forbidden")
    void testReceptionistCreateDrug_Returns403() throws Exception {
        mockMvc.perform(post("/api/v1/drugs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Thuốc\", \"code\": \"TH01\", \"unit\": \"Viên\", \"price\": 1000, \"stockQuantity\": 10}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "dieuduong", roles = {"NURSE"})
    @DisplayName("SEC-06: Điều dưỡng cố tình lập hóa đơn viện phí trả về 403 Forbidden")
    void testNurseGenerateInvoice_Returns403() throws Exception {
        mockMvc.perform(post("/api/v1/invoices/generate/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("SEC-07: Bệnh nhân cố tình truy cập báo cáo KPI quản trị trả về 403 Forbidden")
    void testPatientAccessKpiReport_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/reports/kpi-summary"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "letan", roles = {"RECEPTIONIST"})
    @DisplayName("SEC-08: Lễ tân - Kế toán được phép xem báo cáo doanh thu bệnh viện")
    void testReceptionistAccessRevenueReport_Allowed() throws Exception {
        when(reportService.getRevenueSummary(any(), any()))
                .thenReturn(RevenueSummaryResponse.builder().totalRevenue(BigDecimal.ZERO).build());

        mockMvc.perform(get("/api/v1/reports/revenue"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("SEC-09: Quản trị viên ADMIN được phép xem báo cáo KPI toàn viện")
    void testAdminAccessKpiReport_Allowed() throws Exception {
        when(reportService.getKpiSummary())
                .thenReturn(KpiSummaryResponse.builder().totalPatients(10).build());

        mockMvc.perform(get("/api/v1/reports/kpi-summary"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "letan", roles = {"RECEPTIONIST"})
    @DisplayName("SEC-10: Lễ tân được phép tra cứu danh sách bệnh nhân để tiếp đón")
    void testReceptionistSearchPatients_Allowed() throws Exception {
        when(patientService.search(any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/patients"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "letan", roles = {"RECEPTIONIST"})
    @DisplayName("SEC-11: Lễ tân được phép xem danh sách ca khám để điều phối hàng đợi")
    void testReceptionistViewVisits_Allowed() throws Exception {
        when(visitService.getAllVisits(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/visits"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SEC-12: Khách chưa đăng nhập không được xem lịch trực nhân viên")
    void testAnonymousViewSchedules_Blocked() throws Exception {
        mockMvc.perform(get("/api/v1/schedules"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("SEC-13: Bệnh nhân không được xem lịch trực nhân viên (403 Forbidden)")
    void testPatientViewSchedules_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/schedules"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "bacsi", roles = {"DOCTOR"})
    @DisplayName("SEC-14: Bác sĩ (nhân viên bệnh viện) được xem lịch trực")
    void testDoctorViewSchedules_Allowed() throws Exception {
        when(scheduleService.getSchedules(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/schedules"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SEC-15: Danh mục bác sĩ công khai truy cập được khi chưa đăng nhập")
    void testPublicDoctors_AnonymousAllowed() throws Exception {
        when(publicPortalService.getDoctors()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/public/doctors"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SEC-16: Đặt lịch công khai không bị chặn 403; dữ liệu thiếu bị từ chối 400 (validation)")
    void testPublicBooking_AnonymousReachesValidation() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/v1/public/appointments")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ==================== Phân quyền lâm sàng theo vai trò (không cần truy vấn CSDL) ====================

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("SEC-17: Bệnh nhân không được tự xóa dị ứng đã ghi nhận → 403")
    void testPatientDeleteAllergy_Returns403() throws Exception {
        mockMvc.perform(delete("/api/v1/patients/1/allergies/2"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "dieuduong", roles = {"NURSE"})
    @DisplayName("SEC-18: Điều dưỡng không được kê đơn, chỉ định CLS hay hoàn tất lượt khám → 403")
    void testNurseClinicalOrders_Returns403() throws Exception {
        mockMvc.perform(post("/api/v1/visits/5/prescriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"drugId\":1,\"dosage\":\"1 viên\",\"quantity\":1}]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/visits/5/lab-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"testType\":\"Công thức máu\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/visits/5/complete"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "duocsi", roles = {"PHARMACIST"})
    @DisplayName("SEC-19: Dược sĩ không xem được chi tiết lượt khám / chỉ định CLS → 403")
    void testPharmacistViewVisitDetail_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/visits/5"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/lab-orders/5"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("SEC-20: Bệnh nhân không được tự hoàn tất / xác nhận lịch hẹn → 403")
    void testPatientCompleteAppointment_Returns403() throws Exception {
        mockMvc.perform(patch("/api/v1/appointments/5/complete"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/appointments/5/confirm"))
                .andExpect(status().isForbidden());
    }
}
