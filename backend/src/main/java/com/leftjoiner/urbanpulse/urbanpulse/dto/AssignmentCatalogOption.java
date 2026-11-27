package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AssignmentCatalogOption {
    private final Kind kind;
    private final UUID id;
    private final UUID departmentId;
    private final String name;
    private final long assignedCount;

    public enum Kind {
        DEPARTMENT, TEAM, TECHNICIAN
    }
}
