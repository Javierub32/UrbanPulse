package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UrbanContextEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.ContextType;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.AtmosphericReading;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UrbanContextRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AtmosphericContextService {
    private final UrbanContextRepository urbanContextRepository;
    private final Clock clock;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional
    public List<UrbanContextEntity> saveReadings(IncidentEntity incident, List<AtmosphericReading> readings) {
        //Si la incidencia no se ha guardado, no puede asociar datos
        if (incident == null || incident.getId() == null) {
            throw new IllegalArgumentException("La incidencia debe estar guardada antes de asociar datos atmosféricos.");
        }
        //Si la incidencia no tiene ubicaicón, no puede asociar datos
        if (!(incident.getLocation() instanceof Point incidentPoint)) {
            throw new IllegalArgumentException("La incidencia debe tener una ubicación puntual.");
        }

        Map<String, AtmosphericReading> latestByVariableAndSource = new LinkedHashMap<>();
        for (AtmosphericReading reading : readings) {
            if (reading == null || reading.validAt() == null || reading.value() == null
                    || reading.unit() == null || reading.source() == null) {
                throw new IllegalArgumentException("La lectura atmosférica está incompleta.");
            }
            contextType(reading.variable());
            latestByVariableAndSource.put(reading.variable() + "|" + reading.source(), reading);
        }

        LocalDateTime ingestedAt = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        return latestByVariableAndSource.values().stream()
                .map(reading -> saveReading(incident, incidentPoint, reading, ingestedAt))
                .toList();
    }
    //Guarda en la incidencia los datos atmosféricos asociados.
    private UrbanContextEntity saveReading(IncidentEntity incident, Point incidentPoint,
            AtmosphericReading reading, LocalDateTime ingestedAt) {
        UrbanContextEntity context = urbanContextRepository
                .findByIncident_IdAndKeyAndSource(incident.getId(), reading.variable(), reading.source())
                .orElseGet(UrbanContextEntity::new);
        context.setIncident(incident);
        context.setType(contextType(reading.variable()));
        context.setKey(reading.variable());
        context.setValue(reading.value().toPlainString());
        context.setUnit(reading.unit());
        context.setGeometry(geometryFactory.createPoint(
                new Coordinate(reading.gridLongitude(), reading.gridLatitude())));
        context.setObservedAt(LocalDateTime.ofInstant(reading.validAt(), ZoneOffset.UTC));
        context.setIngestedAt(ingestedAt);
        context.setSource(reading.source());
        context.setStatus("AVAILABLE");
        context.setMetadata(Map.of(
                "requestedLatitude", incidentPoint.getY(),
                "requestedLongitude", incidentPoint.getX(),
                "gridLatitude", reading.gridLatitude(),
                "gridLongitude", reading.gridLongitude(),
                "modelled", true));
        return urbanContextRepository.save(context);
    }
    //Comprueba si los datos son correctos.
    private static ContextType contextType(String variable) {
        return switch (variable) {
            case "precipitation" -> ContextType.WEATHER;
            case "pm2_5", "pm10", "nitrogen_dioxide" -> ContextType.ENVIRONMENT;
            default -> throw new IllegalArgumentException("Variable atmosférica no admitida: " + variable);
        };
    }
}
