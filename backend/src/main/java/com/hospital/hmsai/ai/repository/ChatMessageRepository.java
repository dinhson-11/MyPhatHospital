package com.hospital.hmsai.ai.repository;

import com.hospital.hmsai.ai.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    long countBySessionId(Long sessionId);

    Optional<ChatMessage> findFirstBySessionIdOrderByCreatedAtDesc(Long sessionId);
}
