package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentHistoryResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.StatusChangeEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StatusChangeMapper {
    private final IncidentAssignmentMapper assignmentMapper;

    public IncidentHistoryResponse toDTO(StatusChangeEntity change, boolean operatorView) {
        return new IncidentHistoryResponse(
                change.getPreviousStatus(),
                change.getStatus(),
                change.getChangedAt(),
                change.getUser() == null ? null : change.getUser().getId(),
                change.getReason(), change.getComment(),
                operatorView && change.getUser() != null ? change.getUser().getName() : null,
                operatorView && change.getAssignment() != null ? assignmentMapper.toDTO(change.getAssignment()) : null);
    }
}