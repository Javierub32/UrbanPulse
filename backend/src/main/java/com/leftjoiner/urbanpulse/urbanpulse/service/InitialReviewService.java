package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.*;
import com.leftjoiner.urbanpulse.urbanpulse.entity.*;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotFoundException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.IncidentMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.*;
import java.time.*;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InitialReviewService {
    private final IncidentRepository incidents;
    private final StatusChangeRepository history;
    private final UserRepository users;
    private final IncidentMapper mapper;

    @Transactional(readOnly = true)
    public Page<IncidentListItemResponse> pending(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginación no válida.");
        return incidents.findAllByStatus(IncidentStatus.REPORTED, PageRequest.of(page, size,
            Sort.by(Sort.Order.asc("registeredAt"), Sort.Order.asc("id")))).map(mapper::toListItemDTO);
    }

    private IncidentEntity pendingIncident(UUID id) {
        IncidentEntity incident = incidents.findForReview(id).orElseThrow(IncidentNotFoundException::new);
        if (incident.getStatus() != IncidentStatus.REPORTED)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La incidencia ya no está pendiente de revisión.");
        return incident;
    }

    @Transactional
    public void edit(UUID id, ReviewEditRequest request, UUID actorId) {
        IncidentEntity incident = pendingIncident(id);
        Geometry point = new GeometryFactory(new PrecisionModel(), 4326)
            .createPoint(new Coordinate(request.longitude(), request.latitude()));
        List<String> changedFields = new ArrayList<>();
        if (!Objects.equals(incident.getCategory(), request.category())) changedFields.add("categoría");
        if (!Objects.equals(incident.getPriority(), request.priority())) changedFields.add("prioridad");
        boolean locationChanged = incident.getLocation() == null || !incident.getLocation().equalsExact(point);
        if (locationChanged) changedFields.add("ubicación");
        if (changedFields.isEmpty()) return;

        UserEntity actor = users.findById(actorId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        incident.setCategory(request.category());
        incident.setPriority(request.priority());
        if (locationChanged) {
            incident.setLocation(point);
            // The previous address cannot be assumed to describe the new coordinates.
            incident.setNormalizedAddress(null);
            incident.setNeighborhood(null);
            incident.setDistrict(null);
        }
        incident.setUpdatedAt(now);

        StatusChangeEntity change = new StatusChangeEntity();
        change.setIncident(incident);
        change.setUser(actor);
        change.setPreviousStatus(incident.getStatus());
        change.setStatus(incident.getStatus());
        change.setChangedAt(now);
        change.setReason(String.join(", ", changedFields));
        change.setComment("INCIDENT_EDITED");
        history.save(change);
    }

    @Transactional
    public void act(UUID id, UUID actorId, IncidentStatus target, String reason, String action) {
        IncidentEntity incident = pendingIncident(id);
        UserEntity actor = users.findById(actorId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        StatusChangeEntity change = new StatusChangeEntity();
        change.setIncident(incident);
        change.setUser(actor);
        change.setPreviousStatus(incident.getStatus());
        change.setStatus(target);
        change.setChangedAt(now);
        change.setReason(reason == null ? null : reason.strip());
        change.setComment(action);
        history.save(change);
        incident.setStatus(target);
        incident.setUpdatedAt(now);
    }
}
