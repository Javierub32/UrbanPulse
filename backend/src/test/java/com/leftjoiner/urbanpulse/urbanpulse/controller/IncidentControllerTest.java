package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.config.JwtConfig;
import com.leftjoiner.urbanpulse.urbanpulse.config.SecurityConfig;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import com.leftjoiner.urbanpulse.urbanpulse.security.JwtService;
import com.leftjoiner.urbanpulse.urbanpulse.security.SecurityProblemHandler;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import java.util.List;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentDetailResponse;
import com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotFoundException;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentListItemResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import org.springframework.security.authentication.BadCredentialsException;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.configuration.SpringDocSpecPropertiesConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@Import({SecurityConfig.class,
        JwtConfig.class,
        JwtService.class,
        SecurityProblemHandler.class})
@WebMvcTest(IncidentController.class)
@EnableConfigurationProperties(SpringDocConfigProperties.class)
@ImportAutoConfiguration({SpringDocConfiguration.class, SpringDocSpecPropertiesConfiguration.class,
        SpringDocWebMvcConfiguration.class})
class IncidentControllerTest {
    @MockitoBean private UserRepository userRepository;

    @Autowired private MockMvc mockMvc;
    @MockitoBean private IncidentService service;
    @MockitoBean private com.leftjoiner.urbanpulse.urbanpulse.service.IncidentMapService incidentMapService;

    @Test
    void detailIsPublicAndDoesNotExposeTheAuthor() throws Exception {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        var response = new IncidentResponse(id, userId, "Farola", "Apagada", IncidentCategory.STREET_LIGHTING,
                40.4, -3.7, null, IncidentStatus.REPORTED, null, null);
        when(service.getIncidentDetail(id)).thenReturn(new IncidentDetailResponse(response, List.of()));
        mockMvc.perform(get("/api/incidents/{id}", id))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.description").value("Apagada"))
                .andExpect(jsonPath("$.userId").doesNotExist())
                .andExpect(jsonPath("$.history").isArray());
        verify(service).getIncidentDetail(id);
    }

