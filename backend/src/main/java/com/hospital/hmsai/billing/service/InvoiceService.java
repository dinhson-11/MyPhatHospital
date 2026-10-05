package com.hospital.hmsai.billing.service;

import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InvoiceService {

    InvoiceResponse generateInvoiceFromVisit(Long visitId);

    InvoiceResponse getInvoiceById(Long id, Long currentUserId, boolean isPrivilegedUser);

    InvoiceResponse getInvoiceByVisitId(Long visitId);

    InvoiceResponse payInvoice(Long id, PayInvoiceRequest request);

    Page<InvoiceResponse> searchInvoices(String keyword, InvoiceStatus status, Pageable pageable);
}
