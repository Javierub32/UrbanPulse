package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentHistoryResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.StatusChangeEntity;
import org.springframework.stereotype.Component;

@Component
public class StatusChangeMapper {

    public IncidentHistoryResponse toDTO(StatusChangeEntity change, boolean includeActorName) {
        return new IncidentHistoryResponse(
                change.getPreviousStatus(),
                change.getStatus(),
                change.getChangedAt(),
                change.getUser() == null ? null : change.getUser().getId(),
                change.getReason(), change.getComment(),
                includeActorName && change.getUser() != null ? change.getUser().getName() : null);
    }
}