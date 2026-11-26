package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.AssignmentEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<AssignmentEntity, UUID> {
}
