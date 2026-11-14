package com.leftjoiner.urbanpulse.urbanpulse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.ContextType;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo.AtmosphericReading;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UrbanContextRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(properties = "spring.docker.compose.enabled=false")
class AtmosphericContextServiceIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private AtmosphericContextService service;
    @Autowired private UserRepository users;
    @Autowired private IncidentRepository incidents;
    @Autowired private UrbanContextRepository contexts;

    @Test
    void savesAtmosphericReadingsWithLocationAndUpdatesThemOnRetry() {
        UserEntity user = new UserEntity();
        user.setRole(UserRole.CITIZEN);
        user.setActive(true);
        user = users.saveAndFlush(user);

        IncidentEntity incident = new IncidentEntity();
        incident.setUser(user);
        incident.setTitle("Prueba atmosférica");
        incident.setDescription("Incidencia de integración");
        incident.setCategory(IncidentCategory.OTHER);
        incident.setStatus(IncidentStatus.REPORTED);
        incident.setRegisteredAt(LocalDateTime.of(2026, 11, 14, 14, 32));
        incident.setUpdatedAt(incident.getRegisteredAt());
        GeometryFactory factory = new GeometryFactory(new PrecisionModel(), 4326);
        incident.setLocation(factory.createPoint(new Coordinate(-4.4214, 36.7213)));
        incident = incidents.saveAndFlush(incident);

        List<AtmosphericReading> readings = List.of(
                reading("precipitation", "0.8", "mm", "Open-Meteo Weather API"),
                reading("pm2_5", "12.5", "μg/m³", "Open-Meteo Air Quality API / CAMS ENSEMBLE"));
        service.saveReadings(incident, readings);
        service.saveReadings(incident, List.of(
                reading("precipitation", "1.1", "mm", "Open-Meteo Weather API"), readings.get(1)));

        var saved = contexts.findAllByIncident_IdOrderByKeyAsc(incident.getId());
        assertEquals(2, saved.size());
        var air = saved.stream().filter(item -> "pm2_5".equals(item.getKey())).findFirst().orElseThrow();
        var weather = saved.stream().filter(item -> "precipitation".equals(item.getKey())).findFirst().orElseThrow();
        assertEquals(ContextType.ENVIRONMENT, air.getType());
        assertEquals(ContextType.WEATHER, weather.getType());
        assertEquals("12.5", air.getValue());
        assertEquals("1.1", weather.getValue());
        assertEquals("AVAILABLE", weather.getStatus());
        assertEquals("Open-Meteo Weather API", weather.getSource());
        assertEquals(LocalDateTime.of(2026, 11, 14, 14, 0), weather.getObservedAt());
        assertTrue(weather.getIngestedAt() != null);
        Point grid = (Point) weather.getGeometry();
        assertEquals(4326, grid.getSRID());
        assertEquals(-4.42, grid.getX());
        assertEquals(36.72, grid.getY());
        assertEquals(-4.4214, weather.getMetadata().get("requestedLongitude"));
    }

    private static AtmosphericReading reading(String variable, String value, String unit, String source) {
        return new AtmosphericReading(variable, new BigDecimal(value), unit,
                Instant.parse("2026-11-14T14:00:00Z"), 36.72, -4.42, source);
    }
}
