package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.List;
import lombok.Getter;

@Getter
public class IncidentDetailResponse extends IncidentResponse {
    private final List<IncidentHistoryResponse> history;

    public IncidentDetailResponse(IncidentResponse incident, List<IncidentHistoryResponse> history) {
        super(
                incident.getId(),
                incident.getUserId(),
                incident.getTitle(),
                incident.getDescription(),
                incident.getCategory(),
                incident.getLatitude(),
                incident.getLongitude(),
                incident.getPriority(),
                incident.getStatus(),
                incident.getRegisteredAt(),
                incident.getUpdatedAt());
        this.history = List.copyOf(history);
    }
}
