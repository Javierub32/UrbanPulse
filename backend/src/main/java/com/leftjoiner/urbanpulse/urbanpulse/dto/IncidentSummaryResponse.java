package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.time.LocalDate;
import java.util.Map;

public record IncidentSummaryResponse(
        long total,
        Map<String, Long> byStatus,
        Map<String, Long> byCategory,
        Map<LocalDate, Long> byDay) {
}
