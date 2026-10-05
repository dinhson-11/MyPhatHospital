package com.hospital.hmsai.clinical.service;

import com.hospital.hmsai.clinical.dto.*;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VisitService {

    VisitResponse createVisit(CreateVisitRequest request);

    Page<VisitResponse> getAllVisits(Long doctorId, Long patientId, VisitStatus status, Pageable pageable);

    VisitResponse getVisitById(Long id);

    VisitResponse updateVisit(Long id, UpdateVisitRequest request);

    VisitResponse completeVisit(Long id);

    PrescriptionResponse createPrescription(Long visitId, CreatePrescriptionRequest request);

    List<PrescriptionResponse> getPrescriptionsByVisitId(Long visitId);

    LabOrderResponse createLabOrder(Long visitId, CreateLabOrderRequest request);

    List<LabOrderResponse> getLabOrdersByVisitId(Long visitId);
}
