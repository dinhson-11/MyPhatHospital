package com.hospital.hmsai.security;

import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Service đánh giá quyền sở hữu dữ liệu cá nhân (Self-Access Boundary)
 * theo chuẩn RBAC của hệ thống y tế HMS-AI.
 * Được gọi trực tiếp trong các biểu thức SpEL của @PreAuthorize:
 * Ví dụ: @PreAuthorize("hasRole('ADMIN') or @securityService.isCurrentPatient(#id, authentication)")
 * <p>
 * Các kiểm tra sở hữu dùng truy vấn exists theo username (không nạp entity vào persistence context),
 * tránh trả về dữ liệu cũ cho các truy vấn có khóa (FOR UPDATE) chạy sau đó trong cùng request.
 */
@Component("securityService")
@RequiredArgsConstructor
@Slf4j
public class SecurityService {

    private static final String ROLE_PREFIX = "ROLE_";
    private static final Set<String> STAFF_AUTHORITIES = Set.of(
            "ROLE_ADMIN", "ROLE_DOCTOR", "ROLE_NURSE", "ROLE_RECEPTIONIST", "ROLE_PHARMACIST");

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    private final InvoiceRepository invoiceRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;

    /**
     * Kiểm tra người dùng đăng nhập có phải là bệnh nhân sở hữu hồ sơ bệnh án patientId không.
     */
    public boolean isCurrentPatient(Long patientId, Authentication authentication) {
        if (!isAuthenticated(authentication) || patientId == null) {
            return false;
        }
        return patientRepository.existsByIdAndUser_UsernameIgnoreCase(patientId, authentication.getName());
    }

    /**
     * Kiểm tra lịch hẹn có thuộc về tài khoản bệnh nhân đang đăng nhập không.
     */
    public boolean isAppointmentOwner(Long appointmentId, Authentication authentication) {
        if (!isAuthenticated(authentication) || appointmentId == null) {
            return false;
        }
        return appointmentRepository.existsByIdAndPatient_User_UsernameIgnoreCase(appointmentId, authentication.getName());
    }

    /**
     * Kiểm tra lượt khám (Visit) có thuộc về bệnh nhân đang đăng nhập không.
     */
    public boolean isVisitPatient(Long visitId, Authentication authentication) {
        if (!isAuthenticated(authentication) || visitId == null) {
            return false;
        }
        return visitRepository.existsByIdAndPatient_User_UsernameIgnoreCase(visitId, authentication.getName());
    }

    /**
     * Kiểm tra người dùng đăng nhập có phải bác sĩ phụ trách lượt khám (Visit) không.
     * Chỉ bác sĩ phụ trách (hoặc ADMIN) được sửa chẩn đoán, kê đơn, chỉ định CLS, hoàn tất khám.
     */
    public boolean isVisitDoctor(Long visitId, Authentication authentication) {
        if (!isAuthenticated(authentication) || visitId == null) {
            return false;
        }
        return visitRepository.existsByIdAndDoctor_User_UsernameIgnoreCase(visitId, authentication.getName());
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
        if (!isAuthenticated(authentication) || prescriptionId == null) {
            return false;
        }
        return prescriptionRepository.existsByIdAndVisit_Patient_User_UsernameIgnoreCase(prescriptionId, authentication.getName());
    }

    /**
     * Kiểm tra chỉ định cận lâm sàng có thuộc về lượt khám của bệnh nhân đang đăng nhập không.
     */
    public boolean isLabOrderPatient(Long labOrderId, Authentication authentication) {
        if (!isAuthenticated(authentication) || labOrderId == null) {
            return false;
        }
        return labOrderRepository.existsByIdAndVisit_Patient_User_UsernameIgnoreCase(labOrderId, authentication.getName());
    }

    /**
     * ID hồ sơ bệnh nhân gắn với tài khoản đang đăng nhập, hoặc {@code null} nếu chưa liên kết.
     */
    public Long currentPatientId(Authentication authentication) {
        if (!isAuthenticated(authentication)) {
            return null;
        }
        List<Long> ids = patientRepository.findIdsByUsername(authentication.getName());
        return ids.isEmpty() ? null : ids.get(0);
    }

    // ==================== Tiện ích vai trò (static: không phụ thuộc DB) ====================

    /** Người dùng có ít nhất một trong các vai trò (không kèm tiền tố ROLE_). */
    public static boolean hasAnyRole(Authentication authentication, String... roles) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        List<String> wanted = Arrays.stream(roles).map(r -> ROLE_PREFIX + r).toList();
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(wanted::contains);
    }

    /** Người dùng chỉ có vai trò PATIENT (không kiêm nhiệm vai trò nhân viên nào). */
    public static boolean isPatientOnly(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        boolean isPatient = hasAnyRole(authentication, "PATIENT");
        boolean isStaff = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(STAFF_AUTHORITIES::contains);
        return isPatient && !isStaff;
    }

    private static boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getName() != null;
    }
}
