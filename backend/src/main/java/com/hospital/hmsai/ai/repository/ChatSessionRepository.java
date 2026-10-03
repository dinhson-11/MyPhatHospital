package com.hospital.hmsai.ai.repository;

import com.hospital.hmsai.ai.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<ChatSession> findAllByOrderByCreatedAtDesc();
}
