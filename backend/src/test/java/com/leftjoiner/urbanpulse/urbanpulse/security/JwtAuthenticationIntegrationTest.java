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
    void roleChangesRequireANewTokenAndDeniedRolesReceive403() throws Exception {
        UserEntity user = user(UserRole.CITIZEN);
        String token = token(user);
        user.setRole(UserRole.OPERATOR);
        users.saveAndFlush(user);

        var me = me(token);
        assertEquals(200, me.statusCode());
        assertEquals("CITIZEN", json.readTree(me.body()).path("role").asString());
        org.mockito.Mockito.clearInvocations(users);
        var oldTokenRequest = send(request("/api/incidents/create").header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}")));
        assertEquals(400, oldTokenRequest.statusCode());
        org.mockito.Mockito.verifyNoInteractions(users);
        token = token(user);
        var denied = send(request("/api/incidents/create").header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}")));
        assertEquals(403, denied.statusCode());
        assertEquals("ACCESS_DENIED", json.readTree(denied.body()).path("code").asString());
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
