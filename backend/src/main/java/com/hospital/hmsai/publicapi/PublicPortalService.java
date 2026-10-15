package com.hospital.hmsai.publicapi;

import com.hospital.hmsai.appointment.dto.AppointmentResponse;
import com.hospital.hmsai.appointment.dto.CreateAppointmentRequest;
import com.hospital.hmsai.appointment.entity.AppointmentSource;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.appointment.service.AppointmentService;
import com.hospital.hmsai.common.WorkingHours;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientCodeGenerator;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.DepartmentRepository;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

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
    private final AppointmentRepository appointmentRepository;

    @Transactional(readOnly = true)
    public List<PublicDepartmentResponse> getDepartments() {
        return departmentRepository.findAll().stream()
                .map(d -> PublicDepartmentResponse.builder().id(d.getId()).name(d.getName()).build())
                .sorted(Comparator.comparing(PublicDepartmentResponse::getId))
                .toList();
    }

    /** Danh sách bác sĩ + dược sĩ của bệnh viện (mỗi người đúng một hồ sơ, xem migration V19). */
    @Transactional(readOnly = true)
    public List<PublicDoctorResponse> getDoctors() {
        return staffProfileRepository.findAll().stream()
                .filter(p -> p.getUser() != null && (hasRole(p, ROLE_DOCTOR) || hasRole(p, ROLE_PHARMACIST)))
                .sorted(Comparator.comparing(StaffProfile::getId))
                .map(p -> PublicDoctorResponse.builder()
                        .id(p.getId())
                        .username(p.getUser().getUsername())
                        .fullName(p.getUser().getFullName())
                        .departmentId(p.getDepartment() != null ? p.getDepartment().getId() : null)
                        .specialty(p.getSpecialty())
                        .avatarUrl(p.getUser().getAvatarUrl())
                        .canBook(hasRole(p, ROLE_DOCTOR))
                        .build())
                .toList();
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
        // AppointmentService.create khóa hồ sơ bác sĩ và kiểm tra lại trùng lịch trước khi lưu
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
        // Không chọn bác sĩ: tự phân công bác sĩ đầu tiên của khoa còn trống khung giờ này
        List<StaffProfile> departmentDoctors = staffProfileRepository.findByDepartmentId(request.getDepartmentId()).stream()
                .filter(p -> p.getUser() != null && hasRole(p, ROLE_DOCTOR))
                .sorted(Comparator.comparing(StaffProfile::getId))
                .toList();
        if (departmentDoctors.isEmpty()) {
            throw new BusinessException("Chuyên khoa này hiện chưa có bác sĩ nhận lịch.");
        }
        LocalDateTime slot = request.getScheduledAt().withSecond(0).withNano(0);
        return departmentDoctors.stream()
                .filter(p -> !appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(p.getId(), slot))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "Tất cả bác sĩ của chuyên khoa đã kín lịch vào khung giờ này. Vui lòng chọn khung giờ khác."));
    }

    private Patient findOrCreatePatient(String fullName, String phone) {
        return patientRepository.findFirstByPhoneAndFullNameIgnoreCase(phone, fullName)
                .orElseGet(() -> {
                    Patient created = patientRepository.save(Patient.builder()
                            .patientCode(PatientCodeGenerator.generate(patientRepository::existsByPatientCode))
                            .fullName(fullName)
                            .phone(phone)
                            .build());
                    log.info("Tạo hồ sơ bệnh nhân từ đặt lịch công khai: {}", created.getPatientCode());
                    return created;
                });
    }

    private boolean hasRole(StaffProfile p, String role) {
        return p.getUser() != null && p.getUser().getRoles().stream().anyMatch(r -> role.equals(r.getCode()));
    }
}
