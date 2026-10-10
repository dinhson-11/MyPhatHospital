package com.hospital.hmsai.appointment.service.impl;

import com.hospital.hmsai.appointment.dto.*;
import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentSource;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.appointment.service.AppointmentService;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.common.WorkingHours;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.user.entity.Department;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.DepartmentRepository;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Implementation của AppointmentService.
 * Quản lý vòng đời lịch hẹn theo bảng chuyển trạng thái:
 * <pre>
 *   BOOKED    → CONFIRMED | CANCELLED | NO_SHOW
 *   CONFIRMED → COMPLETED | CANCELLED | NO_SHOW
 *   CANCELLED, COMPLETED, NO_SHOW: trạng thái cuối
 * </pre>
 * Kiểm tra trùng lịch bác sĩ (có khóa chống đặt trùng đồng thời) và sinh danh sách khung giờ trống.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

    private static final String ROLE_DOCTOR = "DOCTOR";

    private static final Map<AppointmentStatus, Set<AppointmentStatus>> TRANSITIONS =
            new EnumMap<>(AppointmentStatus.class);

    static {
        TRANSITIONS.put(AppointmentStatus.BOOKED,
                EnumSet.of(AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW));
        TRANSITIONS.put(AppointmentStatus.CONFIRMED,
                EnumSet.of(AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW));
        TRANSITIONS.put(AppointmentStatus.CANCELLED, EnumSet.noneOf(AppointmentStatus.class));
        TRANSITIONS.put(AppointmentStatus.COMPLETED, EnumSet.noneOf(AppointmentStatus.class));
        TRANSITIONS.put(AppointmentStatus.NO_SHOW, EnumSet.noneOf(AppointmentStatus.class));
    }

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final VisitRepository visitRepository;

    @Override
    @Transactional
    public AppointmentResponse create(CreateAppointmentRequest request) {
        log.info("Đặt lịch khám mới: patientId={}, doctorId={}, scheduledAt={}",
                request.getPatientId(), request.getDoctorId(), request.getScheduledAt());

        if (request.getPatientId() == null) {
            throw new BusinessException("Mã bệnh nhân không được để trống");
        }
        if (request.getDoctorId() == null) {
            throw new BusinessException("Mã bác sĩ không được để trống");
        }
        LocalDateTime scheduledAt = validateScheduledAt(request.getScheduledAt());

        // 1. Kiểm tra bệnh nhân tồn tại
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", request.getPatientId()));

        // 2. Khóa hồ sơ bác sĩ: tuần tự hóa các yêu cầu đặt lịch cùng bác sĩ (chống đặt trùng đồng thời)
        StaffProfile doctor = appointmentRepository.lockStaffProfileById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));
        if (!hasRole(doctor, ROLE_DOCTOR)) {
            throw new BusinessException("Nhân sự được chọn không phải bác sĩ khám bệnh.");
        }

        // 3. Xác định chuyên khoa (từ request hoặc từ bác sĩ)
        Department department = null;
        if (request.getDepartmentId() != null) {
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Chuyên khoa", "id", request.getDepartmentId()));
        } else if (doctor.getDepartment() != null) {
            department = doctor.getDepartment();
        }

        // 4. Kiểm tra trùng lịch bác sĩ (đọc có khóa – thấy cả lịch vừa được giao dịch khác commit)
        if (!appointmentRepository.findActiveByDoctorAndScheduledAtForUpdate(doctor.getId(), scheduledAt).isEmpty()) {
            throw new BusinessException("Bác sĩ đã có lịch hẹn vào thời gian này. Vui lòng chọn khung giờ khác.");
        }

        // 5. Bệnh nhân không được có 2 lịch hẹn cùng thời điểm
        if (appointmentRepository.existsByPatientIdAndScheduledAtAndStatusNot(
                patient.getId(), scheduledAt, AppointmentStatus.CANCELLED)) {
            throw new BusinessException("Bệnh nhân đã có lịch hẹn khác vào thời gian này.");
        }

        // 6. Tạo entity Appointment
        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .department(department)
                .scheduledAt(scheduledAt)
                .status(AppointmentStatus.BOOKED)
                .source(request.getSource() != null ? request.getSource() : AppointmentSource.PATIENT)
                .symptom(request.getSymptom())
                .notes(request.getNotes())
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        log.info("Đặt lịch thành công: appointmentId={}, mã BN={}", saved.getId(), patient.getPatientCode());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AppointmentResponse getById(Long id) {
        log.debug("Lấy chi tiết lịch hẹn ID: {}", id);
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));
        return toResponse(appointment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AppointmentResponse> getByPatientId(Long patientId, Pageable pageable) {
        log.debug("Lấy lịch hẹn theo patientId: {}, page: {}", patientId, pageable.getPageNumber());
        return appointmentRepository.findByPatientIdOrderByScheduledAtDesc(patientId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AppointmentResponse> getMyAppointments(Long userId, Pageable pageable) {
        log.debug("Lấy lịch hẹn của user: {}, page: {}", userId, pageable.getPageNumber());
        return appointmentRepository.findByPatientUserId(userId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AppointmentResponse> getByDoctorId(Long doctorId, Pageable pageable) {
        log.debug("Lấy lịch hẹn theo doctorId: {}, page: {}", doctorId, pageable.getPageNumber());
        return appointmentRepository.findByDoctorIdOrderByScheduledAtDesc(doctorId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public AppointmentResponse confirm(Long id) {
        log.info("Xác nhận lịch hẹn ID: {}", id);
        Appointment appointment = findForUpdate(id);

        if (appointment.getStatus() == AppointmentStatus.CONFIRMED) {
            log.info("Lịch hẹn ID: {} đã được xác nhận trước đó", id);
            return toResponse(appointment);
        }
        assertTransition(appointment, AppointmentStatus.CONFIRMED);

        appointment.setStatus(AppointmentStatus.CONFIRMED);
        Appointment saved = appointmentRepository.save(appointment);
        log.info("Đã xác nhận lịch hẹn ID: {}", saved.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public AppointmentResponse cancel(Long id, String reason) {
        log.info("Hủy lịch hẹn ID: {}, lý do: {}", id, reason);
        Appointment appointment = findForUpdate(id);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BusinessException("Lịch hẹn đã bị hủy trước đó");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessException("Không thể hủy lịch hẹn đã hoàn tất khám");
        }
        assertTransition(appointment, AppointmentStatus.CANCELLED);
        if (visitRepository.existsByAppointmentIdAndStatus(id, VisitStatus.IN_PROGRESS)) {
            throw new BusinessException("Bệnh nhân đang trong lượt khám của lịch hẹn này, không thể hủy lịch hẹn");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        if (reason != null && !reason.isBlank()) {
            String existingNotes = appointment.getNotes();
            String cancelNote = "Lý do hủy: " + reason.trim();
            appointment.setNotes(existingNotes != null && !existingNotes.isBlank()
                    ? existingNotes + " | " + cancelNote
                    : cancelNote);
        }

        Appointment saved = appointmentRepository.save(appointment);
        log.info("Đã hủy lịch hẹn ID: {}", saved.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public AppointmentResponse complete(Long id) {
        log.info("Hoàn tất lượt khám cho lịch hẹn ID: {}", id);
        Appointment appointment = findForUpdate(id);

        assertTransition(appointment, AppointmentStatus.COMPLETED);
        if (!visitRepository.existsByAppointmentIdAndStatus(id, VisitStatus.COMPLETED)) {
            throw new BusinessException("Chỉ hoàn tất lịch hẹn khi lượt khám tương ứng đã được bác sĩ hoàn tất");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        Appointment saved = appointmentRepository.save(appointment);
        log.info("Đã hoàn tất lịch hẹn ID: {}", saved.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public AppointmentResponse updateStatus(Long id, UpdateAppointmentStatusRequest request) {
        log.info("Cập nhật trạng thái lịch hẹn ID: {} -> {}", id, request.getStatus());
        if (request.getStatus() == null) {
            throw new BusinessException("Trạng thái mới không được để trống");
        }
        return switch (request.getStatus()) {
            case CONFIRMED -> confirm(id);
            case CANCELLED -> cancel(id, request.getReason());
            case COMPLETED -> complete(id);
            case NO_SHOW -> markNoShow(id);
            case BOOKED -> throw new BusinessException(
                    "Không thể chuyển lịch hẹn về trạng thái '" + AppointmentStatus.BOOKED.label() + "'");
        };
    }

    @Override
    @Transactional(readOnly = true)
    public AvailableSlotsResponse getAvailableSlots(Long doctorId, LocalDate date) {
        log.info("Lấy khung giờ trống cho bác sĩ ID: {}, ngày: {}", doctorId, date);

        // 1. Kiểm tra bác sĩ tồn tại
        StaffProfile doctor = staffProfileRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", doctorId));

        String doctorName = doctor.getUser() != null ? doctor.getUser().getFullName() : "Bác sĩ #" + doctorId;

        // 2. Lấy các lịch hẹn chưa hủy của bác sĩ trong ngày
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);
        List<Appointment> bookedAppointments = appointmentRepository.findByDoctorIdAndTimeRange(
                doctorId, startOfDay, endOfDay);

        // 3. Xây dựng danh sách khung giờ trống và đã đặt (bỏ các khung giờ đã qua)
        LocalDateTime now = LocalDateTime.now();
        List<AvailableSlotsResponse.TimeSlot> availableSlots = new ArrayList<>();
        List<AvailableSlotsResponse.TimeSlot> bookedSlots = new ArrayList<>();

        for (LocalTime startTime : WorkingHours.slotStarts(date)) {
            LocalTime endTime = startTime.plusMinutes(WorkingHours.SLOT_MINUTES);

            // Kiểm tra xem có lịch hẹn nào trùng thời gian bắt đầu này không
            boolean isBooked = bookedAppointments.stream()
                    .anyMatch(a -> a.getScheduledAt().toLocalTime().equals(startTime));

            AvailableSlotsResponse.TimeSlot slot = AvailableSlotsResponse.TimeSlot.builder()
                    .startTime(startTime)
                    .endTime(endTime)
                    .available(!isBooked)
                    .build();

            if (isBooked) {
                bookedSlots.add(slot);
            } else if (date.atTime(startTime).isAfter(now)) {
                availableSlots.add(slot);
            }
        }

        return AvailableSlotsResponse.builder()
                .doctorId(doctorId)
                .doctorName(doctorName)
                .date(date)
                .availableSlots(availableSlots)
                .bookedSlots(bookedSlots)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AppointmentResponse> getAll(Pageable pageable) {
        log.debug("Lấy toàn bộ danh sách lịch hẹn, page: {}", pageable.getPageNumber());
        return appointmentRepository.findAll(pageable)
                .map(this::toResponse);
    }

    // ==================== Helper Methods ====================

    /**
     * Đánh dấu bệnh nhân vắng mặt: chỉ sau giờ hẹn và khi bệnh nhân chưa đến khám (chưa có lượt khám).
     */
    private AppointmentResponse markNoShow(Long id) {
        Appointment appointment = findForUpdate(id);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BusinessException("Lịch hẹn đã bị hủy, không thể đánh dấu vắng mặt");
        }
        assertTransition(appointment, AppointmentStatus.NO_SHOW);
        if (appointment.getScheduledAt() == null || !LocalDateTime.now().isAfter(appointment.getScheduledAt())) {
            throw new BusinessException("Chỉ được đánh dấu vắng mặt sau thời điểm hẹn khám");
        }
        if (visitRepository.existsByAppointmentId(id)) {
            throw new BusinessException("Bệnh nhân đã đến khám theo lịch hẹn này, không thể đánh dấu vắng mặt");
        }
        appointment.setStatus(AppointmentStatus.NO_SHOW);
        Appointment saved = appointmentRepository.save(appointment);
        log.info("Đã đánh dấu vắng mặt lịch hẹn ID: {}", saved.getId());
        return toResponse(saved);
    }

    private Appointment findForUpdate(Long id) {
        return appointmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));
    }

    private static void assertTransition(Appointment appointment, AppointmentStatus target) {
        AppointmentStatus current = appointment.getStatus() != null ? appointment.getStatus() : AppointmentStatus.BOOKED;
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw new BusinessException("Không thể chuyển lịch hẹn từ trạng thái '" + current.label()
                    + "' sang '" + target.label() + "'");
        }
    }

    /**
     * Thời điểm khám phải ở tương lai và đúng giờ bắt đầu một khung khám 30 phút trong giờ làm việc.
     * Trả về thời điểm đã chuẩn hóa (bỏ giây) để so trùng lịch chính xác.
     */
    private static LocalDateTime validateScheduledAt(LocalDateTime scheduledAt) {
        if (scheduledAt == null) {
            throw new BusinessException("Thời gian khám không được để trống");
        }
        if (!scheduledAt.isAfter(LocalDateTime.now())) {
            throw new BusinessException("Thời gian khám phải là thời điểm trong tương lai");
        }
        if (!WorkingHours.isValidSlotStart(scheduledAt)) {
            throw new BusinessException("Giờ khám không hợp lệ. Khung giờ khám: "
                    + WorkingHours.describe(scheduledAt.toLocalDate()));
        }
        return scheduledAt.withSecond(0).withNano(0);
    }

    private static boolean hasRole(StaffProfile staff, String role) {
        return staff.getUser() != null && staff.getUser().getRoles() != null
                && staff.getUser().getRoles().stream().anyMatch(r -> role.equals(r.getCode()));
    }

    /**
     * Map Entity Appointment -> AppointmentResponse DTO.
     */
    private AppointmentResponse toResponse(Appointment appointment) {
        Long patientId = null;
        String patientName = null;
        String patientCode = null;
        if (appointment.getPatient() != null) {
            patientId = appointment.getPatient().getId();
            patientName = appointment.getPatient().getFullName();
            patientCode = appointment.getPatient().getPatientCode();
        }

        Long doctorId = null;
        String doctorName = null;
        if (appointment.getDoctor() != null) {
            doctorId = appointment.getDoctor().getId();
            if (appointment.getDoctor().getUser() != null) {
                doctorName = appointment.getDoctor().getUser().getFullName();
            }
        }

        Long departmentId = null;
        String departmentName = null;
        if (appointment.getDepartment() != null) {
            departmentId = appointment.getDepartment().getId();
            departmentName = appointment.getDepartment().getName();
        }

        return AppointmentResponse.builder()
                .id(appointment.getId())
                .patientId(patientId)
                .patientName(patientName)
                .patientCode(patientCode)
                .doctorId(doctorId)
                .doctorName(doctorName)
                .departmentId(departmentId)
                .departmentName(departmentName)
                .scheduledAt(appointment.getScheduledAt())
                .status(appointment.getStatus())
                .source(appointment.getSource())
                .symptom(appointment.getSymptom())
                .notes(appointment.getNotes())
                .createdAt(appointment.getCreatedAt())
                .updatedAt(appointment.getUpdatedAt())
                .build();
    }
}
