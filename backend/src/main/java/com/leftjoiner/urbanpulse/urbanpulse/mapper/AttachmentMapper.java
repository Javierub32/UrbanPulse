package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.AttachmentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.AttachmentEntity;
import java.time.ZoneOffset;
import org.springframework.stereotype.Component;

@Component
public class AttachmentMapper extends MapperDTO<AttachmentResponse, AttachmentEntity> {
    @Override
    public AttachmentResponse toDTO(AttachmentEntity entity) {
        Object type = entity.getMetadata() == null ? null : entity.getMetadata().get("contentType");
        return new AttachmentResponse(entity.getId(), entity.getType(), entity.getName(), entity.getSize(),
                type instanceof String value ? value : null,
                entity.getCreatedAt() == null ? null : entity.getCreatedAt().toInstant(ZoneOffset.UTC));
    }
}
