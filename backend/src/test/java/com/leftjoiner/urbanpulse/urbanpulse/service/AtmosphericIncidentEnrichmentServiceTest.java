package com.leftjoiner.urbanpulse.urbanpulse.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyDouble;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.AtmosphericReading;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.OpenMeteoClient;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.OpenMeteoException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

class AtmosphericIncidentEnrichmentServiceTest {
    private final OpenMeteoClient client = mock(OpenMeteoClient.class);
    private final AtmosphericContextService contexts = mock(AtmosphericContextService.class);
    private final AtmosphericIncidentEnrichmentService service =
            new AtmosphericIncidentEnrichmentService(client, contexts);

    @Test
    void savesReadingsReturnedByBothSources() {
        IncidentEntity incident = incident();
        AtmosphericReading rain = reading("precipitation");
        AtmosphericReading air = reading("pm2_5");
        when(client.fetchPrecipitation(36.72, -4.42, Instant.parse("2026-11-14T14:32:00Z")))
                .thenReturn(List.of(rain));
        when(client.fetchAirQuality(36.72, -4.42, Instant.parse("2026-11-14T14:32:00Z")))
                .thenReturn(List.of(air));

        service.enrich(incident);

        verify(contexts).saveReadings(incident, List.of(rain, air));
    }

    @Test
    void doesNotSaveWhenSourcesHaveNoDataForTheIncidentTime() {
        IncidentEntity incident = incident();
        when(client.fetchPrecipitation(anyDouble(), anyDouble(), any(Instant.class)))
                .thenReturn(List.of());
        when(client.fetchAirQuality(anyDouble(), anyDouble(), any(Instant.class)))
                .thenReturn(List.of());

        assertDoesNotThrow(() -> service.enrich(incident));

        verifyNoInteractions(contexts);
    }

    @Test
    void keepsAvailableAirReadingsWhenPrecipitationSourceFails() {
        IncidentEntity incident = incident();
        AtmosphericReading air = reading("pm2_5");
        when(client.fetchPrecipitation(anyDouble(), anyDouble(), any(Instant.class)))
                .thenThrow(new OpenMeteoException("Weather source unavailable."));
        when(client.fetchAirQuality(anyDouble(), anyDouble(), any(Instant.class)))
                .thenReturn(List.of(air));

        assertDoesNotThrow(() -> service.enrich(incident));

        verify(contexts).saveReadings(incident, List.of(air));
    }

    @Test
    void keepsAvailablePrecipitationWhenAirQualitySourceFails() {
        IncidentEntity incident = incident();
        AtmosphericReading rain = reading("precipitation");
        when(client.fetchPrecipitation(anyDouble(), anyDouble(), any(Instant.class)))
                .thenReturn(List.of(rain));
        when(client.fetchAirQuality(anyDouble(), anyDouble(), any(Instant.class)))
                .thenThrow(new OpenMeteoException("Air quality source unavailable."));

        assertDoesNotThrow(() -> service.enrich(incident));

        verify(contexts).saveReadings(incident, List.of(rain));
    }

    @Test
    void retryFetchesAndSavesTheAvailableReadingsAgain() {
        IncidentEntity incident = incident();
        AtmosphericReading rain = reading("precipitation");
        when(client.fetchPrecipitation(anyDouble(), anyDouble(), any(Instant.class)))
                .thenReturn(List.of(rain));
        when(client.fetchAirQuality(anyDouble(), anyDouble(), any(Instant.class)))
                .thenReturn(List.of());

        service.enrich(incident);
        service.enrich(incident);

        verify(client, times(2)).fetchPrecipitation(36.72, -4.42, Instant.parse("2026-11-14T14:32:00Z"));
        verify(contexts, times(2)).saveReadings(incident, List.of(rain));
    }

    @Test
    void rejectsUnsavedOrUnlocatedIncidents() {
        IncidentEntity unsavedIncident = incident();
        unsavedIncident.setId(null);
        IncidentEntity unlocatedIncident = incident();
        unlocatedIncident.setLocation(null);

        assertThrows(IllegalArgumentException.class, () -> service.enrich(unsavedIncident));
        assertThrows(IllegalArgumentException.class, () -> service.enrich(unlocatedIncident));

        verifyNoInteractions(client, contexts);
    }

    private static IncidentEntity incident() {
        IncidentEntity incident = new IncidentEntity();
        incident.setId(UUID.randomUUID());
        incident.setRegisteredAt(LocalDateTime.of(2026, 11, 14, 14, 32));
        GeometryFactory factory = new GeometryFactory(new PrecisionModel(), 4326);
        Point location = factory.createPoint(new Coordinate(-4.42, 36.72));
        incident.setLocation(location);
        return incident;
    }

    private static AtmosphericReading reading(String variable) {
        return new AtmosphericReading(variable, BigDecimal.ONE, "unit",
                Instant.parse("2026-11-14T14:00:00Z"), 36.72, -4.42, "Open-Meteo");
    }
}
