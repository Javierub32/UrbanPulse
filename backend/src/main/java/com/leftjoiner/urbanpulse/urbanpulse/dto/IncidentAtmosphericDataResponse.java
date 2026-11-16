package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class IncidentAtmosphericDataResponse {
    private String key;
    private String value;
    private String unit;
    private String source;
    private LocalDateTime observedAt;
}
