package com.hospital.hmsai.ai.repository;

import com.hospital.hmsai.ai.entity.ChatSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /** Phiên chat có thuộc về bệnh nhân (tài khoản) đang đăng nhập không. */
    boolean existsByIdAndPatient_User_UsernameIgnoreCase(Long id, String username);

    /** Các phiên gần nhất của một bệnh nhân, giới hạn bằng Pageable. */
    Page<ChatSession> findByPatientIdOrderByCreatedAtDesc(Long patientId, Pageable pageable);

    List<ChatSession> findAllByOrderByCreatedAtDesc();

    /** Các phiên gần nhất, giới hạn bằng Pageable (không nạp toàn bộ lịch sử chat). */
    Page<ChatSession> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
