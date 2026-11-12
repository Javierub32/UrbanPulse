package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.StatusChangeEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StatusChangeRepository extends JpaRepository<StatusChangeEntity, UUID> {
  List<StatusChangeEntity> findAllByIncidentIdOrderByChangedAtAsc(UUID incidentId);
}