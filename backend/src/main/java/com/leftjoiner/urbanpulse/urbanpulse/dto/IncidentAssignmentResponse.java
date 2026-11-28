package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class IncidentAssignmentResponse {
    private final String department;
    private final String team;
    private final UUID technicianId;
    private final String technicianName;
}
