package com.leftjoiner.urbanpulse.urbanpulse.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class IncidentAssignmentRequest {
    @NotNull(message = "Selecciona un departamento.")
    private UUID departmentId;
    private UUID teamId;
    private UUID technicianId;
}
