package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class IncidentResponse {
    private String title;
    private String description;
    private IncidentCategory category;
    private IncidentStatus status;
}
