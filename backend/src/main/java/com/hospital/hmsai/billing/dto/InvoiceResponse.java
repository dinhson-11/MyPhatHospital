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
    private Long patientId;
    private String patientName;
    private String patientCode;
    private Long visitId;
    private LocalDateTime visitTime;
    private String doctorName;
    private String diagnosisCode;
    private BigDecimal totalAmount;
    private InvoiceStatus status;
    private PaymentMethod paymentMethod;
    private String transactionCode;
    private LocalDateTime paidAt;
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
        if (invoice.getVisit() != null) {
            visitId = invoice.getVisit().getId();
            visitTime = invoice.getVisit().getVisitTime();
            diagnosisCode = invoice.getVisit().getDiagnosisCode();
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
                .patientId(patientId)
                .patientName(patientName)
                .patientCode(patientCode)
                .visitId(visitId)
                .visitTime(visitTime)
                .doctorName(doctorName)
                .diagnosisCode(diagnosisCode)
                .totalAmount(invoice.getTotalAmount())
                .status(invoice.getStatus())
                .paymentMethod(invoice.getPaymentMethod())
                .transactionCode(invoice.getTransactionCode())
                .paidAt(invoice.getPaidAt())
                .createdAt(invoice.getCreatedAt())
                .items(itemsList)
                .build();
    }
}
