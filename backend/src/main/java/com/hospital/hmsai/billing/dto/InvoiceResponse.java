package com.hospital.hmsai.billing.dto;

import com.hospital.hmsai.billing.entity.Invoice;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import com.hospital.hmsai.billing.entity.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {

    private Long id;
    private String invoiceCode;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private Long visitId;
    private LocalDateTime visitTime;
    private String doctorName;
    private String diagnosisCode;
    private String diagnosisNote;

    /** Tổng chi phí (trước BHYT). */
    private BigDecimal totalAmount;
    private String insuranceNumber;
    private BigDecimal insuranceRate;
    private BigDecimal insuranceAmount;
    private String insuranceNote;
    /** Số tiền người bệnh phải trả. */
    private BigDecimal patientAmount;

    private InvoiceStatus status;
    private PaymentMethod paymentMethod;
    private String transactionCode;
    private LocalDateTime paidAt;
    private BigDecimal amountReceived;
    private BigDecimal changeAmount;
    private String cashierName;
    private String note;
    private String voidReason;
    private LocalDateTime voidedAt;
    private String voidedBy;
    private LocalDateTime createdAt;
    private List<InvoiceItemResponse> items;

    public static InvoiceResponse fromEntity(Invoice invoice) {
        if (invoice == null) return null;

        String patientName = null;
        String patientCode = null;
        Long patientId = null;
        if (invoice.getPatient() != null) {
            patientId = invoice.getPatient().getId();
            patientName = invoice.getPatient().getFullName();
            patientCode = invoice.getPatient().getPatientCode();
        }

        Long visitId = null;
        LocalDateTime visitTime = null;
        String doctorName = null;
        String diagnosisCode = null;
        String diagnosisNote = null;
        if (invoice.getVisit() != null) {
            visitId = invoice.getVisit().getId();
            visitTime = invoice.getVisit().getVisitTime();
            diagnosisCode = invoice.getVisit().getDiagnosisCode();
            diagnosisNote = invoice.getVisit().getDiagnosisNote();
            if (invoice.getVisit().getDoctor() != null && invoice.getVisit().getDoctor().getUser() != null) {
                doctorName = invoice.getVisit().getDoctor().getUser().getFullName();
            }
        }

        List<InvoiceItemResponse> itemsList = Collections.emptyList();
        if (invoice.getItems() != null) {
            itemsList = invoice.getItems().stream()
                    .map(InvoiceItemResponse::fromEntity)
                    .toList();
        }

        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceCode(invoice.getInvoiceCode())
                .patientId(patientId)
                .patientName(patientName)
                .patientCode(patientCode)
                .visitId(visitId)
                .visitTime(visitTime)
                .doctorName(doctorName)
                .diagnosisCode(diagnosisCode)
                .diagnosisNote(diagnosisNote)
                .totalAmount(invoice.getTotalAmount())
                .insuranceNumber(invoice.getInsuranceNumber())
                .insuranceRate(invoice.getInsuranceRate())
                .insuranceAmount(invoice.getInsuranceAmount())
                .insuranceNote(invoice.getInsuranceNote())
                .patientAmount(invoice.getPatientAmount())
                .status(invoice.getStatus())
                .paymentMethod(invoice.getPaymentMethod())
                .transactionCode(invoice.getTransactionCode())
                .paidAt(invoice.getPaidAt())
                .amountReceived(invoice.getAmountReceived())
                .changeAmount(invoice.getChangeAmount())
                .cashierName(invoice.getCashierName())
                .note(invoice.getNote())
                .voidReason(invoice.getVoidReason())
                .voidedAt(invoice.getVoidedAt())
                .voidedBy(invoice.getVoidedBy())
                .createdAt(invoice.getCreatedAt())
                .items(itemsList)
                .build();
    }
}
