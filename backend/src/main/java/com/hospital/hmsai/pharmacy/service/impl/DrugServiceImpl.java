package com.hospital.hmsai.pharmacy.service.impl;

import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.pharmacy.dto.DrugInteractionResponse;
import com.hospital.hmsai.pharmacy.dto.DrugResponse;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.repository.DrugInteractionRepository;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.pharmacy.service.DrugService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DrugServiceImpl implements DrugService {

    private final DrugRepository drugRepository;
    private final DrugInteractionRepository drugInteractionRepository;

    @Override
    public Page<DrugResponse> searchDrugs(String keyword, Pageable pageable) {
        log.info("Tìm kiếm danh mục thuốc: keyword='{}'", keyword);
        String searchKey = (keyword != null) ? keyword.trim() : "";
        Page<Drug> page = drugRepository.searchByKeyword(searchKey, pageable);
        return page.map(DrugResponse::fromEntity);
    }

    @Override
    public List<DrugResponse> searchDrugsList(String keyword) {
        String searchKey = (keyword != null) ? keyword.trim() : "";
        return drugRepository.searchByKeywordList(searchKey)
                .stream()
                .map(DrugResponse::fromEntity)
                .toList();
    }

    @Override
    public DrugResponse getById(Long id) {
        log.info("Lấy chi tiết thuốc ID: {}", id);
        Drug drug = drugRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));
        return DrugResponse.fromEntity(drug);
    }

    @Override
    public DrugResponse getByCode(String code) {
        log.info("Lấy chi tiết thuốc theo mã code: {}", code);
        Drug drug = drugRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "code", code));
        return DrugResponse.fromEntity(drug);
    }

    @Override
    public List<DrugInteractionResponse> getAllInteractions() {
        log.info("Lấy toàn bộ danh sách tương tác thuốc tham chiếu");
        return drugInteractionRepository.findAllWithDrugs()
                .stream()
                .map(DrugInteractionResponse::fromEntity)
                .toList();
    }

    @Override
    public List<DrugInteractionResponse> checkInteractionsAmongDrugs(Collection<Long> drugIds) {
        if (drugIds == null || drugIds.size() < 2) {
            return Collections.emptyList();
        }
        log.info("Kiểm tra tương tác giữa các thuốc: {}", drugIds);
        return drugInteractionRepository.findInteractionsAmongDrugs(drugIds)
                .stream()
                .map(DrugInteractionResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public DrugResponse createDrug(com.hospital.hmsai.pharmacy.dto.CreateDrugRequest request) {
        log.info("Thêm thuốc mới vào danh mục: code='{}', name='{}'", request.getCode(), request.getName());
        // Chuẩn hóa mã TRƯỚC khi kiểm tra trùng (mã được lưu dạng chữ hoa)
        String code = request.getCode().trim().toUpperCase(java.util.Locale.ROOT);
        if (drugRepository.existsByCode(code)) {
            throw new com.hospital.hmsai.common.exception.BusinessException("Mã thuốc " + code + " đã tồn tại trong hệ thống");
        }
        Drug drug = Drug.builder()
                .code(code)
                .name(request.getName().trim())
                .unit(request.getUnit() != null ? request.getUnit().trim() : "Viên")
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0)
                .expiryDate(request.getExpiryDate())
                .build();
        Drug saved = drugRepository.save(drug);
        log.info("Đã lưu thuốc mới ID: {}", saved.getId());
        return DrugResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public DrugResponse updateStock(Long id, com.hospital.hmsai.pharmacy.dto.UpdateStockRequest request) {
        log.info("Cập nhật tồn kho thuốc ID: {}, type: {}, qty: {}", id, request.getAdjustmentType(), request.getQuantity());
        // Khóa dòng thuốc để không mất cập nhật khi cấp phát / nhập kho đồng thời
        Drug drug = drugRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));

        int current = drug.getStockQuantity() != null ? drug.getStockQuantity() : 0;
        if (request.getQuantity() == null || request.getQuantity() < 0) {
            throw new com.hospital.hmsai.common.exception.BusinessException("Số lượng điều chỉnh không được âm");
        }
        int qty = request.getQuantity();
        if (request.getAdjustmentType() != com.hospital.hmsai.pharmacy.dto.StockAdjustmentType.ADJUSTMENT && qty < 1) {
            throw new com.hospital.hmsai.common.exception.BusinessException(
                    "Số lượng nhập/xuất kho tối thiểu là 1");
        }

        switch (request.getAdjustmentType()) {
            case IMPORT -> drug.setStockQuantity(current + qty);
            case EXPORT -> {
                if (current < qty) {
                    throw new com.hospital.hmsai.common.exception.BusinessException(
                            "Không đủ tồn kho để xuất. Tồn hiện tại: " + current + ", yêu cầu xuất: " + qty);
                }
                drug.setStockQuantity(current - qty);
            }
            case ADJUSTMENT -> drug.setStockQuantity(qty);
        }

        Drug updated = drugRepository.save(drug);
        log.info("Cập nhật kho thành công thuốc ID {}: tồn kho mới = {}", id, updated.getStockQuantity());
        return DrugResponse.fromEntity(updated);
    }

    @Override
    public List<DrugResponse> getExpiringSoonDrugs(int days) {
        int safeDays = days > 0 ? days : 30;
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate targetDate = today.plusDays(safeDays);
        log.info("Lấy danh sách thuốc sắp hết hạn từ {} đến {}", today, targetDate);
        return drugRepository.findByExpiryDateBetweenOrderByExpiryDateAsc(today, targetDate)
                .stream()
                .map(DrugResponse::fromEntity)
                .toList();
    }

    @Override
    public List<DrugResponse> getLowStockDrugs(int threshold) {
        int safeThreshold = threshold > 0 ? threshold : 20;
        log.info("Lấy danh sách thuốc sắp hết hàng (tồn kho <= {})", safeThreshold);
        return drugRepository.findByStockQuantityLessThanEqualOrderByStockQuantityAsc(safeThreshold)
                .stream()
                .map(DrugResponse::fromEntity)
                .toList();
    }
}
