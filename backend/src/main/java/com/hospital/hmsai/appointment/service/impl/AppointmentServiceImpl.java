package com.hospital.hmsai.appointment.service.impl;

import com.hospital.hmsai.appointment.dto.*;
import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentSource;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.appointment.service.AppointmentService;
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
import java.util.List;

/**
 * Implementation của AppointmentService.
 * Quản lý vòng đời lịch hẹn: BOOKED -> CONFIRMED -> COMPLETED / CANCELLED.
 * Kiểm tra trùng lịch bác sĩ và sinh danh sách khung giờ trống.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final DepartmentRepository departmentRepository;

    /**
     * Khung giờ chuẩn theo lịch làm việc của Bệnh viện Đa khoa Thanh Sơn.
     * Sáng: 08:00 - 11:00 (6 ca 30 phút)
     * Chiều: 13:30 - 16:30 (6 ca 30 phút)
     */
    private static final List<LocalTime> STANDARD_SLOT_TIMES = List.of(
            LocalTime.of(8, 0),
            LocalTime.of(8, 30),
            LocalTime.of(9, 0),
            LocalTime.of(9, 30),
            LocalTime.of(10, 0),
            LocalTime.of(10, 30),
            LocalTime.of(13, 30),
            LocalTime.of(14, 0),
            LocalTime.of(14, 30),
            LocalTime.of(15, 0),
            LocalTime.of(15, 30),
            LocalTime.of(16, 0)
    );

    @Override
    @Transactional
    public AppointmentResponse create(CreateAppointmentRequest request) {
        log.info("Đặt lịch khám mới: patientId={}, doctorId={}, scheduledAt={}",
                request.getPatientId(), request.getDoctorId(), request.getScheduledAt());

        // 1. Kiểm tra bệnh nhân tồn tại
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", request.getPatientId()));

        // 2. Kiểm tra bác sĩ tồn tại
        StaffProfile doctor = staffProfileRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));

        // 3. Xác định chuyên khoa (từ request hoặc từ bác sĩ)
        Department department = null;
        if (request.getDepartmentId() != null) {
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Chuyên khoa", "id", request.getDepartmentId()));
        } else if (doctor.getDepartment() != null) {
            department = doctor.getDepartment();
        }

        // 4. Kiểm tra trùng lịch bác sĩ (bác sĩ bận vào thời gian này và chưa bị hủy)
        boolean doctorBusy = appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(
                request.getDoctorId(), request.getScheduledAt());
        if (doctorBusy) {
            throw new BusinessException("Bác sĩ đã có lịch hẹn vào thời gian này. Vui lòng chọn khung giờ khác.");
        }

        // 5. Tạo entity Appointment
        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .department(department)
                .scheduledAt(request.getScheduledAt())
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
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BusinessException("Không thể xác nhận lịch hẹn đã bị hủy");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessException("Không thể xác nhận lịch hẹn đã hoàn thành");
        }

        appointment.setStatus(AppointmentStatus.CONFIRMED);
        Appointment saved = appointmentRepository.save(appointment);
        log.info("Đã xác nhận lịch hẹn ID: {}", saved.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public AppointmentResponse cancel(Long id, String reason) {
        log.info("Hủy lịch hẹn ID: {}, lý do: {}", id, reason);
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BusinessException("Lịch hẹn đã bị hủy trước đó");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessException("Không thể hủy lịch hẹn đã hoàn tất khám");
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
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BusinessException("Không thể hoàn tất lịch hẹn đã bị hủy");
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
        switch (request.getStatus()) {
            case CONFIRMED -> {
                return confirm(id);
            }
            case CANCELLED -> {
                return cancel(id, request.getReason());
            }
            case COMPLETED -> {
                return complete(id);
            }
            case NO_SHOW -> {
                Appointment appointment = appointmentRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));
                if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
                    throw new BusinessException("Lịch hẹn đã bị hủy, không thể đánh dấu vắng mặt");
                }
                appointment.setStatus(AppointmentStatus.NO_SHOW);
                return toResponse(appointmentRepository.save(appointment));
            }
            case BOOKED -> {
                Appointment appointment = appointmentRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));
                appointment.setStatus(AppointmentStatus.BOOKED);
                return toResponse(appointmentRepository.save(appointment));
            }
            default -> throw new BusinessException("Trạng thái không hợp lệ: " + request.getStatus());
        }
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

        // 3. Xây dựng danh sách khung giờ trống và đã đặt
        List<AvailableSlotsResponse.TimeSlot> availableSlots = new ArrayList<>();
        List<AvailableSlotsResponse.TimeSlot> bookedSlots = new ArrayList<>();

        for (LocalTime startTime : STANDARD_SLOT_TIMES) {
            LocalTime endTime = startTime.plusMinutes(30);

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
            } else {
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
