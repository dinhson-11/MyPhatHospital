package com.hospital.hmsai.security;

import com.hospital.hmsai.billing.dto.BillingShiftSummaryResponse;
import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import com.hospital.hmsai.billing.service.InvoiceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phân quyền và kiểm tra dữ liệu đầu vào cho các API viện phí.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BillingSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvoiceService invoiceService;

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("BILL-SEC-01: Bệnh nhân không được tự xác nhận thanh toán")
    void patientCannotPay() throws Exception {
        mockMvc.perform(put("/api/v1/invoices/1/pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentMethod\":\"CASH\",\"amountReceived\":500000}"))
                .andExpect(status().isForbidden());
        verify(invoiceService, never()).payInvoice(anyLong(), any(), any());
    }

    @Test
    @WithMockUser(username = "benhnhan", roles = {"PATIENT"})
    @DisplayName("BILL-SEC-02: Bệnh nhân không xem được danh sách hóa đơn toàn viện")
    void patientCannotListInvoices() throws Exception {
        mockMvc.perform(get("/api/v1/invoices"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "ketoan", roles = {"ACCOUNTANT"})
    @DisplayName("BILL-SEC-03: Kế toán không được hoàn tiền (chỉ Quản trị viên)")
    void accountantCannotRefund() throws Exception {
        mockMvc.perform(patch("/api/v1/invoices/1/refund")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Thu trùng hai lần\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("BILL-SEC-04: Quản trị viên hoàn tiền có lý do")
    void adminCanRefund() throws Exception {
        when(invoiceService.refundInvoice(anyLong(), anyString(), any()))
                .thenReturn(InvoiceResponse.builder().id(1L).status(InvoiceStatus.REFUNDED).build());

        mockMvc.perform(patch("/api/v1/invoices/1/refund")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Thu trùng hai lần\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUNDED"));
    }

    @Test
    @WithMockUser(username = "ketoan", roles = {"ACCOUNTANT"})
    @DisplayName("BILL-SEC-05: Hủy hóa đơn bắt buộc có lý do")
    void cancelRequiresReason() throws Exception {
        mockMvc.perform(patch("/api/v1/invoices/1/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(username = "ketoan", roles = {"ACCOUNTANT"})
    @DisplayName("BILL-SEC-06: Phương thức thanh toán không hợp lệ trả 400 thay vì 500")
    void invalidPaymentMethodReturns400() throws Exception {
        mockMvc.perform(put("/api/v1/invoices/1/pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentMethod\":\"BITCOIN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MALFORMED_REQUEST"));
    }

    @Test
    @WithMockUser(username = "ketoan", roles = {"ACCOUNTANT"})
    @DisplayName("BILL-SEC-07: Mã giao dịch chứa ký tự lạ bị từ chối")
    void invalidTransactionCodeRejected() throws Exception {
        mockMvc.perform(put("/api/v1/invoices/1/pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentMethod\":\"VIETQR\",\"transactionCode\":\"<script>\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "ketoan", roles = {"ACCOUNTANT"})
    @DisplayName("BILL-SEC-08: Kế toán xem được tổng hợp đối soát ca")
    void accountantCanViewShiftSummary() throws Exception {
        when(invoiceService.getShiftSummary(any())).thenReturn(BillingShiftSummaryResponse.builder().paidCount(3).build());

        mockMvc.perform(get("/api/v1/invoices/summary").param("date", "2026-10-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paidCount").value(3));
    }

    @Test
    @WithMockUser(username = "dieuduong", roles = {"NURSE"})
    @DisplayName("BILL-SEC-09: Điều dưỡng không xem được hóa đơn")
    void nurseCannotViewInvoice() throws Exception {
        mockMvc.perform(get("/api/v1/invoices/1"))
                .andExpect(status().isForbidden());
    }
}
