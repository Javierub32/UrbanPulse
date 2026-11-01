package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest(properties = "spring.docker.compose.enabled=false")
@AutoConfigureMockMvc
class IncidentPersistenceIntegrationTest {
    @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
        DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"));
    @DynamicPropertySource static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired IncidentRepository incidents;

    @Test
    void documentsIncidentResponsesAndErrorExtensions() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['201']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['400'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['404']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['500']").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.code").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.errors").exists());
    }

    @Test
    void createsAndReadsIncidentFromPostgis() throws Exception {
        UserEntity user = users.saveAndFlush(new UserEntity());
        String body = mockMvc.perform(post("/api/incidents/create").contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"userId":"%s","title":"Farola","description":"Apagada",
                     "category":"STREET_LIGHTING","latitude":40.4,"longitude":-3.7}
                    """.formatted(user.getId())))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        UUID id = UUID.fromString(JsonMapper.builder().build().readTree(body).path("id").asString());
        var saved = incidents.findById(id).orElseThrow();
        assertEquals(IncidentStatus.REPORTED, saved.getStatus());
        assertNull(saved.getPriority());
        assertEquals(user.getId(), saved.getUser().getId());
        Point point = (Point) saved.getLocation();
        assertEquals(4326, point.getSRID());
        assertEquals(-3.7, point.getX());
        assertEquals(40.4, point.getY());
    }
}
