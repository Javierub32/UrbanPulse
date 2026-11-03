package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import org.springframework.security.authentication.BadCredentialsException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.IncidentMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;
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
        user.setActive(true);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(incidents.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        IncidentRequest request = request();
        var response = service.create(request, user.getId());
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
        IncidentRequest request = request();
        UUID id = UUID.randomUUID();
        when(users.findById(id)).thenReturn(Optional.empty());
        assertThrows(BadCredentialsException.class, () -> service.create(request, id));
        verifyNoInteractions(incidents);
    }

    @Test
    void rejectsInactiveOrUnspecifiedAccountStateWithoutSaving() {
        var incidents = mock(IncidentRepository.class);
        var users = mock(UserRepository.class);
        var service = new IncidentService(incidents, users, new IncidentMapper());
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        assertThrows(BadCredentialsException.class, () -> service.create(request(), user.getId()));
        user.setActive(false);
        assertThrows(BadCredentialsException.class, () -> service.create(request(), user.getId()));
        verifyNoInteractions(incidents);
    }

    private IncidentRequest request() {
        IncidentRequest request = new IncidentRequest();
        request.setTitle(" Farola ");
        request.setDescription(" Apagada ");
        request.setCategory(IncidentCategory.STREET_LIGHTING);
        request.setLatitude(40.4);
        request.setLongitude(-3.7);
        return request;
    }
}
