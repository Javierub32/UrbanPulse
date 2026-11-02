package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.List;
import lombok.Getter;

@Getter
public class IncidentPageResponse {
  private final List<IncidentSummaryResponse> items;

  public IncidentPageResponse(IncidentResponse incident,
                              List<IncidentHistoryResponse> items){
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
      incident.getUpdatedAt()
    );
    this.items = List.copyOf(items);
  }
}