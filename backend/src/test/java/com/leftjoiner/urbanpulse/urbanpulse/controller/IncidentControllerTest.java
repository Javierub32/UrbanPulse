package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.exception.UserNotFoundException;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IncidentController.class)
@EnableConfigurationProperties(SpringDocConfigProperties.class)
@ImportAutoConfiguration({SpringDocConfiguration.class, SpringDocSpecPropertiesConfiguration.class,
        SpringDocWebMvcConfiguration.class})
class IncidentControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private IncidentService service;

    @Test
    void exposesDocumentedIncidentResponses() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['201']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['400'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.code").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.errors").exists());
    }

    @Test
    void createsIncident() throws Exception {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        IncidentResponse response = new IncidentResponse(id, userId, "Farola", "Apagada", IncidentCategory.STREET_LIGHTING,
                40.4, -3.7, null, IncidentStatus.REPORTED, null, null);
        when(service.create(any())).thenReturn(response);
        mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"userId":"%s","title":"Farola","description":"Apagada",
                         "category":"STREET_LIGHTING","latitude":40.4,"longitude":-3.7}
                        """.formatted(userId)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("REPORTED"))
                .andExpect(jsonPath("$.priority").doesNotExist());
        verify(service).create(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{}",
        "{\"userId\":\"00000000-0000-0000-0000-000000000001\",\"title\":\"x\",\"description\":\"x\",\"category\":\"OTHER\",\"latitude\":91,\"longitude\":0}",
        "{\"userId\":\"00000000-0000-0000-0000-000000000001\",\"title\":\"x\",\"description\":\"x\",\"category\":\"OTHER\",\"latitude\":0,\"longitude\":181}",
        "{\"userId\":\"00000000-0000-0000-0000-000000000001\",\"title\":\"x\",\"description\":\"x\",\"category\":\"INVALID\",\"latitude\":0,\"longitude\":0}"
    })
    void rejectsInvalidInput(String body) throws Exception {
        mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void validationErrorIncludesFieldDetails() throws Exception {
        mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON).content("{}"))
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
        mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verifyNoInteractions(service);
    }

    @Test
    void missingUserReturnsProblem() throws Exception {
        when(service.create(any())).thenThrow(new UserNotFoundException());
        mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON).content(validBody()))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"))
                .andExpect(jsonPath("$.instance").value("/api/incidents/create"));
    }

    @Test
    void unexpectedErrorDoesNotExposeInternalMessage() throws Exception {
        when(service.create(any())).thenThrow(new IllegalStateException("secret internal detail"));
        mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON).content(validBody()))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.detail").value("No se ha podido procesar la petición."));
    }

    private String validBody() {
        return """
                {"userId":"00000000-0000-0000-0000-000000000001", "title":"Farola",
                 "description":"Apagada", "category":"STREET_LIGHTING", "latitude":40.4, "longitude":-3.7}
                """;
    }
}
