package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.IncidentMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class IncidentServiceTest {
    @Test
    void createsReportedIncidentWithNoPriorityAndWgs84Location() {
        var incidents = mock(IncidentRepository.class);
        var users = mock(UserRepository.class);
        var mapper = new IncidentMapper();
        var service = new IncidentService(incidents, users, mapper);
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(incidents.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        IncidentRequest request = request(user.getId());
        var response = service.create(request);
        assertEquals(user.getId(), response.getUserId());
        assertEquals("Farola", response.getTitle());
        assertEquals(IncidentStatus.REPORTED, response.getStatus());
        assertNull(response.getPriority());
        assertEquals(response.getRegisteredAt(), response.getUpdatedAt());
        assertNotNull(response.getRegisteredAt());
        var entity = mapper.toEntity(request);
        Point point = (Point) entity.getLocation();
        assertEquals(4326, point.getSRID());
        assertEquals(-3.7, point.getX());
        assertEquals(40.4, point.getY());
    }

    @Test
    void rejectsUnknownUserWithoutSaving() {
        var incidents = mock(IncidentRepository.class);
        var users = mock(UserRepository.class);
        var mapper = new IncidentMapper();
        var service = new IncidentService(incidents, users, mapper);
        IncidentRequest request = request(UUID.randomUUID());
        when(users.findById(request.getUserId())).thenReturn(Optional.empty());
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.create(request));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verifyNoInteractions(incidents);
    }

    private IncidentRequest request(UUID userId) {
        IncidentRequest request = new IncidentRequest();
        request.setUserId(userId);
        request.setTitle(" Farola ");
        request.setDescription(" Apagada ");
        request.setCategory(IncidentCategory.STREET_LIGHTING);
        request.setLatitude(40.4);
        request.setLongitude(-3.7);
        return request;
    }
}
