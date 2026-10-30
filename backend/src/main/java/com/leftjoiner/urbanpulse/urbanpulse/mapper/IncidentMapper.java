package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

@Component
public class IncidentMapper extends MapperDTO<IncidentResponse, IncidentEntity> {
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    public IncidentEntity toEntity(IncidentRequest request) {
        IncidentEntity incident = new IncidentEntity();
        incident.setTitle(request.getTitle().trim());
        incident.setDescription(request.getDescription().trim());
        incident.setCategory(request.getCategory());
        incident.setLocation(geometryFactory.createPoint(new Coordinate(request.getLongitude(), request.getLatitude())));
        return incident;
    }

    @Override
    public IncidentResponse toDTO(IncidentEntity incident) {
        if (incident == null) return null;
        Point location = (Point) incident.getLocation();
        return new IncidentResponse(incident.getId(), incident.getUser().getId(), incident.getTitle(),
                incident.getDescription(), incident.getCategory(), location.getY(), location.getX(),
                incident.getPriority(), incident.getStatus(), incident.getRegisteredAt(), incident.getUpdatedAt());
    }
}
