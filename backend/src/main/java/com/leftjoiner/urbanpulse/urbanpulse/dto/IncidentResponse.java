package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.Priority;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class IncidentResponse {
    private UUID id;
    private UUID userId;
    private String title;
    private String description;
    private IncidentCategory category;
    private Double latitude;
    private Double longitude;
    private Priority priority;
    private IncidentStatus status;
    private LocalDateTime registeredAt;
    private LocalDateTime updatedAt;
}
