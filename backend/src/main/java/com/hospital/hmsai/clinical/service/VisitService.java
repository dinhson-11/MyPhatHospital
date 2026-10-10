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

    /**
     * Cập nhật lượt khám.
     *
     * @param vitalsOnly true nếu người gọi chỉ được cập nhật sinh hiệu (điều dưỡng): mọi thay đổi
     *                   lý do khám / chẩn đoán bị từ chối (403); giá trị gửi lại không đổi được bỏ qua.
     */
    VisitResponse updateVisit(Long id, UpdateVisitRequest request, boolean vitalsOnly);

    VisitResponse completeVisit(Long id);

    PrescriptionResponse createPrescription(Long visitId, CreatePrescriptionRequest request);

    List<PrescriptionResponse> getPrescriptionsByVisitId(Long visitId);

    LabOrderResponse createLabOrder(Long visitId, CreateLabOrderRequest request);

    List<LabOrderResponse> getLabOrdersByVisitId(Long visitId);
}
