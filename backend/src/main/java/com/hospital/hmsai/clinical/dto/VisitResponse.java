package com.hospital.hmsai.clinical.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Slf4j
public class VisitResponse {

    private Long id;
    private Long appointmentId;

    // Bệnh nhân
    private Long patientId;
    private String patientCode;
    private String patientName;
    private String patientPhone;
    private String patientGender;
    private LocalDate patientDob;

    // Bác sĩ
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String departmentName;

    // Lâm sàng
    private LocalDateTime visitTime;
    private String chiefComplaint;
    private VitalSignsDto vitalSigns;
    private String diagnosisCode;
    private String diagnosisNote;
    private VisitStatus status;

    // Đơn thuốc & Cận lâm sàng
    private List<PrescriptionResponse> prescriptions;
    private List<LabOrderResponse> labOrders;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static VisitResponse fromEntity(Visit visit) {
        if (visit == null) return null;

        VitalSignsDto vsDto = null;
        if (visit.getVitalSigns() != null && !visit.getVitalSigns().isBlank()) {
            try {
                vsDto = OBJECT_MAPPER.readValue(visit.getVitalSigns(), VitalSignsDto.class);
            } catch (Exception e) {
                log.warn("Không thể parse vitalSigns JSON cho visit ID {}: {}", visit.getId(), e.getMessage());
            }
        }

        List<PrescriptionResponse> presList = visit.getPrescriptions() != null
                ? visit.getPrescriptions().stream().map(PrescriptionResponse::fromEntity).toList()
                : Collections.emptyList();

        List<LabOrderResponse> labList = visit.getLabOrders() != null
                ? visit.getLabOrders().stream().map(LabOrderResponse::fromEntity).toList()
                : Collections.emptyList();

        String docName = null;
        String specialty = null;
        String deptName = null;
        if (visit.getDoctor() != null) {
            specialty = visit.getDoctor().getSpecialty();
            if (visit.getDoctor().getUser() != null) {
                docName = visit.getDoctor().getUser().getFullName();
            }
            if (visit.getDoctor().getDepartment() != null) {
                deptName = visit.getDoctor().getDepartment().getName();
            }
        }

        return VisitResponse.builder()
                .id(visit.getId())
                .appointmentId(visit.getAppointment() != null ? visit.getAppointment().getId() : null)
                .patientId(visit.getPatient() != null ? visit.getPatient().getId() : null)
                .patientCode(visit.getPatient() != null ? visit.getPatient().getPatientCode() : null)
                .patientName(visit.getPatient() != null ? visit.getPatient().getFullName() : null)
                .patientPhone(visit.getPatient() != null ? visit.getPatient().getPhone() : null)
                .patientGender(visit.getPatient() != null && visit.getPatient().getGender() != null
                        ? visit.getPatient().getGender().name() : null)
                .patientDob(visit.getPatient() != null ? visit.getPatient().getDob() : null)
                .doctorId(visit.getDoctor() != null ? visit.getDoctor().getId() : null)
                .doctorName(docName)
                .doctorSpecialty(specialty)
                .departmentName(deptName)
                .visitTime(visit.getVisitTime())
                .chiefComplaint(visit.getChiefComplaint())
                .vitalSigns(vsDto)
                .diagnosisCode(visit.getDiagnosisCode())
                .diagnosisNote(visit.getDiagnosisNote())
                .status(visit.getStatus())
                .prescriptions(presList)
                .labOrders(labList)
                .createdAt(visit.getCreatedAt())
                .updatedAt(visit.getUpdatedAt())
                .build();
    }
}
