package com.hospital.hmsai.user.repository;

import com.hospital.hmsai.user.entity.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository cho entity StaffProfile.
 */
@Repository
public interface StaffProfileRepository extends JpaRepository<StaffProfile, Long> {

    Optional<StaffProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    java.util.List<StaffProfile> findByDepartmentId(Long departmentId);
}
