package com.hospital.hmsai.clinical.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.clinical.dto.*;
import com.hospital.hmsai.clinical.entity.*;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionItemRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.clinical.service.VisitService;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.MedicalRecord;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.MedicalRecordRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VisitServiceImpl implements VisitService {

    private final VisitRepository visitRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final LabOrderRepository labOrderRepository;
    private final DrugRepository drugRepository;
    private final MedicalRecordRepository medicalRecordRepository;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public VisitResponse createVisit(CreateVisitRequest request) {
        log.info("Bắt đầu lượt khám mới cho patientId: {}, doctorId: {}", request.getPatientId(), request.getDoctorId());

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", request.getPatientId()));

        StaffProfile doctor = staffProfileRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = appointmentRepository.findById(request.getAppointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", request.getAppointmentId()));
            // Nếu lịch hẹn đang là BOOKED, cập nhật sang CONFIRMED khi bắt đầu khám
            if (appointment.getStatus() == AppointmentStatus.BOOKED) {
                appointment.setStatus(AppointmentStatus.CONFIRMED);
                appointmentRepository.save(appointment);
            }
        }

        String vitalSignsJson = null;
        if (request.getVitalSigns() != null) {
            try {
                vitalSignsJson = OBJECT_MAPPER.writeValueAsString(request.getVitalSigns());
            } catch (JsonProcessingException e) {
                log.error("Lỗi parse vitalSigns JSON: {}", e.getMessage());
            }
        }

        Visit visit = Visit.builder()
                .patient(patient)
                .doctor(doctor)
                .appointment(appointment)
                .visitTime(LocalDateTime.now())
                .chiefComplaint(request.getChiefComplaint())
                .vitalSigns(vitalSignsJson)
                .diagnosisCode(request.getDiagnosisCode())
                .diagnosisNote(request.getDiagnosisNote())
                .status(VisitStatus.IN_PROGRESS)
                .build();

        Visit savedVisit = visitRepository.save(visit);
        log.info("Đã tạo lượt khám ID: {} cho bệnh nhân: {}", savedVisit.getId(), patient.getFullName());
        return VisitResponse.fromEntity(savedVisit);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VisitResponse> getAllVisits(Long doctorId, Long patientId, VisitStatus status, Pageable pageable) {
        log.info("Lấy danh sách lượt khám: doctorId={}, patientId={}, status={}, page={}",
                doctorId, patientId, status, pageable.getPageNumber());
        Page<Visit> page = visitRepository.filterVisits(doctorId, patientId, status, pageable);
        return page.map(VisitResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public VisitResponse getVisitById(Long id) {
        log.info("Lấy thông tin chi tiết lượt khám ID: {}", id);
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", id));
        return VisitResponse.fromEntity(visit);
    }

    @Override
    public VisitResponse updateVisit(Long id, UpdateVisitRequest request) {
        log.info("Cập nhật lượt khám ID: {}", id);
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", id));

        if (visit.getStatus() == VisitStatus.COMPLETED) {
            throw new BusinessException("Lượt khám đã hoàn tất, không thể chỉnh sửa thông tin!");
        }

        if (request.getChiefComplaint() != null) {
            visit.setChiefComplaint(request.getChiefComplaint());
        }
        if (request.getDiagnosisCode() != null) {
            visit.setDiagnosisCode(request.getDiagnosisCode());
        }
        if (request.getDiagnosisNote() != null) {
            visit.setDiagnosisNote(request.getDiagnosisNote());
        }
        if (request.getVitalSigns() != null) {
            try {
                visit.setVitalSigns(OBJECT_MAPPER.writeValueAsString(request.getVitalSigns()));
            } catch (JsonProcessingException e) {
                log.error("Lỗi parse vitalSigns JSON khi cập nhật: {}", e.getMessage());
            }
        }

        Visit updated = visitRepository.save(visit);
        return VisitResponse.fromEntity(updated);
    }

    @Override
    public VisitResponse completeVisit(Long id) {
        log.info("Hoàn tất lượt khám ID: {}", id);
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", id));

        if (visit.getStatus() == VisitStatus.COMPLETED) {
            log.warn("Lượt khám ID: {} đã ở trạng thái COMPLETED từ trước", id);
            return VisitResponse.fromEntity(visit);
        }

        visit.setStatus(VisitStatus.COMPLETED);
        Visit completed = visitRepository.save(visit);

        // Cập nhật trạng thái lịch hẹn tương ứng thành COMPLETED
        if (visit.getAppointment() != null) {
            Appointment appointment = visit.getAppointment();
            appointment.setStatus(AppointmentStatus.COMPLETED);
            appointmentRepository.save(appointment);
            log.info("Đã cập nhật lịch hẹn ID: {} sang COMPLETED", appointment.getId());
        }

        // Tự động lưu bản ghi tóm tắt EMR vào medical_records
        try {
            String diagCode = visit.getDiagnosisCode() != null ? visit.getDiagnosisCode() : "Chưa xác định";
            String diagNote = visit.getDiagnosisNote() != null ? visit.getDiagnosisNote() : "";
            String complaint = visit.getChiefComplaint() != null ? visit.getChiefComplaint() : "Không ghi nhận";

            String summary = String.format("Khám ngày %s. Lý do: %s. Chẩn đoán: %s - %s",
                    visit.getVisitTime() != null ? visit.getVisitTime().toLocalDate() : LocalDate.now(),
                    complaint, diagCode, diagNote);

            MedicalRecord medicalRecord = MedicalRecord.builder()
                    .patient(visit.getPatient())
                    .visitId(visit.getId())
                    .summary(summary)
                    .build();
            medicalRecordRepository.save(medicalRecord);
            log.info("Đã tạo bệnh án tóm tắt MedicalRecord cho bệnh nhân ID: {}", visit.getPatient().getId());
        } catch (Exception e) {
            log.error("Lỗi tạo medical_records cho visit ID {}: {}", id, e.getMessage());
        }

        return VisitResponse.fromEntity(completed);
    }

    @Override
    public PrescriptionResponse createPrescription(Long visitId, CreatePrescriptionRequest request) {
        log.info("Tạo đơn thuốc cho lượt khám ID: {} với {} loại thuốc", visitId, request.getItems().size());
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", visitId));

        Prescription prescription = Prescription.builder()
                .visit(visit)
                .items(new ArrayList<>())
                .build();

        for (PrescriptionItemRequest itemReq : request.getItems()) {
            Drug drug = drugRepository.findById(itemReq.getDrugId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", itemReq.getDrugId()));

            PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .drug(drug)
                    .dosage(itemReq.getDosage())
                    .quantity(itemReq.getQuantity())
                    .instruction(itemReq.getInstruction())
                    .build();

            prescription.addItem(item);
        }

        Prescription saved = prescriptionRepository.save(prescription);
        log.info("Đã lưu đơn thuốc ID: {} cho lượt khám ID: {}", saved.getId(), visitId);
        return PrescriptionResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByVisitId(Long visitId) {
        log.info("Lấy danh sách đơn thuốc của lượt khám ID: {}", visitId);
        if (!visitRepository.existsById(visitId)) {
            throw new ResourceNotFoundException("Lượt khám", "id", visitId);
        }
        return prescriptionRepository.findByVisitIdWithItems(visitId)
                .stream()
                .map(PrescriptionResponse::fromEntity)
                .toList();
    }

    @Override
    public LabOrderResponse createLabOrder(Long visitId, CreateLabOrderRequest request) {
        log.info("Tạo chỉ định cận lâm sàng cho lượt khám ID: {}, loại: {}", visitId, request.getTestType());
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", visitId));

        LabOrder order = LabOrder.builder()
                .visit(visit)
                .testType(request.getTestType())
                .status(LabOrderStatus.ORDERED)
                .orderedAt(LocalDateTime.now())
                .results(new ArrayList<>())
                .build();

        LabOrder saved = labOrderRepository.save(order);
        log.info("Đã tạo chỉ định cận lâm sàng ID: {}", saved.getId());
        return LabOrderResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getLabOrdersByVisitId(Long visitId) {
        log.info("Lấy danh sách chỉ định cận lâm sàng của lượt khám ID: {}", visitId);
        if (!visitRepository.existsById(visitId)) {
            throw new ResourceNotFoundException("Lượt khám", "id", visitId);
        }
        return labOrderRepository.findByVisitIdWithResults(visitId)
                .stream()
                .map(LabOrderResponse::fromEntity)
                .toList();
    }
}
