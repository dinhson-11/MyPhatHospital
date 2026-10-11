package com.hospital.hmsai.clinical.repository;

import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.entity.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm chứng các truy vấn tổng hợp (GROUP BY / giới hạn dòng) trên DB thật (H2), thay cho việc nạp toàn bộ
 * ca khám vào bộ nhớ rồi nhóm bằng Java.
 */
@SpringBootTest
@org.springframework.transaction.annotation.Transactional
@ActiveProfiles("test")
class VisitRepositoryAggregationTest {

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager em;

    @Autowired
    private VisitRepository visitRepository;

    private Patient patient;
    private StaffProfile doctor;

    @BeforeEach
    void setUp() {
        User user = User.builder().username("bs.agg").passwordHash("x").fullName("BS Test")
                .status(UserStatus.ACTIVE).build();
        em.persist(user);
        doctor = StaffProfile.builder().user(user).build();
        em.persist(doctor);
        patient = Patient.builder().patientCode("BN-TEST-001").fullName("Bệnh nhân").build();
        em.persist(patient);
    }

    private void visit(String code, String note, LocalDateTime at) {
        em.persist(Visit.builder().patient(patient).doctor(doctor).diagnosisCode(code).diagnosisNote(note)
                .visitTime(at).build());
    }

    @Test
    @DisplayName("Top chẩn đoán: GROUP BY mã, đếm đúng, bỏ ca chưa chẩn đoán, giới hạn số dòng, ghi chú mới nhất")
    void topDiagnosesAggregatedInDatabase() {
        LocalDateTime t = LocalDateTime.of(2026, 10, 1, 8, 0);
        visit("I10", "Tăng huyết áp (cũ)", t);
        visit("I10", "Tăng huyết áp vô căn", t.plusDays(1));
        visit("I10", null, t.plusDays(2));
        visit("E11", "Đái tháo đường typ 2", t);
        visit("E11", "Đái tháo đường typ 2", t.plusHours(1));
        visit("J06.9", "Viêm hô hấp trên", t);
        visit(null, null, t);
        visit("", null, t);
        em.flush();

        assertEquals(6, visitRepository.countWithDiagnosis());

        List<VisitRepository.DiagnosisCount> top2 = visitRepository.findTopDiagnosisCounts(PageRequest.of(0, 2));
        assertEquals(2, top2.size());
        assertEquals("I10", top2.get(0).getCode());
        assertEquals(3, top2.get(0).getCnt());
        assertEquals("E11", top2.get(1).getCode());
        assertEquals(2, top2.get(1).getCnt());

        List<String> notes = visitRepository.findLatestNotesByDiagnosisCode("I10", PageRequest.of(0, 1));
        assertEquals(List.of("Tăng huyết áp vô căn"), notes);
        assertTrue(visitRepository.findLatestNotesByDiagnosisCode("ZZZ", PageRequest.of(0, 1)).isEmpty());
    }
}
