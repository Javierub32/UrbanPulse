package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IncidentController.class)
class IncidentControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private IncidentService service;

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
}
