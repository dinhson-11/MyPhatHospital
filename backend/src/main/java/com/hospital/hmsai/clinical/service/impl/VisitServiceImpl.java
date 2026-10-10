package com.hospital.hmsai.clinical.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.hmsai.ai.dto.DrugItemDto;
import com.hospital.hmsai.ai.dto.PrescriptionSafetyResponse;
import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.clinical.dto.*;
import com.hospital.hmsai.clinical.entity.*;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.clinical.safety.AllergyDrugMatcher;
import com.hospital.hmsai.clinical.safety.PrescriptionSafetyException;
import com.hospital.hmsai.clinical.service.VisitService;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.AllergySeverity;
import com.hospital.hmsai.patient.entity.MedicalRecord;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.entity.PatientAllergy;
import com.hospital.hmsai.patient.repository.MedicalRecordRepository;
import com.hospital.hmsai.patient.repository.PatientAllergyRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.entity.DrugInteraction;
import com.hospital.hmsai.pharmacy.entity.InteractionSeverity;
import com.hospital.hmsai.pharmacy.repository.DrugInteractionRepository;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VisitServiceImpl implements VisitService {

    private static final String ROLE_DOCTOR = "DOCTOR";
    private static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final VisitRepository visitRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;
    private final DrugRepository drugRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DrugInteractionRepository drugInteractionRepository;
    private final PatientAllergyRepository patientAllergyRepository;
    private final PrescriptionAiAuditor prescriptionAiAuditor;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public VisitResponse createVisit(CreateVisitRequest request) {
        log.info("Bắt đầu lượt khám mới cho patientId: {}, doctorId: {}", request.getPatientId(), request.getDoctorId());

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", request.getPatientId()));

        StaffProfile doctor = staffProfileRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));
        if (!hasRole(doctor, ROLE_DOCTOR)) {
            throw new BusinessException("Nhân sự được chỉ định không phải bác sĩ khám bệnh");
        }

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = appointmentRepository.findByIdForUpdate(request.getAppointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", request.getAppointmentId()));
            validateAppointmentForVisit(appointment, patient, doctor);
        }

        if (visitRepository.existsByPatientIdAndStatus(patient.getId(), VisitStatus.IN_PROGRESS)) {
            throw new BusinessException("Bệnh nhân " + patient.getFullName()
                    + " đang có lượt khám chưa hoàn tất. Vui lòng hoàn tất lượt khám đó trước khi tạo lượt khám mới");
        }

        // Lịch hẹn BOOKED chuyển sang CONFIRMED khi bắt đầu khám
        if (appointment != null && appointment.getStatus() == AppointmentStatus.BOOKED) {
            appointment.setStatus(AppointmentStatus.CONFIRMED);
            appointmentRepository.save(appointment);
        }

        Visit visit = Visit.builder()
                .patient(patient)
                .doctor(doctor)
                .appointment(appointment)
                .visitTime(LocalDateTime.now())
                .chiefComplaint(request.getChiefComplaint())
                .vitalSigns(writeVitalSigns(request.getVitalSigns()))
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
        return updateVisit(id, request, false);
    }

    @Override
    public VisitResponse updateVisit(Long id, UpdateVisitRequest request, boolean vitalsOnly) {
        log.info("Cập nhật lượt khám ID: {} (chỉ sinh hiệu: {})", id, vitalsOnly);
        Visit visit = getInProgressVisit(id, "Lượt khám đã hoàn tất, không thể chỉnh sửa thông tin!");

        if (vitalsOnly) {
            // Điều dưỡng: chỉ cập nhật sinh hiệu. Giá trị lâm sàng gửi lại nhưng không đổi thì bỏ qua.
            if (changes(request.getChiefComplaint(), visit.getChiefComplaint())
                    || changes(request.getDiagnosisCode(), visit.getDiagnosisCode())
                    || changes(request.getDiagnosisNote(), visit.getDiagnosisNote())) {
                throw new AccessDeniedException("Điều dưỡng chỉ được cập nhật chỉ số sinh hiệu của lượt khám");
            }
        } else {
            if (request.getChiefComplaint() != null) {
                visit.setChiefComplaint(request.getChiefComplaint());
            }
            if (request.getDiagnosisCode() != null) {
                visit.setDiagnosisCode(request.getDiagnosisCode());
            }
            if (request.getDiagnosisNote() != null) {
                visit.setDiagnosisNote(request.getDiagnosisNote());
            }
        }

        if (request.getVitalSigns() != null) {
            // Gộp: chỉ số không gửi lên được giữ nguyên (tránh mất huyết áp/nhiệt độ khi cập nhật một phần)
            VitalSignsDto merged = mergeVitalSigns(readVitalSigns(visit), request.getVitalSigns());
            if (merged.getBloodPressureSystolic() != null && merged.getBloodPressureDiastolic() != null
                    && merged.getBloodPressureSystolic() <= merged.getBloodPressureDiastolic()) {
                throw new BusinessException("Huyết áp tâm thu phải lớn hơn huyết áp tâm trương");
            }
            visit.setVitalSigns(writeVitalSigns(merged));
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

        if (visit.getDiagnosisCode() == null || visit.getDiagnosisCode().isBlank()) {
            throw new BusinessException("Vui lòng nhập chẩn đoán (mã ICD-10) trước khi hoàn tất lượt khám");
        }

        // Khóa dòng visits: chờ các thao tác kê đơn / chỉ định CLS đang chạy trên lượt khám này kết thúc
        lockInProgressVisit(id, "Lượt khám đã được hoàn tất bởi một thao tác khác");

        visit.setStatus(VisitStatus.COMPLETED);
        Visit completed = visitRepository.save(visit);

        // Lịch hẹn: chỉ CONFIRMED → COMPLETED (lịch BOOKED đã được chuyển CONFIRMED khi bắt đầu khám)
        Appointment appointment = visit.getAppointment();
        if (appointment != null) {
            if (appointment.getStatus() == AppointmentStatus.CONFIRMED) {
                appointment.setStatus(AppointmentStatus.COMPLETED);
                appointmentRepository.save(appointment);
                log.info("Đã cập nhật lịch hẹn ID: {} sang COMPLETED", appointment.getId());
            } else {
                log.warn("Lịch hẹn ID: {} đang ở trạng thái {}, không tự động chuyển sang COMPLETED",
                        appointment.getId(), appointment.getStatus());
            }
        }

        // Lưu bản ghi tóm tắt EMR vào medical_records (cùng transaction với việc hoàn tất khám)
        String diagNote = visit.getDiagnosisNote() != null ? visit.getDiagnosisNote() : "";
        String complaint = visit.getChiefComplaint() != null ? visit.getChiefComplaint() : "Không ghi nhận";
        String summary = String.format("Khám ngày %s. Lý do: %s. Chẩn đoán: %s - %s",
                visit.getVisitTime() != null ? visit.getVisitTime().toLocalDate() : LocalDate.now(),
                complaint, visit.getDiagnosisCode(), diagNote);

        MedicalRecord medicalRecord = MedicalRecord.builder()
                .patient(visit.getPatient())
                .visitId(visit.getId())
                .summary(summary)
                .build();
        medicalRecordRepository.save(medicalRecord);
        log.info("Đã tạo bệnh án tóm tắt MedicalRecord cho bệnh nhân ID: {}",
                visit.getPatient() != null ? visit.getPatient().getId() : null);

        return VisitResponse.fromEntity(completed);
    }

    @Override
    public PrescriptionResponse createPrescription(Long visitId, CreatePrescriptionRequest request) {
        List<PrescriptionItemRequest> itemRequests = request.getItems() != null ? request.getItems() : List.of();
        log.info("Tạo đơn thuốc cho lượt khám ID: {} với {} loại thuốc", visitId, itemRequests.size());

        String completedMessage = "Lượt khám đã hoàn tất, không thể kê thêm đơn thuốc";
        Visit visit = getInProgressVisit(visitId, completedMessage);

        // 1. Kiểm tra dòng thuốc: không trống, số lượng ≥ 1, không lặp thuốc trong cùng một đơn
        validatePrescriptionItems(itemRequests);

        // 2. Nạp thuốc, chặn thuốc đã hết hạn
        Map<Long, Drug> drugs = loadPrescribableDrugs(itemRequests);

        // 3. Kiểm tra an toàn TRƯỚC khi lưu (tất định, không phụ thuộc AI)
        String overrideReason = trimToNull(request.getOverrideReason());
        List<String> criticalWarnings = evaluateCriticalSafetyWarnings(visit, drugs);
        if (!criticalWarnings.isEmpty()) {
            if (overrideReason == null) {
                log.warn("Chặn đơn thuốc cho lượt khám ID {}: {}", visitId, criticalWarnings);
                throw new PrescriptionSafetyException(criticalWarnings);
            }
            log.warn("Bác sĩ xác nhận kê đơn cho lượt khám ID {} dù có cảnh báo {} – lý do: {}",
                    visitId, criticalWarnings, overrideReason);
        }

        // 4. Kiểm tra AI + audit log (tham khảo). Chạy trong transaction riêng, lỗi không ảnh hưởng việc kê đơn.
        //    Phải gọi trước khi khóa dòng visits ở bước 5 (audit log có khóa ngoại tới visits).
        List<DrugItemDto> drugDtos = new ArrayList<>();
        for (PrescriptionItemRequest itemReq : itemRequests) {
            Drug d = drugs.get(itemReq.getDrugId());
            drugDtos.add(DrugItemDto.builder()
                    .id(d.getId())
                    .code(d.getCode())
                    .name(d.getName())
                    .dosage(itemReq.getDosage())
                    .build());
        }
        PrescriptionSafetyResponse aiSafety = runAiSafetyAudit(visitId, drugDtos);

        // 5. Khóa lượt khám & kiểm tra lại trạng thái (chống kê đơn song song với hoàn tất khám / lập hóa đơn)
        lockInProgressVisit(visitId, completedMessage);

        Prescription prescription = Prescription.builder()
                .visit(visit)
                .overrideReason(overrideReason)
                .items(new ArrayList<>())
                .build();

        for (PrescriptionItemRequest itemReq : itemRequests) {
            PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .drug(drugs.get(itemReq.getDrugId()))
                    .dosage(itemReq.getDosage())
                    .quantity(itemReq.getQuantity())
                    .instruction(itemReq.getInstruction())
                    .build();
            prescription.addItem(item);
        }

        Prescription saved = prescriptionRepository.save(prescription);
        log.info("Đã lưu đơn thuốc ID: {} cho lượt khám ID: {}", saved.getId(), visitId);

        PrescriptionResponse response = PrescriptionResponse.fromEntity(saved);
        if (!criticalWarnings.isEmpty()) {
            response.setHasWarning(true);
        }
        if (aiSafety != null) {
            if (aiSafety.getInteractions() != null) {
                response.setInteractionWarnings(aiSafety.getInteractions());
            }
            if (aiSafety.getAllergyAlerts() != null) {
                response.setAllergyAlerts(aiSafety.getAllergyAlerts());
            }
            response.setHasWarning(Boolean.TRUE.equals(response.getHasWarning())
                    || Boolean.TRUE.equals(aiSafety.getHasWarning()));
            response.setAiDisclaimer(aiSafety.getDisclaimer());

            if (Boolean.TRUE.equals(aiSafety.getHasWarning())) {
                log.warn("Đơn thuốc ID: {} chứa cảnh báo an toàn lâm sàng AI (tương tác: {}, dị ứng: {})",
                        saved.getId(), aiSafety.getInteractionCount(), aiSafety.getAllergyCount());
            }
        }
        return response;
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
        String completedMessage = "Lượt khám đã hoàn tất, không thể chỉ định thêm cận lâm sàng";
        Visit visit = getInProgressVisit(visitId, completedMessage);
        lockInProgressVisit(visitId, completedMessage);

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

    // ==================== Helper: trạng thái lượt khám ====================

    /**
     * Lấy lượt khám còn đang khám (IN_PROGRESS). Lượt khám COMPLETED không được sửa / kê đơn / chỉ định
     * thêm (tránh phát sinh thuốc, dịch vụ chưa được tính vào hóa đơn).
     */
    private Visit getInProgressVisit(Long visitId, String completedMessage) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", visitId));
        if (visit.getStatus() == VisitStatus.COMPLETED) {
            throw new BusinessException(completedMessage);
        }
        return visit;
    }

    /**
     * Khóa ghi dòng visits và xác nhận lượt khám vẫn IN_PROGRESS theo dữ liệu mới nhất trong DB.
     */
    private void lockInProgressVisit(Long visitId, String completedMessage) {
        if (visitRepository.touchIfStatus(visitId, VisitStatus.IN_PROGRESS, LocalDateTime.now()) == 0) {
            throw new BusinessException(completedMessage);
        }
    }

    private void validateAppointmentForVisit(Appointment appointment, Patient patient, StaffProfile doctor) {
        AppointmentStatus status = appointment.getStatus();
        if (status != AppointmentStatus.BOOKED && status != AppointmentStatus.CONFIRMED) {
            throw new BusinessException("Lịch hẹn đang ở trạng thái '"
                    + (status != null ? status.label() : "không xác định")
                    + "', không thể bắt đầu lượt khám");
        }
        if (appointment.getPatient() == null || !Objects.equals(appointment.getPatient().getId(), patient.getId())) {
            throw new BusinessException("Bệnh nhân không khớp với bệnh nhân của lịch hẹn");
        }
        if (appointment.getDoctor() == null || !Objects.equals(appointment.getDoctor().getId(), doctor.getId())) {
            throw new BusinessException("Bác sĩ không khớp với bác sĩ được đặt trong lịch hẹn");
        }
        if (visitRepository.existsByAppointmentId(appointment.getId())) {
            throw new BusinessException("Lịch hẹn này đã có lượt khám, không thể tạo thêm lượt khám");
        }
    }

    // ==================== Helper: kê đơn an toàn ====================

    private void validatePrescriptionItems(List<PrescriptionItemRequest> itemRequests) {
        if (itemRequests.isEmpty()) {
            throw new BusinessException("Đơn thuốc phải có ít nhất 1 loại thuốc");
        }
        Set<Long> seen = new HashSet<>();
        for (PrescriptionItemRequest itemReq : itemRequests) {
            if (itemReq.getDrugId() == null) {
                throw new BusinessException("drugId không được để trống");
            }
            if (itemReq.getQuantity() == null || itemReq.getQuantity() < 1) {
                throw new BusinessException("Số lượng thuốc phải lớn hơn hoặc bằng 1");
            }
            if (!seen.add(itemReq.getDrugId())) {
                throw new BusinessException("Thuốc ID " + itemReq.getDrugId()
                        + " bị lặp lại trong đơn. Vui lòng gộp thành một dòng thuốc.");
            }
        }
    }

    private Map<Long, Drug> loadPrescribableDrugs(List<PrescriptionItemRequest> itemRequests) {
        LocalDate today = LocalDate.now();
        Map<Long, Drug> drugs = new LinkedHashMap<>();
        for (PrescriptionItemRequest itemReq : itemRequests) {
            Drug drug = drugRepository.findById(itemReq.getDrugId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", itemReq.getDrugId()));
            if (drug.getExpiryDate() != null && !drug.getExpiryDate().isAfter(today)) {
                throw new BusinessException("Thuốc '" + drug.getName() + "' (Mã: " + drug.getCode()
                        + ") đã hết hạn sử dụng (" + drug.getExpiryDate().format(VN_DATE) + "), không thể kê đơn");
            }
            drugs.put(itemReq.getDrugId(), drug);
        }
        return drugs;
    }

    /**
     * Cảnh báo bắt buộc bác sĩ xác nhận:
     * <ul>
     *   <li>Tương tác thuốc mức SEVERE giữa thuốc mới kê với nhau hoặc với thuốc đã kê trong cùng lượt khám.</li>
     *   <li>Thuốc mới kê khớp với dị ứng mức SEVERE/MODERATE của bệnh nhân.</li>
     * </ul>
     */
    private List<String> evaluateCriticalSafetyWarnings(Visit visit, Map<Long, Drug> newDrugs) {
        Set<String> warnings = new LinkedHashSet<>();

        // Tương tác thuốc
        Set<Long> newIds = newDrugs.keySet();
        Set<Long> allIds = new LinkedHashSet<>(newIds);
        for (Prescription existing : prescriptionRepository.findByVisitIdWithItems(visit.getId())) {
            if (existing.getItems() == null) {
                continue;
            }
            for (PrescriptionItem item : existing.getItems()) {
                if (item.getDrug() != null && item.getDrug().getId() != null) {
                    allIds.add(item.getDrug().getId());
                }
            }
        }
        if (allIds.size() >= 2) {
            for (DrugInteraction interaction : drugInteractionRepository.findInteractionsAmongDrugs(allIds)) {
                if (interaction.getSeverity() != InteractionSeverity.SEVERE
                        || interaction.getDrugA() == null || interaction.getDrugB() == null) {
                    continue;
                }
                Long a = interaction.getDrugA().getId();
                Long b = interaction.getDrugB().getId();
                if (!newIds.contains(a) && !newIds.contains(b)) {
                    continue; // cặp thuốc đã kê từ trước, đã được xử lý ở lần kê trước
                }
                warnings.add(String.format("Tương tác thuốc nghiêm trọng: %s + %s%s",
                        interaction.getDrugA().getName(), interaction.getDrugB().getName(),
                        interaction.getDescription() != null && !interaction.getDescription().isBlank()
                                ? " – " + interaction.getDescription() : ""));
            }
        }

        // Dị ứng
        Long patientId = visit.getPatient() != null ? visit.getPatient().getId() : null;
        if (patientId != null) {
            List<PatientAllergy> allergies = patientAllergyRepository.findByPatientId(patientId);
            for (Drug drug : newDrugs.values()) {
                for (PatientAllergy allergy : allergies) {
                    AllergySeverity severity = allergy.getSeverity();
                    if (severity != AllergySeverity.SEVERE && severity != AllergySeverity.MODERATE) {
                        continue;
                    }
                    AllergyDrugMatcher.findMatch(allergy.getAllergen(), drug.getName())
                            .ifPresent(reason -> warnings.add(String.format(
                                    "Dị ứng thuốc (mức độ %s): bệnh nhân có tiền sử dị ứng '%s' – thuốc '%s' %s",
                                    severity == AllergySeverity.SEVERE ? "nặng" : "trung bình",
                                    allergy.getAllergen().trim(), drug.getName(), reason)));
                }
            }
        }
        return new ArrayList<>(warnings);
    }

    private PrescriptionSafetyResponse runAiSafetyAudit(Long visitId, List<DrugItemDto> drugDtos) {
        try {
            return prescriptionAiAuditor.checkAndAudit(visitId, drugDtos);
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra an toàn lâm sàng AI cho lượt khám ID {}: {}", visitId, e.getMessage());
            return null;
        }
    }

    // ==================== Helper: sinh hiệu ====================

    private VitalSignsDto readVitalSigns(Visit visit) {
        if (visit.getVitalSigns() == null || visit.getVitalSigns().isBlank()) {
            return new VitalSignsDto();
        }
        try {
            return OBJECT_MAPPER.readValue(visit.getVitalSigns(), VitalSignsDto.class);
        } catch (JsonProcessingException e) {
            log.warn("Không thể parse vitalSigns JSON hiện có của visit ID {}: {}", visit.getId(), e.getMessage());
            return new VitalSignsDto();
        }
    }

    private static VitalSignsDto mergeVitalSigns(VitalSignsDto current, VitalSignsDto incoming) {
        if (incoming.getPulse() != null) {
            current.setPulse(incoming.getPulse());
        }
        if (incoming.getBloodPressureSystolic() != null) {
            current.setBloodPressureSystolic(incoming.getBloodPressureSystolic());
        }
        if (incoming.getBloodPressureDiastolic() != null) {
            current.setBloodPressureDiastolic(incoming.getBloodPressureDiastolic());
        }
        if (incoming.getTemperature() != null) {
            current.setTemperature(incoming.getTemperature());
        }
        if (incoming.getRespiratoryRate() != null) {
            current.setRespiratoryRate(incoming.getRespiratoryRate());
        }
        if (incoming.getSpO2() != null) {
            current.setSpO2(incoming.getSpO2());
        }
        if (incoming.getWeight() != null) {
            current.setWeight(incoming.getWeight());
        }
        if (incoming.getHeight() != null) {
            current.setHeight(incoming.getHeight());
        }
        return current;
    }

    private String writeVitalSigns(VitalSignsDto vitalSigns) {
        if (vitalSigns == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(vitalSigns);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Dữ liệu sinh hiệu không hợp lệ");
        }
    }

    // ==================== Helper chung ====================

    private static boolean hasRole(StaffProfile staff, String role) {
        return staff.getUser() != null && staff.getUser().getRoles() != null
                && staff.getUser().getRoles().stream().anyMatch(r -> role.equals(r.getCode()));
    }

    /** Giá trị gửi lên khác giá trị hiện tại (bỏ qua khoảng trắng; null = không gửi). */
    private static boolean changes(String requested, String current) {
        return requested != null && !Objects.equals(trimToNull(requested), trimToNull(current));
    }

    private static String trimToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
