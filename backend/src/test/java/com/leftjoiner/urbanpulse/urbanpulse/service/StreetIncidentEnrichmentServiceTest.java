package com.leftjoiner.urbanpulse.urbanpulse.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup.StreetClient;
import com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup.StreetLookupUnavailableException;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

class StreetIncidentEnrichmentServiceTest {
    private final StreetClient streetClient = mock(StreetClient.class);
    private final IncidentRepository incidentRepository = mock(IncidentRepository.class);
    private final StreetIncidentEnrichmentService service =
            new StreetIncidentEnrichmentService(streetClient, incidentRepository);

    @Test
    void savesTheStreetFoundForTheIncidentCoordinates() {
        IncidentEntity incident = incident();
        when(streetClient.findStreet(36.72, -4.42)).thenReturn(Optional.of("Calle Larios 12"));

        service.enrich(incident);

        assertEquals("Calle Larios 12", incident.getNormalizedAddress());
        verify(incidentRepository).save(incident);
    }

    @Test
    void leavesTheAddressEmptyWhenNoStreetIsFound() {
        IncidentEntity incident = incident();
        when(streetClient.findStreet(36.72, -4.42)).thenReturn(Optional.empty());

        service.enrich(incident);

        assertNull(incident.getNormalizedAddress());
        verifyNoInteractions(incidentRepository);
    }

    @Test
    void keepsTheIncidentFlowAvailableWhenTheStreetProviderFails() {
        IncidentEntity incident = incident();
        when(streetClient.findStreet(36.72, -4.42))
                .thenThrow(new StreetLookupUnavailableException("provider unavailable"));

        assertDoesNotThrow(() -> service.enrich(incident));

        assertNull(incident.getNormalizedAddress());
        verifyNoInteractions(incidentRepository);
    }

    @Test
    void rejectsAnIncidentThatHasNotBeenSavedOrHasNoPointLocation() {
        IncidentEntity unsaved = incident();
        unsaved.setId(null);
        IncidentEntity unlocated = incident();
        unlocated.setLocation(null);

        assertThrows(IllegalArgumentException.class, () -> service.enrich(unsaved));
        assertThrows(IllegalArgumentException.class, () -> service.enrich(unlocated));
        verifyNoInteractions(streetClient, incidentRepository);
    }

    private static IncidentEntity incident() {
        IncidentEntity incident = new IncidentEntity();
        incident.setId(UUID.randomUUID());
        GeometryFactory factory = new GeometryFactory(new PrecisionModel(), 4326);
        Point location = factory.createPoint(new Coordinate(-4.42, 36.72));
        incident.setLocation(location);
        return incident;
    }
}
