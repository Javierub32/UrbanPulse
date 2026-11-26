package com.leftjoiner.urbanpulse.urbanpulse.dto;

import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class IncidentAssignmentRequest {
    @Size(max = 255)
    private String department;
    @Size(max = 255)
    private String team;
    private UUID technicianId;
}
