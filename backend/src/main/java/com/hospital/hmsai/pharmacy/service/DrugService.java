package com.hospital.hmsai.pharmacy.service;

import com.hospital.hmsai.pharmacy.dto.DrugInteractionResponse;
import com.hospital.hmsai.pharmacy.dto.DrugResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;

public interface DrugService {

    Page<DrugResponse> searchDrugs(String keyword, Pageable pageable);

    List<DrugResponse> searchDrugsList(String keyword);

    DrugResponse getById(Long id);

    DrugResponse getByCode(String code);

    List<DrugInteractionResponse> getAllInteractions();

    List<DrugInteractionResponse> checkInteractionsAmongDrugs(Collection<Long> drugIds);

    DrugResponse createDrug(com.hospital.hmsai.pharmacy.dto.CreateDrugRequest request);

    DrugResponse updateStock(Long id, com.hospital.hmsai.pharmacy.dto.UpdateStockRequest request);

    List<DrugResponse> getExpiringSoonDrugs(int days);

    List<DrugResponse> getLowStockDrugs(int threshold);
}