    @Test
    void missingIncidentReturns404AndInvalidIdReturns400() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.getIncidentDetail(id)).thenThrow(new IncidentNotFoundException());
        mockMvc.perform(get("/api/incidents/{id}", id).with(SecurityMockMvcRequestPostProcessors.authentication(citizen())))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("INCIDENT_NOT_FOUND"));
        mockMvc.perform(get("/api/incidents/not-a-uuid").with(SecurityMockMvcRequestPostProcessors.authentication(citizen())))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void publicListIsAvailableWithoutAuthenticationAndReturnsMapCoordinates() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.listAllPublicIncidents()).thenReturn(List.of(
                new IncidentListItemResponse(id, "Farola", IncidentCategory.STREET_LIGHTING,
                        IncidentStatus.REPORTED, null, 40.4, -3.7)));

        mockMvc.perform(get("/api/incidents/public").header("Origin", "http://localhost:8081"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8081"))
                .andExpect(jsonPath("$[0].id").value(id.toString()))
                .andExpect(jsonPath("$[0].latitude").value(40.4))
                .andExpect(jsonPath("$[0].longitude").value(-3.7));
        verify(service).listAllPublicIncidents();
    }

    @Test
    void creatingAnIncidentStillRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON).content(validBody()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void exposesDocumentedIncidentResponses() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['201']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/{id}'].get.responses['404']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['400'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.code").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.errors").exists());
    }

    @Test
    void allowsLocalFrontendPreflight() throws Exception {
        mockMvc.perform(options("/api/incidents/create")
                        .header("Origin", "http://localhost:8081")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8081"))
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("POST")))
                .andExpect(header().string("Access-Control-Allow-Headers", org.hamcrest.Matchers.containsString("content-type")));
        verifyNoInteractions(service);
    }

    @Test
    void rejectsOtherOrigins() throws Exception {
        mockMvc.perform(options("/api/incidents/create")
                        .header("Origin", "http://other.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void createsIncident() throws Exception {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        IncidentResponse response = new IncidentResponse(id, userId, "Farola", "Apagada", IncidentCategory.STREET_LIGHTING,
                40.4, -3.7, null, IncidentStatus.REPORTED, null, null);
        when(service.create(any(), any())).thenReturn(response);
        mockMvc.perform(post("/api/incidents/create").with(SecurityMockMvcRequestPostProcessors.authentication(citizen())).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"userId":"%s","title":"Farola","description":"Apagada",
                         "category":"STREET_LIGHTING","latitude":40.4,"longitude":-3.7}
                        """.formatted(userId)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("REPORTED"))
                .andExpect(jsonPath("$.priority").doesNotExist());
        verify(service).create(any(), eq(userId));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{}",
        "{\"userId\":\"00000000-0000-0000-0000-000000000001\",\"title\":\"x\",\"description\":\"x\",\"category\":\"OTHER\",\"latitude\":91,\"longitude\":0}",
        "{\"userId\":\"00000000-0000-0000-0000-000000000001\",\"title\":\"x\",\"description\":\"x\",\"category\":\"OTHER\",\"latitude\":0,\"longitude\":181}",
        "{\"userId\":\"00000000-0000-0000-0000-000000000001\",\"title\":\"x\",\"description\":\"x\",\"category\":\"INVALID\",\"latitude\":0,\"longitude\":0}"
    })
    void rejectsInvalidInput(String body) throws Exception {
        mockMvc.perform(post("/api/incidents/create").with(SecurityMockMvcRequestPostProcessors.authentication(citizen())).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void validationErrorIncludesFieldDetails() throws Exception {
        mockMvc.perform(post("/api/incidents/create").with(SecurityMockMvcRequestPostProcessors.authentication(citizen())).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.instance").value("/api/incidents/create"))
                .andExpect(jsonPath("$.errors[?(@.field == 'title')].code").value("INVALID_VALUE"));
        verifyNoInteractions(service);
    }

    @Test
    void unreadableJsonReturnsProblem() throws Exception {
        mockMvc.perform(post("/api/incidents/create").with(SecurityMockMvcRequestPostProcessors.authentication(citizen())).contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verifyNoInteractions(service);
    }

    @Test
    void missingOrInactiveAccountReturnsSafe401() throws Exception {
        when(service.create(any(), any())).thenThrow(new BadCredentialsException("private account state"));
        mockMvc.perform(post("/api/incidents/create").with(SecurityMockMvcRequestPostProcessors.authentication(citizen())).contentType(MediaType.APPLICATION_JSON).content(validBody()))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.detail").value("Inicia sesión con una credencial válida."))
                .andExpect(jsonPath("$.instance").value("/api/incidents/create"));
    }

    @Test
    void unexpectedErrorDoesNotExposeInternalMessage() throws Exception {
        when(service.create(any(), any())).thenThrow(new IllegalStateException("secret internal detail"));
        mockMvc.perform(post("/api/incidents/create").with(SecurityMockMvcRequestPostProcessors.authentication(citizen())).contentType(MediaType.APPLICATION_JSON).content(validBody()))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.detail").value("No se ha podido procesar la petición."));
    }

    @Test
    void serviceAccessDenialRemains403InsteadOfBecomingAnInternalError() throws Exception {
        when(service.create(any(), any())).thenThrow(
                new org.springframework.security.access.AccessDeniedException("private authorization detail"));
        mockMvc.perform(post("/api/incidents/create")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(citizen()))
                        .contentType(MediaType.APPLICATION_JSON).content(validBody()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.detail").value("No tienes permiso para realizar esta operación."));
    }

    private Authentication citizen() {
        return UsernamePasswordAuthenticationToken.authenticated(
                new UrbanPulsePrincipal(
                        UUID.fromString("00000000-0000-0000-0000-000000000001"),
                        UserRole.CITIZEN), null,
                List.of(new SimpleGrantedAuthority("ROLE_CITIZEN")));
    }

    private String validBody() {
        return """
                {"userId":"00000000-0000-0000-0000-000000000001", "title":"Farola",
                 "description":"Apagada", "category":"STREET_LIGHTING", "latitude":40.4, "longitude":-3.7}
                """;
    }
}
