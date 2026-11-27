package com.leftjoiner.urbanpulse.urbanpulse.security;

import java.util.HashMap;

import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.docker.compose.enabled=false")
class JwtAuthenticationIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort private int port;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean private UserRepository users;
    @Autowired private IncidentRepository incidents;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JwtService jwtService;
    @Autowired private SecretKey jwtSigningKey;
    private final JsonMapper json = JsonMapper.builder().build();
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Test
    void loginIssuesBearerAndMeReturnsCurrentPublicUserWithoutCreatingSession() throws Exception {
        UserEntity user = user(UserRole.CITIZEN);
        var login = login(user);
        assertEquals(200, login.statusCode());
        var body = json.readTree(login.body());
        assertEquals("Bearer", body.path("tokenType").asString());
        assertEquals(900, body.path("expiresIn").asInt());
        assertEquals(user.getId().toString(), body.path("user").path("id").asString());
        String token = body.path("accessToken").asString();
        assertEquals(user.getId(), jwtService.validate(token).getId());
        assertTrue(login.headers().firstValue("cache-control").orElse("").contains("no-store"));

        var me = send(request("/api/auth/me").header("Authorization", "Bearer " + token).GET());
        assertEquals(200, me.statusCode());
        assertEquals(body.path("user"), json.readTree(me.body()));
        assertFalse(me.body().contains(user.getPasswordHash()));
        assertTrue(me.headers().firstValue("cache-control").orElse("").contains("no-store"));
        assertTrue(me.headers().allValues("Set-Cookie").isEmpty());
        assertTrue(login.headers().allValues("Set-Cookie").isEmpty());
        assertUnauthenticated(send(request("/api/auth/me").GET()));
    }

    @Test
    void meRejectsMissingDeletedInactiveOrRolelessAccounts() throws Exception {
        UserEntity user = user(UserRole.CITIZEN);
        String token = token(user);
        user.setActive(false);
        users.saveAndFlush(user);
        assertUnauthenticated(me(token));
        user.setActive(true);
        user.setRole(null);
        users.saveAndFlush(user);
        assertUnauthenticated(me(token));
        users.deleteById(user.getId());
        assertUnauthenticated(me(token));
        assertUnauthenticated(me(jwtService.issue(UUID.randomUUID(), UserRole.CITIZEN)));
    }

    @Test
    void deactivatedAccountsCannotCreateIncidentsWithAnEarlierToken() throws Exception {
        UserEntity author = user(UserRole.CITIZEN);
        String token = token(author);
        long before = incidents.count();
        author.setActive(false);
        users.saveAndFlush(author);
        org.mockito.Mockito.clearInvocations(users);

        var response = send(request("/api/incidents/create").header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of(
                        "title", "Farola", "description", "Apagada", "category", "STREET_LIGHTING",
                        "latitude", 40.4, "longitude", -3.7)))));

        assertUnauthenticated(response);
        assertEquals(before, incidents.count());
        org.mockito.Mockito.verify(users, org.mockito.Mockito.times(1)).findById(author.getId());
        org.mockito.Mockito.verifyNoMoreInteractions(users);
        assertFalse(response.body().contains(author.getId().toString()));
    }

    @Test
    void roleChangesImmediatelyInvalidateOldTokenAndDeniedRolesReceive403() throws Exception {
        UserEntity user = user(UserRole.CITIZEN);
        String token = token(user);
        user.setRole(UserRole.OPERATOR);
        users.saveAndFlush(user);

        var me = me(token);
        assertUnauthenticated(me);
        org.mockito.Mockito.clearInvocations(users);
        var oldTokenRequest = send(request("/api/incidents/create").header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}")));
        assertUnauthenticated(oldTokenRequest);
        org.mockito.Mockito.verify(users).findById(user.getId());
        token = token(user);
        var denied = send(request("/api/incidents/create").header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}")));
        assertEquals(403, denied.statusCode());
        assertEquals("ACCESS_DENIED", json.readTree(denied.body()).path("code").asString());
    }

    @Test
    void revokedOperatorTokenCannotReadAnIncidentAfterRoleReduction() throws Exception {
        UserEntity operator = user(UserRole.OPERATOR);
        String token = token(operator);
        operator.setRole(UserRole.CITIZEN);
        users.saveAndFlush(operator);
        var response = send(request("/api/incidents/" + UUID.randomUUID())
                .header("Authorization", "Bearer " + token).GET());
        assertUnauthenticated(response);
    }

    @Test
    void incidentAuthorAlwaysComesFromBearerEvenWhenBodyAttemptsImpersonation() throws Exception {
        UserEntity author = user(UserRole.CITIZEN);
        UserEntity anotherCitizen = user(UserRole.CITIZEN);
        String token = token(author);
        Map<String, Object> fields = new HashMap<>(Map.of("title", "Farola",
                "description", "Apagada", "category", "STREET_LIGHTING", "latitude", 40.4, "longitude", -3.7));
        for (boolean injectUserId : List.of(false, true)) {
            if (injectUserId) fields.put("userId", anotherCitizen.getId().toString());
            var response = send(request("/api/incidents/create").header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(fields))));
            assertEquals(201, response.statusCode());
            var body = json.readTree(response.body());
            assertEquals(author.getId().toString(), body.path("userId").asString());
            var incident = incidents.findById(UUID.fromString(body.path("id").asString())).orElseThrow();
            assertEquals(author.getId(), incident.getUser().getId());
        }
    }

    @Test
    void creatingIncidentsRequiresBearerBeforeValidatingTheBody() throws Exception {
        assertUnauthenticated(send(request("/api/incidents/create").header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERATOR", "TECHNICIAN", "ADMINISTRATOR", "ANALYST"})
    void staffRolesCanReadTheirOwnIdentityButCannotCreateCitizenIncidents(String role) throws Exception {
        String token = token(user(UserRole.valueOf(role)));
        assertEquals(200, me(token).statusCode());
        var response = send(request("/api/incidents/create").header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}")));
        assertEquals(403, response.statusCode());
    }

    @Test
    void invalidSignaturesClaimsAndAlgorithmsReceiveTheSameSafe401() throws Exception {
        UserEntity user = user(UserRole.CITIZEN);
        String valid = token(user);
        String[] parts = valid.split("\\.");
        parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);
        for (String token : List.of(
                String.join(".", parts),
                claims(user).signWith(Jwts.SIG.HS256.key().build(), Jwts.SIG.HS256).compact(),
                claims(user).issuer("other-issuer").signWith(jwtSigningKey, Jwts.SIG.HS256).compact(),
                claims(user).audience().clear().add("other-api").and().signWith(jwtSigningKey, Jwts.SIG.HS256).compact(),
                claims(user).expiration(Date.from(Instant.now().minusSeconds(1))).signWith(jwtSigningKey, Jwts.SIG.HS256).compact(),
                claims(user).subject("not-a-uuid").signWith(jwtSigningKey, Jwts.SIG.HS256).compact(),
                claims(user).claim("role", "SUPERADMIN").signWith(jwtSigningKey, Jwts.SIG.HS256).compact(),
                claims(user).signWith(Jwts.SIG.HS512.key().build(), Jwts.SIG.HS512).compact(),
                claims(user).compact())) {
            var response = me(token);
            assertUnauthenticated(response);
            assertFalse(response.body().contains(token));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"Bearer ", "Bearer not-a-jwt", "Basic abc", "Bearer a b", "Bearer x,y"})
    void rejectsMalformedAuthorizationHeaders(String header) throws Exception {
        assertUnauthenticated(send(request("/api/auth/me").header("Authorization", header).GET()));
    }

    @Test
    void refusesCookiesQueryTokensAndRepeatedAuthorizationHeaders() throws Exception {
        String token = token(user(UserRole.CITIZEN));
        assertUnauthenticated(send(request("/api/auth/me").header("Cookie", "jwtToken=" + token).GET()));
        assertUnauthenticated(send(request("/api/auth/me?access_token=" + token).GET()));
        assertUnauthenticated(send(request("/api/auth/me").header("Authorization", "Bearer " + token)
                .header("Authorization", "Bearer " + token).GET()));
    }

    @Test
    void staleBearerDoesNotPreventPublicLoginOrRegistration() throws Exception {
        UserEntity user = user(UserRole.CITIZEN);
        var login = send(request("/api/auth/login").header("Authorization", "Bearer old-token")
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(Map.of("email", user.getEmail(), "password", "test-password")))));
        assertEquals(200, login.statusCode());
        var register = send(request("/api/auth/register").header("Authorization", "Bearer old-token")
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(Map.of("name", "New citizen", "email", UUID.randomUUID() + "@example.com",
                                "password", "test-password")))));
        assertEquals(201, register.statusCode());
    }

    @Test
    void corsOnlyAllowsConfiguredWebOriginsWithoutCookies() throws Exception {
        var allowed = send(request("/api/auth/me").header("Origin", "http://localhost:8081")
                .header("Access-Control-Request-Method", "GET").header("Access-Control-Request-Headers", "authorization")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()));
        assertEquals(200, allowed.statusCode());
        assertEquals("http://localhost:8081", allowed.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        assertTrue(allowed.headers().firstValue("Access-Control-Allow-Credentials").isEmpty());
        var denied = send(request("/api/auth/me").header("Origin", "https://unknown.example.com")
                .header("Access-Control-Request-Method", "GET").method("OPTIONS", HttpRequest.BodyPublishers.noBody()));
        assertEquals(403, denied.statusCode());
        assertTrue(denied.headers().firstValue("Access-Control-Allow-Origin").isEmpty());
    }

    @Test
    void healthAndApiDocsArePublicButOtherActuatorAndUnknownRoutesAreNot() throws Exception {
        assertEquals(200, send(request("/actuator/health").GET()).statusCode());
        var docs = send(request("/v3/api-docs").GET());
        assertEquals(200, docs.statusCode());
        var spec = json.readTree(docs.body());
        assertEquals("bearer", spec.path("components").path("securitySchemes").path("bearerAuth").path("scheme").asString());
        assertTrue(spec.path("paths").path("/api/auth/me").path("get").has("security"));
        assertTrue(spec.path("paths").path("/api/auth/login").path("post").path("responses").has("200"));
        assertFalse(spec.path("paths").path("/api/auth/register").path("post").path("responses").has("401"));
        assertFalse(spec.path("paths").path("/api/auth/login").path("post").path("responses").has("403"));
        assertFalse(spec.path("components").path("schemas").path("IncidentRequest").path("properties").has("userId"));
        assertTrue(spec.path("paths").path("/api/incidents/create").path("post").path("responses").has("401"));
        assertTrue(spec.path("paths").path("/api/incidents/create").path("post").path("responses").has("403"));
        assertUnauthenticated(send(request("/actuator/env").GET()));
        assertUnauthenticated(send(request("/api/staff/incidents").GET()));
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void authenticationDoesNotLogOrReturnTokensOnFailure(CapturedOutput output) throws Exception {
        String token = token(user(UserRole.CITIZEN));
        String malformed = token + "-invalid";
        assertUnauthenticated(me(malformed));
        assertFalse(output.getAll().contains(token));
        assertFalse(output.getAll().contains(malformed));
    }

    @Test
    void reviewQueueAndActionsRequireOperator() throws Exception {
        assertEquals(401, send(request("/api/operator/reviews").GET()).statusCode());
        for (UserRole role : List.of(UserRole.CITIZEN, UserRole.TECHNICIAN, UserRole.ADMINISTRATOR, UserRole.ANALYST)) {
            String jwt = token(user(role));
            assertEquals(403, send(request("/api/operator/reviews").header("Authorization", "Bearer " + jwt).GET()).statusCode());
            assertEquals(403, send(request("/api/operator/reviews/" + UUID.randomUUID() + "/validate")
                    .header("Authorization", "Bearer " + jwt).POST(HttpRequest.BodyPublishers.noBody())).statusCode());
        }
        String operator = token(user(UserRole.OPERATOR));
        assertEquals(200, send(request("/api/operator/reviews").header("Authorization", "Bearer " + operator).GET()).statusCode());
    }

    @Test
    void operatorReviewsReportedIncidentAndCannotEditAfterValidation() throws Exception {
        String citizen = token(user(UserRole.CITIZEN));
        String operator = token(user(UserRole.OPERATOR));
        var created = send(request("/api/incidents/create").header("Authorization", "Bearer " + citizen)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(
                    "{\"title\":\"Farola\",\"description\":\"Apagada\",\"category\":\"STREET_LIGHTING\",\"latitude\":36.7,\"longitude\":-4.4}")));
        assertEquals(201, created.statusCode());
        String id = json.readTree(created.body()).path("id").asString();
        String root = "/api/operator/reviews/" + id;
        var emptyReason = send(request(root + "/reject").header("Authorization", "Bearer " + operator)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"reason\":\"  \"}")));
        assertEquals(400, emptyReason.statusCode());
        var info = send(request(root + "/request-information").header("Authorization", "Bearer " + operator)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"reason\":\"Foto necesaria\"}")));
        assertEquals(200, info.statusCode());
        assertEquals("REPORTED", incidents.findById(UUID.fromString(id)).orElseThrow().getStatus().name());
        var validation = send(request(root + "/validate").header("Authorization", "Bearer " + operator)
                .POST(HttpRequest.BodyPublishers.noBody()));
        assertEquals(200, validation.statusCode());
        var edit = send(request(root + "/edit").header("Authorization", "Bearer " + operator)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(
                    "{\"category\":\"TRAFFIC\",\"priority\":\"HIGH\",\"latitude\":36.7,\"longitude\":-4.4}")));
        assertEquals(409, edit.statusCode());
        var detail = send(request("/api/incidents/" + id).header("Authorization", "Bearer " + citizen).GET());
        assertEquals(200, detail.statusCode());
        assertTrue(detail.body().contains("Foto necesaria"));
        assertEquals("VALIDATED", incidents.findById(UUID.fromString(id)).orElseThrow().getStatus().name());
    }

    @Test
    void operatorEditsAreAttributedAndVisibleInIncidentHistory() throws Exception {
        UserEntity citizen = user(UserRole.CITIZEN);
        UserEntity operator = user(UserRole.OPERATOR);
        String citizenToken = token(citizen);
        String operatorToken = token(operator);
        var created = send(request("/api/incidents/create").header("Authorization", "Bearer " + citizenToken)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(
                    "{\"title\":\"Farola\",\"description\":\"Apagada\",\"category\":\"STREET_LIGHTING\",\"latitude\":36.7,\"longitude\":-4.4}")));
        assertEquals(201, created.statusCode());
        String id = json.readTree(created.body()).path("id").asString();
        String editPath = "/api/operator/reviews/" + id + "/edit";
        String editBody = "{\"category\":\"TRAFFIC\",\"priority\":\"HIGH\",\"latitude\":36.71,\"longitude\":-4.4}";
        var forbidden = send(request(editPath).header("Authorization", "Bearer " + citizenToken)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(editBody)));
        assertEquals(403, forbidden.statusCode());
        var edited = send(request(editPath).header("Authorization", "Bearer " + operatorToken)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(editBody)));
        assertEquals(200, edited.statusCode());
        // Repeating exactly the same edit should not add a misleading history entry.
        assertEquals(200, send(request(editPath).header("Authorization", "Bearer " + operatorToken)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(editBody))).statusCode());
        var detail = send(request("/api/incidents/" + id).header("Authorization", "Bearer " + operatorToken).GET());
        assertEquals(200, detail.statusCode());
        var entries = json.readTree(detail.body()).path("history");
        assertEquals(1, entries.size());
        var entry = entries.get(0);
        assertEquals("INCIDENT_EDITED", entry.path("action").asString());
        assertEquals(operator.getId().toString(), entry.path("actorId").asString());
        assertEquals(operator.getName(), entry.path("actorName").asString());
        assertEquals("REPORTED", entry.path("previousStatus").asString());
        assertEquals("REPORTED", entry.path("status").asString());
        assertTrue(entry.path("reason").asString().contains("categoría"));
        assertTrue(entry.path("reason").asString().contains("prioridad"));
        assertTrue(entry.path("reason").asString().contains("ubicación"));
        assertFalse(entry.path("changedAt").asString().isBlank());
        var citizenDetail = send(request("/api/incidents/" + id).header("Authorization", "Bearer " + citizenToken).GET());
        assertTrue(json.readTree(citizenDetail.body()).path("history").get(0).path("actorName").isNull());
    }


    private static final String URBAN_SERVICES = "e8000000-0000-4000-8000-000000000001";
    private static final String MOBILITY = "e8000000-0000-4000-8000-000000000002";
    private static final String LIGHTING_TEAM = "e8100000-0000-4000-8000-000000000001";
    private static final String FIRST_TECHNICIAN = "f5300000-0000-4000-8000-000000000005";
    private static final String SECOND_TECHNICIAN = "f5300000-0000-4000-8000-000000000006";
    private static final String OUTSIDE_TECHNICIAN = "e8200000-0000-4000-8000-000000000004";
    private static final String ASSIGNMENTS = "/api/operator/assignments/";

    @Test
    void groupAssignmentsReachAllTeamMembersAndAppearInTheirWorkload() throws Exception {
        String citizen = token(user(UserRole.CITIZEN));
        UserEntity operator = user(UserRole.OPERATOR);
        String operatorToken = token(operator);
        String first = technicianToken(FIRST_TECHNICIAN);
        String second = technicianToken(SECOND_TECHNICIAN);
        String outside = technicianToken(OUTSIDE_TECHNICIAN);

        var before = assignmentCatalog(operatorToken);
        assertEquals(URBAN_SERVICES, option(before, LIGHTING_TEAM).path("departmentId").asString());
        assertEquals(MOBILITY, option(before, OUTSIDE_TECHNICIAN).path("departmentId").asString());
        assertTrue(option(before, operator.getId().toString()).isMissingNode());

        String teamIncident = reportForAssignment(citizen);
        assignValidated(teamIncident, operatorToken, Map.of("departmentId", URBAN_SERVICES, "teamId", LIGHTING_TEAM));
        String individualIncident = reportForAssignment(citizen);
        assignValidated(individualIncident, operatorToken,
                Map.of("departmentId", URBAN_SERVICES, "technicianId", FIRST_TECHNICIAN));

        var detail = getAs("/api/incidents/" + teamIncident, operatorToken);
        assertEquals(200, detail.statusCode());
        var incident = json.readTree(detail.body());
        assertEquals("ASSIGNED", incident.path("status").asString());
        var history = incident.path("history");
        assertEquals(2, history.size());
        var event = history.get(1);
        assertEquals("VALIDATED", event.path("previousStatus").asString());
        assertEquals("ASSIGNED", event.path("status").asString());
        assertEquals(operator.getId().toString(), event.path("actorId").asString());
        assertFalse(event.path("changedAt").asString().isBlank());
        assertEquals("Alumbrado", event.path("assignment").path("team").asString());
        assertEquals("Servicios urbanos", event.path("assignment").path("department").asString());

        for (String member : List.of(first, second)) {
            assertEquals(200, getAs("/api/incidents/" + teamIncident, member).statusCode());
            assertVisible("/api/incidents?size=100", member, teamIncident, true);
            assertVisible("/api/incidents/public", member, teamIncident, true);
            assertVisible("/api/incidents/map-members?west=-4.5&south=36.6&east=-4.3&north=36.8", member, teamIncident, true);
        }
        assertEquals(404, getAs("/api/incidents/" + teamIncident, outside).statusCode());
        assertVisible("/api/incidents?size=100", outside, teamIncident, false);
        assertEquals(200, getAs("/api/incidents/" + individualIncident, first).statusCode());
        assertEquals(404, getAs("/api/incidents/" + individualIncident, second).statusCode());

        var after = assignmentCatalog(operatorToken);
        assertEquals(workload(before, LIGHTING_TEAM) + 2, workload(after, LIGHTING_TEAM));
        assertEquals(workload(before, FIRST_TECHNICIAN) + 2, workload(after, FIRST_TECHNICIAN));
        assertEquals(workload(before, SECOND_TECHNICIAN) + 1, workload(after, SECOND_TECHNICIAN));
        assertEquals(workload(before, OUTSIDE_TECHNICIAN), workload(after, OUTSIDE_TECHNICIAN));

        var finished = incidents.findById(UUID.fromString(teamIncident)).orElseThrow();
        finished.setStatus(com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus.RESOLVED);
        incidents.saveAndFlush(finished);
        var filtered = assignmentCatalog(operatorToken);
        assertEquals(workload(after, LIGHTING_TEAM) - 1, workload(filtered, LIGHTING_TEAM));
        assertEquals(workload(after, SECOND_TECHNICIAN) - 1, workload(filtered, SECOND_TECHNICIAN));
        assertEquals(200, getAs("/api/incidents/" + teamIncident, second).statusCode());
    }

    @Test
    void assignmentRejectsUnauthorizedActorsInvalidStatesAndDestinations() throws Exception {
        UserEntity citizen = user(UserRole.CITIZEN);
        String citizenToken = token(citizen);
        String operator = token(user(UserRole.OPERATOR));
        UserEntity unavailable = user(UserRole.TECHNICIAN);
        unavailable.setActive(false);
        unavailable.setTeam(users.findById(UUID.fromString(FIRST_TECHNICIAN)).orElseThrow().getTeam());
        users.saveAndFlush(unavailable);

        String id = reportForAssignment(citizenToken);
        String path = ASSIGNMENTS + id;
        String destination = json.writeValueAsString(Map.of("departmentId", URBAN_SERVICES, "teamId", LIGHTING_TEAM));
        assertEquals(403, getAs(ASSIGNMENTS + "catalog", citizenToken).statusCode());
        assertEquals(403, post(path, citizenToken, destination).statusCode());
        assertUnauthenticated(send(request(path).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(destination))));
        assertEquals(409, post(path, operator, destination).statusCode());
        assertEquals(404, post(ASSIGNMENTS + UUID.randomUUID(), operator, destination).statusCode());
        assertEquals(200, post("/api/operator/reviews/" + id + "/validate", operator, null).statusCode());

        for (Map<String, String> invalid : List.of(
                Map.of("departmentId", URBAN_SERVICES),
                Map.of("departmentId", MOBILITY, "teamId", LIGHTING_TEAM),
                Map.of("departmentId", MOBILITY, "technicianId", FIRST_TECHNICIAN),
                Map.of("departmentId", URBAN_SERVICES, "teamId", LIGHTING_TEAM, "technicianId", FIRST_TECHNICIAN),
                Map.of("departmentId", URBAN_SERVICES, "technicianId", citizen.getId().toString()),
                Map.of("departmentId", URBAN_SERVICES, "technicianId", unavailable.getId().toString()))) {
            var response = post(path, operator, json.writeValueAsString(invalid));
            assertEquals(400, response.statusCode());
            assertEquals("INVALID_ASSIGNMENT_DESTINATION", json.readTree(response.body()).path("code").asString());
        }
        var detail = getAs("/api/incidents/" + id, operator);
        assertEquals(200, detail.statusCode());
        var incident = json.readTree(detail.body());
        assertEquals("VALIDATED", incident.path("status").asString());
        assertEquals(1, incident.path("history").size());
    }

    private String technicianToken(String id) {
        return jwtService.issue(UUID.fromString(id), UserRole.TECHNICIAN);
    }

    private void assignValidated(String id, String operator, Map<String, String> destination) throws Exception {
        assertEquals(200, post("/api/operator/reviews/" + id + "/validate", operator, null).statusCode());
        String body = json.writeValueAsString(destination);
        assertEquals(204, post(ASSIGNMENTS + id, operator, body).statusCode());
        assertEquals(409, post(ASSIGNMENTS + id, operator, body).statusCode());
    }

    private void assertVisible(String path, String technician, String incidentId, boolean visible) throws Exception {
        var response = getAs(path, technician);
        assertEquals(200, response.statusCode());
        assertEquals(visible, response.body().contains(incidentId));
    }

    private tools.jackson.databind.JsonNode assignmentCatalog(String operator) throws Exception {
        var response = getAs(ASSIGNMENTS + "catalog", operator);
        assertEquals(200, response.statusCode());
        return json.readTree(response.body());
    }

    private static tools.jackson.databind.JsonNode option(tools.jackson.databind.JsonNode options, String id) {
        for (var option : options) {
            if (id.equals(option.path("id").asString())) return option;
        }
        return options.path(id);
    }

    private static long workload(tools.jackson.databind.JsonNode catalog, String id) {
        return option(catalog, id).path("assignedCount").asLong();
    }

    private HttpResponse<String> getAs(String path, String token) throws Exception {
        return send(request(path).header("Authorization", "Bearer " + token).GET());
    }

    private String reportForAssignment(String token) throws Exception {
        var result = post("/api/incidents/create", token,
                "{\"title\":\"Farola\",\"description\":\"Apagada\",\"category\":\"STREET_LIGHTING\",\"latitude\":36.7,\"longitude\":-4.4}");
        assertEquals(201, result.statusCode());
        return json.readTree(result.body()).path("id").asString();
    }

    private HttpResponse<String> post(String path, String token, String body) throws Exception {
        var builder = request(path).header("Authorization", "Bearer " + token);
        return body == null ? send(builder.POST(HttpRequest.BodyPublishers.noBody()))
                : send(builder.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)));
    }

    private UserEntity user(UserRole role) {
        UserEntity user = new UserEntity();
        user.setName("JWT test citizen");
        user.setEmail(UUID.randomUUID() + "@example.com");
        user.setPasswordHash(encoder.encode("test-password"));
        user.setActive(true);
        user.setRole(role);
        return users.saveAndFlush(user);
    }

    private HttpResponse<String> login(UserEntity user) throws Exception {
        return send(request("/api/auth/login").header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(
                        Map.of("email", user.getEmail(), "password", "test-password")))));
    }

    private String token(UserEntity user) throws Exception {
        var response = login(user);
        assertEquals(200, response.statusCode());
        return json.readTree(response.body()).path("accessToken").asString();
    }

    private JwtBuilder claims(UserEntity user) {
        return Jwts.builder().subject(user.getId().toString()).claim("role", user.getRole().name()).issuer("urbanpulse")
                .audience().add("urbanpulse-api").and().issuedAt(Date.from(Instant.now().minusSeconds(10)))
                .expiration(Date.from(Instant.now().plusSeconds(900)));
    }

    private HttpResponse<String> me(String token) throws Exception {
        return send(request("/api/auth/me").header("Authorization", "Bearer " + token).GET());
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(15));
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private void assertUnauthenticated(HttpResponse<String> response) throws Exception {
        assertEquals(401, response.statusCode());
        assertEquals("UNAUTHENTICATED", json.readTree(response.body()).path("code").asString());
        assertEquals("Bearer", response.headers().firstValue("WWW-Authenticate").orElseThrow());
        assertTrue(response.headers().firstValue("content-type").orElse("").startsWith("application/problem+json"));
    }
}
