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
    /** Chỉ số khối cơ thể (kg/m²), tính từ cân nặng & chiều cao, làm tròn 1 chữ số thập phân. */
    private Double bmi;
    /** Phân loại BMI theo ngưỡng WHO cho người châu Á – Thái Bình Dương. */
    private String bmiCategory;
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

        Double bmi = vsDto != null ? computeBmi(vsDto.getWeight(), vsDto.getHeight()) : null;

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
                .bmi(bmi)
                .bmiCategory(bmiCategory(bmi))
                .diagnosisCode(visit.getDiagnosisCode())
                .diagnosisNote(visit.getDiagnosisNote())
                .status(visit.getStatus())
                .prescriptions(presList)
                .labOrders(labList)
                .createdAt(visit.getCreatedAt())
                .updatedAt(visit.getUpdatedAt())
                .build();
    }

    /**
     * BMI = cân nặng (kg) / chiều cao (m)².
     */
    public static Double computeBmi(Double weightKg, Double heightCm) {
        if (weightKg == null || heightCm == null || weightKg <= 0 || heightCm <= 0) {
            return null;
        }
        double heightM = heightCm / 100.0;
        double bmi = weightKg / (heightM * heightM);
        return Math.round(bmi * 10.0) / 10.0;
    }

    /**
     * Ngưỡng BMI cho người châu Á (WHO Asia-Pacific 2000, Bộ Y tế áp dụng):
     * &lt;18,5 thiếu cân; 18,5–22,9 bình thường; 23–24,9 thừa cân; 25–29,9 béo phì độ I; ≥30 béo phì độ II.
     */
    public static String bmiCategory(Double bmi) {
        if (bmi == null) {
            return null;
        }
        if (bmi < 18.5) {
            return "Thiếu cân";
        }
        if (bmi < 23.0) {
            return "Bình thường";
        }
        if (bmi < 25.0) {
            return "Thừa cân";
        }
        if (bmi < 30.0) {
            return "Béo phì độ I";
        }
        return "Béo phì độ II";
    }
}
