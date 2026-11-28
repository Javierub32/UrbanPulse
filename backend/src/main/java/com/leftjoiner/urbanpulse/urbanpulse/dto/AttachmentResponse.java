package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AttachmentType;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AttachmentResponse {
    private final UUID id;
    private final AttachmentType type;
    private final String name;
    private final Long size;
    private final String contentType;
    private final Instant createdAt;
}
