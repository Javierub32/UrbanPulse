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

    Page<IncidentEntity> findAllByUserId(UUID userId, Pageable pageable);

    Optional<IncidentEntity> findByIdAndUserId(UUID incidentId, UUID userId);

    List<IncidentEntity> findAllByUserIdOrderByRegisteredAtDescIdDesc(UUID userId);

    @org.springframework.data.jpa.repository.Query("""
        select i from IncidentEntity i where exists
        (select a.id from AssignmentEntity a where a.incident = i and a.technician.id = :userId)
        order by i.registeredAt desc, i.id desc
        """)
    List<IncidentEntity> findAssignedTo(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query("""
        select i from IncidentEntity i where i.id = :incidentId and exists
        (select a.id from AssignmentEntity a where a.incident = i and a.technician.id = :userId)
        """)
    Optional<IncidentEntity> findAssignedById(@org.springframework.data.repository.query.Param("incidentId") UUID incidentId,
                                              @org.springframework.data.repository.query.Param("userId") UUID userId);
}
