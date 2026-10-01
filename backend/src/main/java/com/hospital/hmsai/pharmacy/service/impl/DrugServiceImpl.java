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
}
