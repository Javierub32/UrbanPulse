package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.AtmosphericReading;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.OpenMeteoClient;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.OpenMeteoException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AtmosphericIncidentEnrichmentService {
    private final OpenMeteoClient openMeteoClient;
    private final AtmosphericContextService atmosphericContextService;

    public void enrich(IncidentEntity incident) {
        if (incident == null || incident.getId() == null) {
            throw new IllegalArgumentException("La incidencia debe estar guardada antes de consultar datos atmosféricos.");
        }
        if (incident.getRegisteredAt() == null) {
            throw new IllegalArgumentException("La incidencia debe tener fecha de registro antes de consultar datos atmosféricos.");
        }
        if (!(incident.getLocation() instanceof Point location)) {
            throw new IllegalArgumentException("La incidencia debe tener una ubicación puntual.");
        }

        double latitude = location.getY();
        double longitude = location.getX();
        var registeredAt = incident.getRegisteredAt().toInstant(ZoneOffset.UTC);
        List<AtmosphericReading> readings = new ArrayList<>();
        readings.addAll(fetchPrecipitation(latitude, longitude, registeredAt));
        readings.addAll(fetchAirQuality(latitude, longitude, registeredAt));

        if (!readings.isEmpty()) atmosphericContextService.saveReadings(incident, readings);
    }

    private List<AtmosphericReading> fetchPrecipitation(double latitude, double longitude, Instant registeredAt) {
        try {
            return openMeteoClient.fetchPrecipitation(latitude, longitude, registeredAt);
        } catch (OpenMeteoException ignored) {
            return List.of();
        }
    }

    private List<AtmosphericReading> fetchAirQuality(double latitude, double longitude, Instant registeredAt) {
        try {
            return openMeteoClient.fetchAirQuality(latitude, longitude, registeredAt);
        } catch (OpenMeteoException ignored) {
            return List.of();
        }
    }
}
