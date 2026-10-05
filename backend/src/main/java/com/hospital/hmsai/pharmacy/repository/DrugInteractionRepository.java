package com.hospital.hmsai.pharmacy.repository;

import com.hospital.hmsai.pharmacy.entity.DrugInteraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/**
 * Repository cho entity DrugInteraction.
 */
@Repository
public interface DrugInteractionRepository extends JpaRepository<DrugInteraction, Long> {

    @Query("SELECT di FROM DrugInteraction di " +
           "JOIN FETCH di.drugA " +
           "JOIN FETCH di.drugB " +
           "WHERE (di.drugA.id = :drugAId AND di.drugB.id = :drugBId) " +
           "   OR (di.drugA.id = :drugBId AND di.drugB.id = :drugAId)")
    List<DrugInteraction> findInteractionsBetweenDrugs(@Param("drugAId") Long drugAId, @Param("drugBId") Long drugBId);

    @Query("SELECT di FROM DrugInteraction di " +
           "JOIN FETCH di.drugA " +
           "JOIN FETCH di.drugB " +
           "WHERE di.drugA.id IN :drugIds AND di.drugB.id IN :drugIds")
    List<DrugInteraction> findInteractionsAmongDrugs(@Param("drugIds") Collection<Long> drugIds);

    @Query("SELECT di FROM DrugInteraction di " +
           "JOIN FETCH di.drugA " +
           "JOIN FETCH di.drugB")
    List<DrugInteraction> findAllWithDrugs();
}
