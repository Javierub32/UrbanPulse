package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentRepository extends JpaRepository<IncidentEntity, UUID> {
}
