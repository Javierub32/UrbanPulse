package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import org.springframework.security.authentication.BadCredentialsException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.IncidentMapper;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.AtmosphericContextMapper;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.StatusChangeMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.StatusChangeRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UrbanContextRepository;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class IncidentServiceTest {
    @Test
    void detailDoesNotLoadHistoryWhenNotFound() {
        var incidents = mock(IncidentRepository.class);
        var history = mock(StatusChangeRepository.class);
        var service = new IncidentService(incidents, mock(UserRepository.class), new IncidentMapper(), history,
                mock(StatusChangeMapper.class), mock(AtmosphericIncidentEnrichmentService.class), mock(StreetIncidentEnrichmentService.class),
                mock(UrbanContextRepository.class), new AtmosphericContextMapper());
        UUID incidentId = UUID.randomUUID();
        when(incidents.findById(incidentId)).thenReturn(Optional.empty());
        assertThrows(com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotFoundException.class,
                () -> service.getIncidentDetail(incidentId, new UrbanPulsePrincipal(UUID.randomUUID(), UserRole.OPERATOR)));
        verify(incidents).findById(incidentId);
        verifyNoInteractions(history);
    }
    @Test
    void createsReportedIncidentWithNoPriorityAndWgs84Location() {
        var incidents = mock(IncidentRepository.class);
        var users = mock(UserRepository.class);
        var mapper = new IncidentMapper();
        var streetEnrichment = mock(StreetIncidentEnrichmentService.class);
        var service = new IncidentService(incidents, users, mapper,
                mock(StatusChangeRepository.class), mock(StatusChangeMapper.class),
                mock(AtmosphericIncidentEnrichmentService.class), streetEnrichment,
                mock(UrbanContextRepository.class),
                new AtmosphericContextMapper());
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

        var order = inOrder(incidents, streetEnrichment);
        order.verify(incidents).save(any());
        order.verify(streetEnrichment).enrich(any());
    }

    @Test
    void usesSelectedRegistrationTimeAndKeepsUpdateTimeCurrent() {
        var incidents = mock(IncidentRepository.class);
        var users = mock(UserRepository.class);
        var service = new IncidentService(incidents, users, new IncidentMapper(),
                mock(StatusChangeRepository.class), mock(StatusChangeMapper.class),
                mock(AtmosphericIncidentEnrichmentService.class), mock(StreetIncidentEnrichmentService.class), mock(UrbanContextRepository.class),
                new AtmosphericContextMapper());
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setActive(true);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(incidents.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        Instant selected = Instant.parse("2026-11-13T15:20:00Z");
        IncidentRequest request = request();
        request.setRegisteredAt(selected);

        var response = service.create(request, user.getId());

        assertEquals(LocalDateTime.ofInstant(selected, ZoneOffset.UTC), response.getRegisteredAt());
        assertNotNull(response.getUpdatedAt());
    }

    @Test
    void rejectsUnknownUserWithoutSaving() {
        var incidents = mock(IncidentRepository.class);
        var users = mock(UserRepository.class);
        var mapper = new IncidentMapper();
        var service = new IncidentService(incidents, users, mapper,
                mock(StatusChangeRepository.class), mock(StatusChangeMapper.class),
                mock(AtmosphericIncidentEnrichmentService.class), mock(StreetIncidentEnrichmentService.class), mock(UrbanContextRepository.class),
                new AtmosphericContextMapper());
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
        var service = new IncidentService(incidents, users, new IncidentMapper(),
                mock(StatusChangeRepository.class), mock(StatusChangeMapper.class),
                mock(AtmosphericIncidentEnrichmentService.class), mock(StreetIncidentEnrichmentService.class), mock(UrbanContextRepository.class),
                new AtmosphericContextMapper());
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
