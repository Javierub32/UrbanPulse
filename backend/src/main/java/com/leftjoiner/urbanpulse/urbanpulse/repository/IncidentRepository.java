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
}
