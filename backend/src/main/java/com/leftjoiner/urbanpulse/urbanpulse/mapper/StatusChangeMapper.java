package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentHistoryResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.StatusChangeEntity;
import org.springframework.stereotype.Component;

@Component
public class StatusChangeMapper {

    public IncidentHistoryResponse toDTO(StatusChangeEntity change) {
        return new IncidentHistoryResponse(
                change.getPreviousStatus(),
                change.getStatus(),
                change.getChangedAt());
    }
}