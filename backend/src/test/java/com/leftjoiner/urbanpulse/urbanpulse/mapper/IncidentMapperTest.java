package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;

class IncidentMapperTest {
    private final IncidentMapper mapper = new IncidentMapper();

    @Test
    void mapsIncidentCoordinatesToPublicListItem() {
        IncidentEntity incident = new IncidentEntity();
        incident.setId(UUID.randomUUID());
        incident.setTitle("Farola apagada");
        incident.setCategory(IncidentCategory.STREET_LIGHTING);
        incident.setStatus(IncidentStatus.REPORTED);
        incident.setRegisteredAt(LocalDateTime.of(2026, 10, 1, 9, 0));
        incident.setLocation(new GeometryFactory().createPoint(new Coordinate(-4.4214, 36.7213)));

        var result = mapper.toListItemDTO(incident);

        assertEquals(incident.getId(), result.getId());
        assertEquals(incident.getTitle(), result.getTitle());
        assertEquals(incident.getCategory(), result.getCategory());
        assertEquals(incident.getStatus(), result.getStatus());
        assertEquals(incident.getRegisteredAt(), result.getRegisteredAt());
        assertEquals(36.7213, result.getLatitude());
        assertEquals(-4.4214, result.getLongitude());
    }

    @Test
    void mapsIncidentWithoutLocation() {
        IncidentEntity incident = new IncidentEntity();

        var result = mapper.toListItemDTO(incident);

        assertNull(result.getLatitude());
        assertNull(result.getLongitude());
    }
}
