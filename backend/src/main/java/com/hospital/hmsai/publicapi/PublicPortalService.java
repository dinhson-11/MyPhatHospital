package com.hospital.hmsai.publicapi;

import com.hospital.hmsai.appointment.dto.AppointmentResponse;
import com.hospital.hmsai.appointment.dto.CreateAppointmentRequest;
import com.hospital.hmsai.appointment.entity.AppointmentSource;
import com.hospital.hmsai.appointment.service.AppointmentService;
import com.hospital.hmsai.common.WorkingHours;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.DepartmentRepository;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Dịch vụ phục vụ cổng thông tin công khai: danh mục bác sĩ/khoa (nguồn dữ liệu duy nhất là DB)
 * và đặt lịch khám không cần đăng nhập.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PublicPortalService {

    private static final String ROLE_DOCTOR = "DOCTOR";
    private static final String ROLE_PHARMACIST = "PHARMACIST";

    private final StaffProfileRepository staffProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final PatientRepository patientRepository;
    private final AppointmentService appointmentService;

    @Transactional(readOnly = true)
    public List<PublicDepartmentResponse> getDepartments() {
        return departmentRepository.findAll().stream()
                .map(d -> PublicDepartmentResponse.builder().id(d.getId()).name(d.getName()).build())
                .sorted(Comparator.comparing(PublicDepartmentResponse::getId))
                .toList();
    }

    /**
     * Danh sách bác sĩ + dược sĩ đã khử trùng lặp theo họ tên
     * (ưu tiên tài khoản dạng bs.* / ds.* thay cho tài khoản mẫu cũ như bacsi, duocsi).
     */
    @Transactional(readOnly = true)
    public List<PublicDoctorResponse> getDoctors() {
        Map<String, StaffProfile> byName = new LinkedHashMap<>();
        for (StaffProfile p : staffProfileRepository.findAll()) {
            if (p.getUser() == null || !(hasRole(p, ROLE_DOCTOR) || hasRole(p, ROLE_PHARMACIST))) {
                continue;
            }
            String key = p.getUser().getFullName().trim().toLowerCase();
            StaffProfile existing = byName.get(key);
            if (existing == null || (!isCanonical(existing) && isCanonical(p))) {
                byName.put(key, p);
            }
        }
        List<PublicDoctorResponse> result = new ArrayList<>();
        for (StaffProfile p : byName.values()) {
            result.add(PublicDoctorResponse.builder()
                    .id(p.getId())
                    .username(p.getUser().getUsername())
                    .fullName(p.getUser().getFullName())
                    .departmentId(p.getDepartment() != null ? p.getDepartment().getId() : null)
                    .specialty(p.getSpecialty())
                    .canBook(hasRole(p, ROLE_DOCTOR))
                    .build());
        }
        result.sort(Comparator.comparing(PublicDoctorResponse::getId));
        return result;
    }

    @Transactional
    public AppointmentResponse book(PublicBookingRequest request) {
        if (!WorkingHours.isValidSlotStart(request.getScheduledAt())) {
            throw new BusinessException("Giờ khám không hợp lệ. Khung giờ khám: "
                    + WorkingHours.describe(request.getScheduledAt().toLocalDate()));
        }
        departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Chuyên khoa", "id", request.getDepartmentId()));

        StaffProfile doctor = resolveDoctor(request);
        Patient patient = findOrCreatePatient(request.getFullName().trim(), request.getPhone().trim());

        CreateAppointmentRequest create = CreateAppointmentRequest.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .departmentId(request.getDepartmentId())
                .scheduledAt(request.getScheduledAt())
                .symptom(request.getSymptom())
                .notes(request.getNotes())
                .source(AppointmentSource.PATIENT)
                .build();
        return appointmentService.create(create);
    }

    private StaffProfile resolveDoctor(PublicBookingRequest request) {
        if (request.getDoctorId() != null) {
            StaffProfile doctor = staffProfileRepository.findById(request.getDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));
            if (!hasRole(doctor, ROLE_DOCTOR)) {
                throw new BusinessException("Nhân sự được chọn không phải bác sĩ khám bệnh.");
            }
            if (doctor.getDepartment() == null
                    || !request.getDepartmentId().equals(doctor.getDepartment().getId())) {
                throw new BusinessException("Bác sĩ được chọn không thuộc chuyên khoa đã chọn.");
            }
            return doctor;
        }
        // Không chọn bác sĩ: tự phân công bác sĩ của khoa
        return staffProfileRepository.findByDepartmentId(request.getDepartmentId()).stream()
                .filter(p -> p.getUser() != null && hasRole(p, ROLE_DOCTOR))
                .min(Comparator.comparing((StaffProfile p) -> !isCanonical(p)).thenComparing(StaffProfile::getId))
                .orElseThrow(() -> new BusinessException("Chuyên khoa này hiện chưa có bác sĩ nhận lịch."));
    }

    private Patient findOrCreatePatient(String fullName, String phone) {
        return patientRepository.findFirstByPhoneAndFullNameIgnoreCase(phone, fullName)
                .orElseGet(() -> {
                    Patient created = patientRepository.save(Patient.builder()
                            .patientCode(generatePatientCode())
                            .fullName(fullName)
                            .phone(phone)
                            .build());
                    log.info("Tạo hồ sơ bệnh nhân từ đặt lịch công khai: {}", created.getPatientCode());
                    return created;
                });
    }

    private String generatePatientCode() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String code;
        int retries = 0;
        do {
            code = "BN-" + datePart + "-" + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
            retries++;
        } while (patientRepository.existsByPatientCode(code) && retries < 10);
        return code;
    }

    private boolean hasRole(StaffProfile p, String role) {
        return p.getUser() != null && p.getUser().getRoles().stream().anyMatch(r -> role.equals(r.getCode()));
    }

    private boolean isCanonical(StaffProfile p) {
        String u = p.getUser().getUsername();
        return u.startsWith("bs.") || u.startsWith("ds.");
    }
}
