package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.Priority;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Getter;

@Getter
public class IncidentDetailResponse {
    private final UUID id;
    private final String title;
    private final String description;
    private final IncidentCategory category;
    private final Double latitude;
    private final Double longitude;
    private final Priority priority;
    private final IncidentStatus status;
    private final LocalDateTime registeredAt;
    private final LocalDateTime updatedAt;
    private final List<IncidentHistoryResponse> history;

    public IncidentDetailResponse(IncidentResponse incident, List<IncidentHistoryResponse> history) {
        this.id = incident.getId();
        this.title = incident.getTitle();
        this.description = incident.getDescription();
        this.category = incident.getCategory();
        this.latitude = incident.getLatitude();
        this.longitude = incident.getLongitude();
        this.priority = incident.getPriority();
        this.status = incident.getStatus();
        this.registeredAt = incident.getRegisteredAt();
        this.updatedAt = incident.getUpdatedAt();
        this.history = List.copyOf(history);
    }
}
