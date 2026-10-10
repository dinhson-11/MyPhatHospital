package com.hospital.hmsai.pharmacy.service;

import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.pharmacy.dto.DispenseRequest;
import com.hospital.hmsai.pharmacy.dto.DispenseResponse;
import com.hospital.hmsai.pharmacy.entity.Dispense;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.repository.DispenseRepository;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.pharmacy.service.impl.DispenseServiceImpl;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DispenseServiceImplTest {

    @Mock
    private DispenseRepository dispenseRepository;

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private DrugRepository drugRepository;

    @Mock
    private StaffProfileRepository staffProfileRepository;

    @InjectMocks
    private DispenseServiceImpl dispenseService;

    private Prescription prescription;
    private Visit visit;
    private Drug paracetamol;
    private StaffProfile pharmacist;

    @BeforeEach
    void setUp() {
        paracetamol = Drug.builder()
                .id(1L)
                .code("DRUG-PARA-500")
                .name("Paracetamol 500mg")
                .unit("Viên")
                .price(new BigDecimal("1500"))
                .stockQuantity(100)
                .build();

        Patient patient = Patient.builder()
                .id(1L)
                .fullName("Nguyễn Văn A")
                .patientCode("BN-2026-0001")
                .build();

        User doctorUser = User.builder().id(10L).fullName("BS. Lê Văn C").build();
        StaffProfile doctor = StaffProfile.builder().id(2L).user(doctorUser).specialty("Nội tổng quát").build();

        visit = Visit.builder()
                .id(100L)
                .patient(patient)
                .doctor(doctor)
                .status(VisitStatus.COMPLETED)
                .build();

        PrescriptionItem item = PrescriptionItem.builder()
                .id(10L)
                .drug(paracetamol)
                .dosage("500mg x 2 lần/ngày")
                .quantity(10)
                .instruction("Uống sau ăn")
                .build();

        List<PrescriptionItem> items = new ArrayList<>();
        items.add(item);

        prescription = Prescription.builder()
                .id(50L)
                .visit(visit)
                .items(items)
                .build();

        User pharmUser = User.builder().id(20L).fullName("DS. Đỗ Thị Mai").build();
        pharmacist = StaffProfile.builder().id(5L).user(pharmUser).specialty("Dược").build();
    }

    private void stubLockedPrescription() {
        when(prescriptionRepository.findByIdWithItemsForUpdate(50L)).thenReturn(Optional.of(prescription));
        when(dispenseRepository.existsByPrescriptionId(50L)).thenReturn(false);
    }

    @Test
    @DisplayName("Cấp phát thuốc thành công: trừ tồn kho và lưu bản ghi Dispense")
    void dispensePrescription_Success() {
        stubLockedPrescription();
        when(staffProfileRepository.findByUserId(20L)).thenReturn(Optional.of(pharmacist));
        when(drugRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(paracetamol));
        when(drugRepository.save(any(Drug.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Dispense savedDispense = Dispense.builder()
                .id(1L)
                .prescription(prescription)
                .dispensedBy(pharmacist)
                .dispensedAt(LocalDateTime.now())
                .build();
        when(dispenseRepository.save(any(Dispense.class))).thenReturn(savedDispense);

        DispenseResponse response = dispenseService.dispensePrescription(50L, new DispenseRequest("Đã cấp đủ thuốc"), 20L);

        assertNotNull(response);
        assertEquals(50L, response.getPrescriptionId());
        assertEquals("Nguyễn Văn A", response.getPatientName());
        assertEquals("DS. Đỗ Thị Mai", response.getDispensedByName());
        assertEquals(1, response.getItems().size());
        assertEquals(90, response.getItems().get(0).getRemainingStock()); // 100 - 10 = 90
        assertEquals(90, paracetamol.getStockQuantity());

        verify(drugRepository).findByIdForUpdate(1L);
        verify(drugRepository).save(paracetamol);
        verify(dispenseRepository).save(any(Dispense.class));
    }

    @Test
    @DisplayName("Cấp phát thất bại khi không tìm thấy đơn thuốc")
    void dispensePrescription_NotFound_ThrowsException() {
        when(prescriptionRepository.findByIdWithItemsForUpdate(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                dispenseService.dispensePrescription(999L, null, 20L));
    }

    @Test
    @DisplayName("Cấp phát thất bại khi đơn thuốc đã được cấp phát trước đó")
    void dispensePrescription_AlreadyDispensed_ThrowsBusinessException() {
        when(prescriptionRepository.findByIdWithItemsForUpdate(50L)).thenReturn(Optional.of(prescription));
        when(dispenseRepository.existsByPrescriptionId(50L)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                dispenseService.dispensePrescription(50L, null, 20L));
        assertTrue(ex.getMessage().contains("đã được cấp phát trước đó"));
    }

    @Test
    @DisplayName("Cấp phát thất bại khi tồn kho thuốc không đủ")
    void dispensePrescription_InsufficientStock_ThrowsBusinessException() {
        paracetamol.setStockQuantity(5); // Chỉ còn 5 nhưng đơn yêu cầu 10

        stubLockedPrescription();
        when(staffProfileRepository.findByUserId(20L)).thenReturn(Optional.of(pharmacist));
        when(drugRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(paracetamol));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                dispenseService.dispensePrescription(50L, null, 20L));
        assertTrue(ex.getMessage().contains("không đủ tồn kho"));
        verify(drugRepository, never()).save(any());
        verify(dispenseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hai dòng cùng một thuốc được cộng dồn khi kiểm tra tồn kho (không để tồn kho âm)")
    void dispensePrescription_DuplicateLinesAggregated_InsufficientStock() {
        paracetamol.setStockQuantity(15); // mỗi dòng 10 (≤ 15) nhưng tổng 20 > 15
        prescription.getItems().add(PrescriptionItem.builder()
                .id(11L).drug(paracetamol).dosage("500mg").quantity(10).build());

        stubLockedPrescription();
        when(staffProfileRepository.findByUserId(20L)).thenReturn(Optional.of(pharmacist));
        when(drugRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(paracetamol));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                dispenseService.dispensePrescription(50L, null, 20L));
        assertTrue(ex.getMessage().contains("Cần cấp: 20"));
        assertEquals(15, paracetamol.getStockQuantity());
        verify(drugRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hai dòng cùng một thuốc: khóa thuốc một lần, trừ kho đúng tổng số lượng")
    void dispensePrescription_DuplicateLinesAggregated_Success() {
        prescription.getItems().add(PrescriptionItem.builder()
                .id(11L).drug(paracetamol).dosage("500mg").quantity(5).build());

        stubLockedPrescription();
        when(staffProfileRepository.findByUserId(20L)).thenReturn(Optional.of(pharmacist));
        when(drugRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(paracetamol));
        when(dispenseRepository.save(any(Dispense.class))).thenAnswer(inv -> inv.getArgument(0));

        DispenseResponse response = dispenseService.dispensePrescription(50L, null, 20L);

        assertEquals(85, paracetamol.getStockQuantity()); // 100 - (10 + 5)
        assertEquals(2, response.getItems().size());
        verify(drugRepository, times(1)).findByIdForUpdate(1L);
        verify(drugRepository, times(1)).save(paracetamol);
    }

    @Test
    @DisplayName("Không cấp phát thuốc đã hết hạn")
    void dispensePrescription_ExpiredDrug_Rejected() {
        paracetamol.setExpiryDate(LocalDate.now().minusDays(1));

        stubLockedPrescription();
        when(staffProfileRepository.findByUserId(20L)).thenReturn(Optional.of(pharmacist));
        when(drugRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(paracetamol));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                dispenseService.dispensePrescription(50L, null, 20L));
        assertTrue(ex.getMessage().contains("hết hạn"));
        assertEquals(100, paracetamol.getStockQuantity());
        verify(dispenseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không cấp phát khi ca khám chưa hoàn tất (bác sĩ chưa chốt đơn)")
    void dispensePrescription_VisitNotCompleted_Rejected() {
        visit.setStatus(VisitStatus.IN_PROGRESS);
        stubLockedPrescription();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                dispenseService.dispensePrescription(50L, null, 20L));
        assertTrue(ex.getMessage().contains("chưa hoàn tất"));
        verifyNoInteractions(drugRepository);
    }

    @Test
    @DisplayName("Không cấp phát khi tài khoản không có hồ sơ dược sĩ (không ghi nhận thay người khác)")
    void dispensePrescription_MissingPharmacistProfile_Rejected() {
        stubLockedPrescription();
        when(staffProfileRepository.findByUserId(20L)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                dispenseService.dispensePrescription(50L, null, 20L));
        assertTrue(ex.getMessage().contains("hồ sơ nhân viên"));
        verify(staffProfileRepository, never()).findAll();
        verifyNoInteractions(drugRepository);
        verify(dispenseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Kiểm tra trạng thái cấp phát của đơn thuốc")
    void isDispensed_ReturnsCorrectStatus() {
        when(dispenseRepository.existsByPrescriptionId(50L)).thenReturn(true);
        when(dispenseRepository.existsByPrescriptionId(51L)).thenReturn(false);

        assertTrue(dispenseService.isDispensed(50L));
        assertFalse(dispenseService.isDispensed(51L));
    }
}
