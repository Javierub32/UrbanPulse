package com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo;

import java.math.BigDecimal;
import java.time.Instant;

public record AtmosphericReading(
        String variable,
        BigDecimal value,
        String unit,
        Instant validAt,
        double gridLatitude,
        double gridLongitude,
        String source) {
}
