package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.AttachmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttachmentRepository extends JpaRepository<AttachmentEntity, UUID> {
    long countByIncident_Id(UUID incidentId);

    List<AttachmentEntity> findAllByIncident_IdOrderByCreatedAtAscIdAsc(UUID incidentId);

    Optional<AttachmentEntity> findByIdAndIncident_Id(UUID id, UUID incidentId);
}
