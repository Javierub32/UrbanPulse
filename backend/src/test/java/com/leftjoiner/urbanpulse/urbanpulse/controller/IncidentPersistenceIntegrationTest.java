package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.security.JwtService;
import org.springframework.test.context.ActiveProfiles;

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
@ActiveProfiles("test")
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
    @Autowired JwtService jwtService;
    @Autowired IncidentRepository incidents;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Test
    void mapGroupsAndFiltersMoreThanFiftyIncidents() throws Exception {
        UserEntity user = new UserEntity();
        user.setActive(true);
        user.setRole(UserRole.CITIZEN);
        user = users.saveAndFlush(user);
        jdbc.update("""
            INSERT INTO "Incident" ("id", "userId", "title", "category", "status", "location")
            SELECT gen_random_uuid(), ?, 'Prueba', 'PUBLIC_ROAD', 'REPORTED',
                   ST_SetSRID(ST_MakePoint(10 + n * 0.001, 10), 4326)
            FROM generate_series(1, 60) n
            """, user.getId());
        String body = mockMvc.perform(get("/api/incidents/map")
                .param("west", "9.9").param("south", "9.9").param("east", "10.1").param("north", "10.1")
                .param("zoom", "20").param("category", "PUBLIC_ROAD").param("status", "REPORTED"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var data = JsonMapper.builder().build().readTree(body);
        int singles = 0, total = 0;
        for (var item : data) {
            total += item.path("count").asInt();
            if ("incident".equals(item.path("type").asString())) singles++;
        }
        assertEquals(60, total);
        assertTrue(singles <= 50);
        mockMvc.perform(get("/api/incidents/map")
                .param("west", "9.9").param("south", "9.9").param("east", "10.1").param("north", "10.1")
                .param("zoom", "12").param("category", "WASTE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        jdbc.update("""
            INSERT INTO "Incident" ("id", "userId", "title", "category", "status", "location")
            VALUES (gen_random_uuid(), ?, 'Punto A', 'WASTE', 'REPORTED', ST_SetSRID(ST_MakePoint(10.0001, 12), 4326)),
                   (gen_random_uuid(), ?, 'Punto B', 'WASTE', 'REPORTED', ST_SetSRID(ST_MakePoint(10.0005, 12), 4326))
            """, user.getId(), user.getId());
        mockMvc.perform(get("/api/incidents/map")
                .param("west", "10").param("south", "11.9").param("east", "10.1").param("north", "12.1").param("zoom", "16"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].type").value("incident"))
                .andExpect(jsonPath("$[1].type").value("incident"));
        // Dos grupos en celdas vecinas, con centros casi coincidentes en pantalla.
        jdbc.update("""
            INSERT INTO "Incident" ("id", "userId", "title", "category", "status", "location")
            SELECT gen_random_uuid(), ?, 'Grupo cercano', 'WASTE', 'REPORTED',
                ST_SetSRID(ST_MakePoint(floor(175.6 / (360.0 * 24.0 / (512.0 * power(2, 11))))
                    * (360.0 * 24.0 / (512.0 * power(2, 11))) - 180
                    + CASE WHEN n <= 2 THEN -0.00001 ELSE 0.00001 END, 13), 4326)
            FROM generate_series(1, 4) n
            """, user.getId());
        mockMvc.perform(get("/api/incidents/map")
                .param("west", "-4.5").param("south", "12.9").param("east", "-4.3").param("north", "13.1").param("zoom", "11"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].count").value(4));
        jdbc.update("""
            INSERT INTO "Incident" ("id", "userId", "title", "category", "status", "location")
            SELECT gen_random_uuid(), ?, 'Misma ubicación', 'PUBLIC_ROAD', 'REPORTED',
                   ST_SetSRID(ST_MakePoint(11, 11), 4326) FROM generate_series(1, 55)
            """, user.getId());
        mockMvc.perform(get("/api/incidents/map")
                .param("west", "10.9").param("south", "10.9").param("east", "11.1").param("north", "11.1").param("zoom", "22"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].count").value(55))
                .andExpect(jsonPath("$[0].type").value("cluster"));
        mockMvc.perform(get("/api/incidents/map-members")
                .param("west", "11").param("south", "11").param("east", "11").param("north", "11").param("page", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(50));
        mockMvc.perform(get("/api/incidents/map-members")
                .param("west", "11").param("south", "11").param("east", "11").param("north", "11").param("page", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5));
        mockMvc.perform(get("/api/incidents/map")
                .param("west", "20").param("south", "9").param("east", "10").param("north", "11").param("zoom", "12"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void mapAndMembersApplyTheSameInclusiveDateFilter() throws Exception {
        UserEntity user = new UserEntity();
        user.setActive(true);
        user.setRole(UserRole.CITIZEN);
        user = users.saveAndFlush(user);
        jdbc.update("""
            INSERT INTO "Incident" ("id", "userId", "title", "category", "status", "location", "registeredAt")
            SELECT gen_random_uuid(), ?, 'Fecha de prueba', 'WASTE', 'REPORTED',
                   ST_SetSRID(ST_MakePoint(-8, 9), 4326), stamp
            FROM (VALUES (TIMESTAMP '2026-01-01 00:00:00'), (TIMESTAMP '2026-01-07 00:00:00'),
                         (TIMESTAMP '2026-01-20 00:00:00'), (NULL::timestamp)) dates(stamp)
            """, user.getId());
        var request = get("/api/incidents/map").param("west", "-8.1").param("south", "8.9")
                .param("east", "-7.9").param("north", "9.1").param("zoom", "15")
                .param("category", "WASTE").param("status", "REPORTED");
        mockMvc.perform(request).andExpect(status().isOk()).andExpect(jsonPath("$[0].count").value(4));
        mockMvc.perform(get("/api/incidents/map").param("west", "-8.1").param("south", "8.9")
                .param("east", "-7.9").param("north", "9.1").param("zoom", "15")
                .param("category", "WASTE").param("status", "REPORTED").param("since", "2026-01-07T00:00:00Z"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].count").value(2));
        mockMvc.perform(get("/api/incidents/map-members").param("west", "-8").param("south", "9")
                .param("east", "-8").param("north", "9").param("since", "2026-01-07T00:00:00Z")
                .param("category", "WASTE").param("status", "REPORTED"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/incidents/map").param("west", "-8.1").param("south", "8.9")
                .param("east", "-7.9").param("north", "9.1").param("zoom", "15").param("since", "no-es-fecha"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void documentsIncidentResponsesAndErrorExtensions() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['201']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['400'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['401']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/create'].post.responses['500']").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.code").exists())
                .andExpect(jsonPath("$.components.schemas.ProblemResponse.properties.errors").exists());
    }

    @Test
    void createsAndReadsIncidentFromPostgis() throws Exception {
        UserEntity user = new UserEntity();
        user.setActive(true);
        user.setRole(UserRole.CITIZEN);
        user = users.saveAndFlush(user);
        String body = mockMvc.perform(post("/api/incidents/create").header("Authorization", "Bearer " + jwtService.issue(user.getId(), user.getRole())).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Farola","description":"Apagada",
                     "category":"STREET_LIGHTING","latitude":40.4,"longitude":-3.7}
                    """))
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

        mockMvc.perform(get("/api/incidents/{id}", id).header("Authorization", "Bearer " + jwtService.issue(user.getId(), user.getRole())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.description").value("Apagada"))
                .andExpect(jsonPath("$.history").isArray());
        UserEntity other = new UserEntity();
        other.setActive(true);
        other.setRole(UserRole.CITIZEN);
        other = users.saveAndFlush(other);
        mockMvc.perform(get("/api/incidents/{id}", id).header("Authorization", "Bearer " + jwtService.issue(other.getId(), other.getRole())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.description").value("Apagada"))
                .andExpect(jsonPath("$.userId").doesNotExist());
        mockMvc.perform(get("/api/incidents/{id}", id))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id.toString()));

        String publicList = mockMvc.perform(get("/api/incidents/public"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var entries = JsonMapper.builder().build().readTree(publicList);
        boolean found = false;
        for (var entry : entries) {
            if (id.toString().equals(entry.path("id").asString())) {
                assertEquals(40.4, entry.path("latitude").asDouble());
                assertEquals(-3.7, entry.path("longitude").asDouble());
                found = true;
            }
        }
        assertTrue(found, "La incidencia creada debe aparecer en el listado público");
    }
}
