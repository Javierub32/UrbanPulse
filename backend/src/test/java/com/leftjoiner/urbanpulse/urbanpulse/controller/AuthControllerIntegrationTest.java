package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.docker.compose.enabled=false")
class AuthControllerIntegrationTest {

    private static final String PASSWORD = "test-password";
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5")
                    .asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void logsInAgainstPostgresAndReturnsOnlyPublicFields() throws Exception {
        UserEntity user = createUser(true);

        HttpResponse<String> response = postLogin(user.getEmail(), PASSWORD);

        assertEquals(200, response.statusCode());
        assertEquals(jsonMapper.valueToTree(new LoginResponse(
                        user.getId(), user.getName(), user.getEmail(), user.getRole())),
                jsonMapper.readTree(response.body()));
        assertFalse(response.body().contains(PASSWORD));
        assertFalse(response.body().contains(user.getPasswordHash()));
    }

    @Test
    void rejectsIncorrectPassword() throws Exception {
        UserEntity user = createUser(true);

        assertUnauthorized(postLogin(user.getEmail(), "wrong-password"));
    }

    @Test
    void rejectsUnknownEmail() throws Exception {
        assertUnauthorized(postLogin(UUID.randomUUID() + "@example.com", PASSWORD));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(booleans = false)
    void rejectsInactiveOrUnspecifiedActiveState(Boolean active) throws Exception {
        UserEntity user = createUser(active);

        assertUnauthorized(postLogin(user.getEmail(), PASSWORD));
    }

    @Test
    void rejectsStoredHashSubmittedAsPassword() throws Exception {
        UserEntity user = createUser(true);

        assertUnauthorized(postLogin(user.getEmail(), user.getPasswordHash()));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "plaintext", "$2a$10$bad"})
    void rejectsMissingOrMalformedHashReadFromPostgres(String hash) throws Exception {
        UserEntity user = createUser(true);
        user.setPasswordHash(hash);
        userRepository.saveAndFlush(user);

        assertUnauthorized(postLogin(user.getEmail(), PASSWORD));
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void doesNotLogPasswordsOrStoredHash(CapturedOutput output) throws Exception {
        String password = "audit-secret-" + UUID.randomUUID();
        UserEntity user = createUser(true);
        user.setPasswordHash(passwordEncoder.encode(password));
        userRepository.saveAndFlush(user);

        assertEquals(200, postLogin(user.getEmail(), password).statusCode());
        assertUnauthorized(postLogin(user.getEmail(), "wrong-" + password));
        assertEquals(400, postLogin("invalid-email", password).statusCode());

        assertFalse(output.getAll().contains(password));
        assertFalse(output.getAll().contains(user.getPasswordHash()));
    }

    @Test
    void logsInIgnoringEmailCaseAndReturnsStoredEmail() throws Exception {
        UserEntity user = createUser(true);
        user.setEmail("Citizen-" + UUID.randomUUID() + "@Example.COM");
        userRepository.saveAndFlush(user);

        HttpResponse<String> response = postLogin(
                user.getEmail().toLowerCase(java.util.Locale.ROOT), PASSWORD);

        assertEquals(200, response.statusCode());
        assertEquals(user.getEmail(), jsonMapper.readTree(response.body()).path("email").asString());
    }

    @Test
    void rejectsInvalidInputWithoutEchoingPassword() throws Exception {
        HttpResponse<String> response = postLogin("invalid-email", PASSWORD);

        assertEquals(400, response.statusCode());
        assertFalse(response.body().contains(PASSWORD));
        assertFalse(response.body().contains("passwordHash"));
    }

    @Test
    void backendHealthIncludesWorkingDatabaseConnection() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/actuator/health"))
                .timeout(Duration.ofSeconds(10)).GET().build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        assertEquals("UP", jsonMapper.readTree(response.body()).path("status").asString());
    }

    private UserEntity createUser(Boolean active) {
        UserEntity user = new UserEntity();
        user.setName("Integration test citizen");
        user.setEmail(UUID.randomUUID() + "@example.com");
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(UserRole.CITIZEN);
        user.setActive(active);
        return userRepository.saveAndFlush(user);
    }

    private HttpResponse<String> postLogin(String email, String password) throws Exception {
        String body = jsonMapper.writeValueAsString(Map.of("email", email, "password", password));
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private void assertUnauthorized(HttpResponse<String> response) {
        assertEquals(401, response.statusCode());
        assertEquals(jsonMapper.readTree("{\"message\":\"Credenciales inválidas\"}"),
                jsonMapper.readTree(response.body()));
    }
}
