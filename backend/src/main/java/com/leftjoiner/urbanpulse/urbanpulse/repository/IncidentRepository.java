package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface IncidentRepository extends JpaRepository<IncidentEntity, UUID> {
    List<IncidentEntity> findAllByOrderByRegisteredAtDescIdDesc();

    Page<IncidentEntity> findAllByStatus(com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus status, Pageable pageable);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from IncidentEntity i where i.id = :id")
    Optional<IncidentEntity> findForReview(@org.springframework.data.repository.query.Param("id") UUID id);

    Page<IncidentEntity> findAllByUserId(UUID userId, Pageable pageable);

    Optional<IncidentEntity> findByIdAndUserId(UUID incidentId, UUID userId);

    List<IncidentEntity> findAllByUserIdOrderByRegisteredAtDescIdDesc(UUID userId);

    @org.springframework.data.jpa.repository.Query(value = """
        SELECT i.* FROM "Incident" i WHERE EXISTS (
            SELECT 1 FROM "IncidentTechnicianAccess" a
            WHERE a."incidentId" = i."id" AND a."technicianId" = :userId
        )
        ORDER BY i."registeredAt" DESC, i."id" DESC
        """, nativeQuery = true)
    List<IncidentEntity> findAssignedTo(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query(value = """
        SELECT i.* FROM "Incident" i WHERE i."id" = :incidentId AND EXISTS (
            SELECT 1 FROM "IncidentTechnicianAccess" a
            WHERE a."incidentId" = i."id" AND a."technicianId" = :userId
        )
        """, nativeQuery = true)
    Optional<IncidentEntity> findAssignedById(@org.springframework.data.repository.query.Param("incidentId") UUID incidentId,
                                              @org.springframework.data.repository.query.Param("userId") UUID userId);
}
