package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class IncidentHistoryResponse {
    private IncidentStatus previousStatus;
    private IncidentStatus status;
    private LocalDateTime changedAt;
}
