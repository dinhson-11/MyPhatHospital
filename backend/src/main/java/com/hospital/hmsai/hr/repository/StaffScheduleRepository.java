package com.hospital.hmsai.hr.repository;

import com.hospital.hmsai.hr.entity.StaffSchedule;
import com.hospital.hmsai.hr.entity.WorkShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StaffScheduleRepository extends JpaRepository<StaffSchedule, Long> {

    @Query("SELECT s FROM StaffSchedule s " +
           "JOIN FETCH s.staffProfile sp " +
           "JOIN FETCH sp.user " +
           "JOIN FETCH s.department " +
           "WHERE s.workDate BETWEEN :from AND :to " +
           "ORDER BY s.workDate ASC, s.shift ASC")
    List<StaffSchedule> findByDateRangeWithDetails(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT s FROM StaffSchedule s " +
           "JOIN FETCH s.staffProfile sp " +
           "JOIN FETCH sp.user " +
           "JOIN FETCH s.department " +
           "WHERE s.staffProfile.id = :staffId " +
           "AND s.workDate BETWEEN :from AND :to " +
           "ORDER BY s.workDate ASC")
    List<StaffSchedule> findByStaffAndDateRangeWithDetails(
            @Param("staffId") Long staffId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT s FROM StaffSchedule s " +
           "JOIN FETCH s.staffProfile sp " +
           "JOIN FETCH sp.user " +
           "JOIN FETCH s.department " +
           "WHERE s.department.id = :departmentId " +
           "AND s.workDate BETWEEN :from AND :to " +
           "ORDER BY s.workDate ASC, s.shift ASC")
    List<StaffSchedule> findByDepartmentAndDateRangeWithDetails(
            @Param("departmentId") Long departmentId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    boolean existsByStaffProfileIdAndWorkDateAndShift(Long staffId, LocalDate workDate, WorkShift shift);
}
