package com.hospital.hmsai.pharmacy.service.impl;

import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class DispenseServiceImpl implements DispenseService {

    private static final int MAX_DISPENSE_HISTORY = 200;
    private static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final DispenseRepository dispenseRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final DrugRepository drugRepository;
    private final StaffProfileRepository staffProfileRepository;

    /**
     * Cấp phát thuốc theo đơn.
     * <ul>
     *   <li>Khóa ghi đơn thuốc (chống cấp phát trùng đồng thời) – DB còn ràng buộc UNIQUE(dispenses.prescription_id).</li>
     *   <li>Chỉ cấp phát khi ca khám đã COMPLETED: bác sĩ đã chốt đơn, không thể kê thêm sau khi phát thuốc.</li>
     *   <li>Bắt buộc có hồ sơ nhân viên của người cấp phát (không ghi nhận thay bằng nhân viên khác).</li>
     *   <li>Cộng dồn số lượng các dòng cùng thuốc, khóa từng thuốc theo ID tăng dần (tránh deadlock),
     *       chặn thuốc hết hạn và thiếu tồn kho, sau đó mới trừ kho.</li>
     * </ul>
     */
    @Override
    @Transactional
    public DispenseResponse dispensePrescription(Long prescriptionId, DispenseRequest request, Long currentUserId) {
        log.info("Xử lý cấp phát thuốc cho đơn ID: {}, dược sĩ userId: {}", prescriptionId, currentUserId);

        // 1. Khóa đơn thuốc
        Prescription prescription = prescriptionRepository.findByIdWithItemsForUpdate(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn thuốc", "id", prescriptionId));

        // 2. Chống cấp phát trùng
        if (dispenseRepository.existsByPrescriptionId(prescriptionId)) {
            throw new BusinessException("Đơn thuốc ID " + prescriptionId + " đã được cấp phát trước đó");
        }

        // 3. Chỉ cấp phát khi bác sĩ đã hoàn tất ca khám (chốt đơn)
        Visit visit = prescription.getVisit();
        if (visit == null || visit.getStatus() != VisitStatus.COMPLETED) {
            throw new BusinessException("Ca khám chưa hoàn tất. Bác sĩ cần hoàn tất ca khám (chốt đơn) trước khi cấp phát thuốc");
        }

        // 4. Người cấp phát phải có hồ sơ nhân viên
        StaffProfile pharmacist = currentUserId != null
                ? staffProfileRepository.findByUserId(currentUserId).orElse(null)
                : null;
        if (pharmacist == null) {
            throw new BusinessException("Tài khoản hiện tại chưa có hồ sơ nhân viên dược, không thể ghi nhận người cấp phát thuốc");
        }

        List<PrescriptionItem> items = prescription.getItems();
        if (items == null || items.isEmpty()) {
            throw new BusinessException("Đơn thuốc không có danh mục thuốc để cấp phát");
        }

        // 5. Cộng dồn số lượng theo thuốc (TreeMap: khóa theo ID tăng dần)
        Map<Long, Integer> requiredByDrug = new TreeMap<>();
        for (PrescriptionItem item : items) {
            if (item.getDrug() == null || item.getDrug().getId() == null) {
                throw new BusinessException("Đơn thuốc có dòng thuốc không hợp lệ");
            }
            int qty = item.getQuantity() != null ? item.getQuantity() : 1;
            if (qty < 1) {
                throw new BusinessException("Số lượng thuốc trong đơn phải lớn hơn hoặc bằng 1");
            }
            requiredByDrug.merge(item.getDrug().getId(), qty, Integer::sum);
        }

        // 6. Khóa từng thuốc, kiểm tra hạn dùng và tồn kho (đọc giá trị mới nhất)
        LocalDate today = LocalDate.now();
        Map<Long, Drug> lockedDrugs = new HashMap<>();
        for (Map.Entry<Long, Integer> entry : requiredByDrug.entrySet()) {
            Long drugId = entry.getKey();
            int requiredQty = entry.getValue();
            Drug drug = drugRepository.findByIdForUpdate(drugId)
                    .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", drugId));

            if (drug.getExpiryDate() != null && !drug.getExpiryDate().isAfter(today)) {
                throw new BusinessException("Thuốc '" + drug.getName() + "' (Mã: " + drug.getCode()
                        + ") đã hết hạn sử dụng (" + drug.getExpiryDate().format(VN_DATE) + "), không thể cấp phát");
            }

            int availableStock = drug.getStockQuantity() != null ? drug.getStockQuantity() : 0;
            if (availableStock < requiredQty) {
                throw new BusinessException("Thuốc '" + drug.getName() + "' (Mã: " + drug.getCode() +
                        ") không đủ tồn kho để cấp phát (Tồn kho: " + availableStock + ", Cần cấp: " + requiredQty + ")");
            }
            lockedDrugs.put(drugId, drug);
        }

        // 7. Trừ tồn kho
        for (Map.Entry<Long, Integer> entry : requiredByDrug.entrySet()) {
            Drug drug = lockedDrugs.get(entry.getKey());
            int current = drug.getStockQuantity() != null ? drug.getStockQuantity() : 0;
            drug.setStockQuantity(current - entry.getValue());
            drugRepository.save(drug);
        }

        // 8. Ghi nhận danh mục thuốc đã cấp
        List<DispensedItemResponse> dispensedItems = new ArrayList<>();
        for (PrescriptionItem item : items) {
            Drug drug = lockedDrugs.get(item.getDrug().getId());
            dispensedItems.add(DispensedItemResponse.builder()
                    .drugId(drug.getId())
                    .drugCode(drug.getCode())
                    .drugName(drug.getName())
                    .unit(drug.getUnit())
                    .price(drug.getPrice())
                    .dosage(item.getDosage())
                    .quantity(item.getQuantity() != null ? item.getQuantity() : 1)
                    .remainingStock(drug.getStockQuantity())
                    .instruction(item.getInstruction())
                    .build());
        }

        // 9. Lưu bản ghi Dispense
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
    public List<DispenseResponse> getAllDispenses(int limit) {
        int size = Math.min(Math.max(limit, 1), MAX_DISPENSE_HISTORY);
        return dispenseRepository.findAllByOrderByDispensedAtDesc(org.springframework.data.domain.PageRequest.of(0, size))
                .getContent()
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
