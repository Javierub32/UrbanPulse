package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.UrbanContextEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UrbanContextRepository extends JpaRepository<UrbanContextEntity, UUID> {
    Optional<UrbanContextEntity> findByIncident_IdAndKeyAndSource(UUID incidentId, String key, String source);

    List<UrbanContextEntity> findAllByIncident_IdOrderByKeyAsc(UUID incidentId);

    List<UrbanContextEntity> findAllByIncident_IdAndKeyInOrderByKeyAsc(UUID incidentId, List<String> keys);
}
