package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup.StreetClient;
import com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup.StreetLookupUnavailableException;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StreetIncidentEnrichmentService {
    private final StreetClient streetClient;
    private final IncidentRepository incidentRepository;

    public void enrich(IncidentEntity incident) {
        if (incident == null || incident.getId() == null) {
            throw new IllegalArgumentException("La incidencia debe estar guardada antes de buscar su calle.");
        }
        if (!(incident.getLocation() instanceof Point location)) {
            throw new IllegalArgumentException("La incidencia debe tener una ubicación puntual.");
        }

        double latitude = location.getY();
        double longitude = location.getX();
        Optional<String> street = fetchStreet(latitude, longitude);
        if (street.isPresent()) saveStreet(incident, street.get());
    }

    private Optional<String> fetchStreet(double latitude, double longitude) {
        try {
            return streetClient.findStreet(latitude, longitude);
        } catch (StreetLookupUnavailableException ignored) {
            return Optional.empty();
        }
    }

    private void saveStreet(IncidentEntity incident, String street) {
        incident.setNormalizedAddress(street);
        incidentRepository.save(incident);
    }
}
