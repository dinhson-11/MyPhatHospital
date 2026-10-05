package com.hospital.hmsai.security;

import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Service đánh giá quyền sở hữu dữ liệu cá nhân (Self-Access Boundary)
 * theo chuẩn RBAC của hệ thống y tế HMS-AI.
 * Được gọi trực tiếp trong các biểu thức SpEL của @PreAuthorize:
 * Ví dụ: @PreAuthorize("hasRole('ADMIN') or @securityService.isCurrentPatient(#id, authentication)")
 */
@Component("securityService")
@RequiredArgsConstructor
@Slf4j
public class SecurityService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    private final InvoiceRepository invoiceRepository;
    private final PrescriptionRepository prescriptionRepository;

    /**
     * Kiểm tra người dùng đăng nhập có phải là bệnh nhân sở hữu hồ sơ bệnh án patientId không.
     */
    public boolean isCurrentPatient(Long patientId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || patientId == null) {
            return false;
        }
        String currentUsername = authentication.getName();
        return patientRepository.findById(patientId)
                .map(patient -> patient.getUser() != null && currentUsername.equalsIgnoreCase(patient.getUser().getUsername()))
                .orElse(false);
    }

    /**
     * Kiểm tra lịch hẹn có thuộc về tài khoản bệnh nhân đang đăng nhập không.
     */
    public boolean isAppointmentOwner(Long appointmentId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || appointmentId == null) {
            return false;
        }
        String currentUsername = authentication.getName();
        return appointmentRepository.findById(appointmentId)
                .map(appointment -> appointment.getPatient() != null &&
                        appointment.getPatient().getUser() != null &&
                        currentUsername.equalsIgnoreCase(appointment.getPatient().getUser().getUsername()))
                .orElse(false);
    }

    /**
     * Kiểm tra lượt khám (Visit) có thuộc về bệnh nhân đang đăng nhập không.
     */
    public boolean isVisitPatient(Long visitId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || visitId == null) {
            return false;
        }
        String currentUsername = authentication.getName();
        return visitRepository.findById(visitId)
                .map(visit -> visit.getPatient() != null &&
                        visit.getPatient().getUser() != null &&
                        currentUsername.equalsIgnoreCase(visit.getPatient().getUser().getUsername()))
                .orElse(false);
    }

    /**
     * Kiểm tra hóa đơn viện phí có thuộc về bệnh nhân đang đăng nhập không.
     */
    public boolean isInvoicePatient(Long invoiceId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || invoiceId == null) {
            return false;
        }
        String currentUsername = authentication.getName();
        return invoiceRepository.findById(invoiceId)
                .map(invoice -> invoice.getPatient() != null &&
                        invoice.getPatient().getUser() != null &&
                        currentUsername.equalsIgnoreCase(invoice.getPatient().getUser().getUsername()))
                .orElse(false);
    }

    /**
     * Kiểm tra đơn thuốc có thuộc về lượt khám của bệnh nhân đang đăng nhập không.
     */
    public boolean isPrescriptionPatient(Long prescriptionId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || prescriptionId == null) {
            return false;
        }
        String currentUsername = authentication.getName();
        return prescriptionRepository.findById(prescriptionId)
                .map(prescription -> prescription.getVisit() != null &&
                        prescription.getVisit().getPatient() != null &&
                        prescription.getVisit().getPatient().getUser() != null &&
                        currentUsername.equalsIgnoreCase(prescription.getVisit().getPatient().getUser().getUsername()))
                .orElse(false);
    }
}
