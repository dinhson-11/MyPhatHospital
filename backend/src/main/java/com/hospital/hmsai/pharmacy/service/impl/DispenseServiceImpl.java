package com.hospital.hmsai.pharmacy.service.impl;

import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.pharmacy.dto.DispenseRequest;
import com.hospital.hmsai.pharmacy.dto.DispenseResponse;
import com.hospital.hmsai.pharmacy.dto.DispensedItemResponse;
import com.hospital.hmsai.pharmacy.entity.Dispense;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.repository.DispenseRepository;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.pharmacy.service.DispenseService;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DispenseServiceImpl implements DispenseService {

    private final DispenseRepository dispenseRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final DrugRepository drugRepository;
    private final StaffProfileRepository staffProfileRepository;

    @Override
    @Transactional
    public DispenseResponse dispensePrescription(Long prescriptionId, DispenseRequest request, Long currentUserId) {
        log.info("Xử lý cấp phát thuốc cho đơn ID: {}, dược sĩ userId: {}", prescriptionId, currentUserId);

        // 1. Kiểm tra đơn thuốc tồn tại
        Prescription prescription = prescriptionRepository.findByIdWithItems(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn thuốc", "id", prescriptionId));

        // 2. Kiểm tra xem đơn đã được cấp phát trước đó chưa (Chống cấp phát trùng)
        if (dispenseRepository.existsByPrescriptionId(prescriptionId)) {
            throw new BusinessException("Đơn thuốc ID " + prescriptionId + " đã được cấp phát trước đó");
        }

        // 3. Tìm thông tin dược sĩ cấp phát
        StaffProfile pharmacist = null;
        if (currentUserId != null) {
            pharmacist = staffProfileRepository.findByUserId(currentUserId).orElse(null);
        }
        if (pharmacist == null) {
            // Fallback lấy nhân viên đầu tiên nếu có
            pharmacist = staffProfileRepository.findAll().stream().findFirst().orElse(null);
        }

        // 4. Kiểm tra tồn kho của từng loại thuốc trong đơn trước khi trừ
        List<PrescriptionItem> items = prescription.getItems();
        if (items == null || items.isEmpty()) {
            throw new BusinessException("Đơn thuốc không có danh mục thuốc để cấp phát");
        }

        for (PrescriptionItem item : items) {
            Drug drug = item.getDrug();
            int requiredQty = item.getQuantity() != null ? item.getQuantity() : 1;
            int availableStock = drug.getStockQuantity() != null ? drug.getStockQuantity() : 0;

            if (availableStock < requiredQty) {
                throw new BusinessException("Thuốc '" + drug.getName() + "' (Mã: " + drug.getCode() +
                        ") không đủ tồn kho để cấp phát (Tồn kho: " + availableStock + ", Cần cấp: " + requiredQty + ")");
            }
        }

        // 5. Trừ tồn kho và ghi nhận danh mục thuốc đã cấp
        List<DispensedItemResponse> dispensedItems = new ArrayList<>();
        for (PrescriptionItem item : items) {
            Drug drug = item.getDrug();
            int requiredQty = item.getQuantity() != null ? item.getQuantity() : 1;

            drug.setStockQuantity(drug.getStockQuantity() - requiredQty);
            Drug updatedDrug = drugRepository.save(drug);

            dispensedItems.add(DispensedItemResponse.builder()
                    .drugId(drug.getId())
                    .drugCode(drug.getCode())
                    .drugName(drug.getName())
                    .unit(drug.getUnit())
                    .price(drug.getPrice())
                    .dosage(item.getDosage())
                    .quantity(requiredQty)
                    .remainingStock(updatedDrug.getStockQuantity())
                    .instruction(item.getInstruction())
                    .build());
        }

        // 6. Lưu bản ghi Dispense
        Dispense dispense = Dispense.builder()
                .prescription(prescription)
                .dispensedBy(pharmacist)
                .dispensedAt(LocalDateTime.now())
                .build();
        Dispense savedDispense = dispenseRepository.save(dispense);

        log.info("Cấp phát thuốc thành công đơn ID {}, mã cấp phát ID: {}", prescriptionId, savedDispense.getId());

        return toDispenseResponse(savedDispense, prescription, dispensedItems, request != null ? request.getNote() : null);
    }

    @Override
    @Transactional(readOnly = true)
    public DispenseResponse getDispenseByPrescriptionId(Long prescriptionId) {
        log.info("Tra cứu thông tin cấp phát đơn thuốc ID: {}", prescriptionId);
        Dispense dispense = dispenseRepository.findByPrescriptionId(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Bản ghi cấp phát của đơn thuốc", "prescriptionId", prescriptionId));

        Prescription prescription = prescriptionRepository.findByIdWithItems(prescriptionId)
                .orElse(dispense.getPrescription());

        List<DispensedItemResponse> dispensedItems = new ArrayList<>();
        if (prescription != null && prescription.getItems() != null) {
            for (PrescriptionItem item : prescription.getItems()) {
                Drug drug = item.getDrug();
                dispensedItems.add(DispensedItemResponse.builder()
                        .drugId(drug != null ? drug.getId() : null)
                        .drugCode(drug != null ? drug.getCode() : "")
                        .drugName(drug != null ? drug.getName() : "")
                        .unit(drug != null ? drug.getUnit() : "")
                        .price(drug != null ? drug.getPrice() : null)
                        .dosage(item.getDosage())
                        .quantity(item.getQuantity())
                        .remainingStock(drug != null ? drug.getStockQuantity() : 0)
                        .instruction(item.getInstruction())
                        .build());
            }
        }

        return toDispenseResponse(dispense, prescription, dispensedItems, null);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isDispensed(Long prescriptionId) {
        return dispenseRepository.existsByPrescriptionId(prescriptionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispenseResponse> getAllDispenses() {
        return dispenseRepository.findAllByOrderByDispensedAtDesc()
                .stream()
                .map(d -> {
                    Prescription p = d.getPrescription();
                    return toDispenseResponse(d, p, List.of(), null);
                })
                .toList();
    }

    private DispenseResponse toDispenseResponse(Dispense dispense, Prescription prescription,
                                                List<DispensedItemResponse> items, String note) {
        String patientName = null;
        String patientCode = null;
        String doctorName = null;
        Long visitId = null;

        if (prescription != null && prescription.getVisit() != null) {
            visitId = prescription.getVisit().getId();
            if (prescription.getVisit().getPatient() != null) {
                patientName = prescription.getVisit().getPatient().getFullName();
                patientCode = prescription.getVisit().getPatient().getPatientCode();
            }
            if (prescription.getVisit().getDoctor() != null && prescription.getVisit().getDoctor().getUser() != null) {
                doctorName = prescription.getVisit().getDoctor().getUser().getFullName();
            }
        }

        String pharmacistName = (dispense.getDispensedBy() != null && dispense.getDispensedBy().getUser() != null)
                ? dispense.getDispensedBy().getUser().getFullName()
                : "Dược sĩ phụ trách";

        return DispenseResponse.builder()
                .id(dispense.getId())
                .prescriptionId(prescription != null ? prescription.getId() : null)
                .visitId(visitId)
                .patientName(patientName)
                .patientCode(patientCode)
                .doctorName(doctorName)
                .dispensedByName(pharmacistName)
                .dispensedAt(dispense.getDispensedAt())
                .items(items)
                .note(note)
                .build();
    }
}
