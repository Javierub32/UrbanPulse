package com.leftjoiner.urbanpulse.urbanpulse.controller;

import org.springframework.test.context.ActiveProfiles;

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
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@Testcontainers
@ActiveProfiles("test")
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
    void registersCitizenWithBcryptAndCanThenLogIn() throws Exception {
        String email = "Register-" + UUID.randomUUID() + "@Example.COM";
        String password = " password with spaces ";
        java.time.LocalDateTime before = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC);

        HttpResponse<String> response = postRegister("  Ana García  ", "  " + email + "  ", password);

        assertEquals(201, response.statusCode());
        UserEntity user = userRepository.findByEmail(email.toLowerCase(java.util.Locale.ROOT)).orElseThrow();
        assertEquals("Ana García", user.getName());
        assertEquals(email, user.getEmail());
        assertEquals(UserRole.CITIZEN, user.getRole());
        assertTrue(user.getActive());
        assertNotNull(user.getCreatedAt());
        assertFalse(user.getCreatedAt().isBefore(before));
        assertFalse(user.getCreatedAt().isAfter(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC)));
        assertNotEquals(password, user.getPasswordHash());
        assertTrue(passwordEncoder.matches(password, user.getPasswordHash()));
        assertEquals(jsonMapper.valueToTree(Map.of("id", user.getId().toString(), "name", user.getName(),
                "email", email, "role", "CITIZEN")), jsonMapper.readTree(response.body()));
        assertTrue(response.headers().allValues("Set-Cookie").isEmpty());
        assertEquals(200, postLogin(email.toLowerCase(java.util.Locale.ROOT), password).statusCode());
        assertUnauthorized(postLogin(email, password.strip()));
    }

    @Test
    void rejectsDuplicateRegistrationIgnoringCaseAndOuterWhitespace() throws Exception {
        String email = "Duplicate-" + UUID.randomUUID() + "@Example.COM";
        assertEquals(201, postRegister("First citizen", email, PASSWORD).statusCode());
        UserEntity original = userRepository.findByEmail(email).orElseThrow();

        HttpResponse<String> duplicate = postRegister("Another citizen",
                "  " + email.toLowerCase(java.util.Locale.ROOT) + "  ", "another-password");

        assertEquals(409, duplicate.statusCode());
        assertEquals("EMAIL_ALREADY_REGISTERED", jsonMapper.readTree(duplicate.body()).path("code").asString());
        UserEntity stored = userRepository.findByEmail(email).orElseThrow();
        assertEquals(original.getId(), stored.getId());
        assertEquals("First citizen", stored.getName());
        assertTrue(passwordEncoder.matches(PASSWORD, stored.getPasswordHash()));
    }

    @Test
    void simultaneousRegistrationsCreateOnlyOneAccountAndReturnConflictForTheOther() throws Exception {
        String email = "Race-" + UUID.randomUUID() + "@Example.COM";
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<HttpResponse<String>> first = executor.submit(() -> {
                ready.countDown();
                assertTrue(start.await(10, TimeUnit.SECONDS));
                return postRegister("First citizen", email, PASSWORD);
            });
            Future<HttpResponse<String>> second = executor.submit(() -> {
                ready.countDown();
                assertTrue(start.await(10, TimeUnit.SECONDS));
                return postRegister("Second citizen", email.toLowerCase(java.util.Locale.ROOT), PASSWORD);
            });
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();

            List<Integer> statuses = List.of(first.get(20, TimeUnit.SECONDS).statusCode(),
                    second.get(20, TimeUnit.SECONDS).statusCode()).stream().sorted().toList();

            assertEquals(List.of(201, 409), statuses);
            assertTrue(userRepository.findByEmail(email).isPresent());
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERATOR", "TECHNICIAN", "ADMINISTRATOR", "ANALYST"})
    void rejectsInvalidAndPrivilegedRegistrationWithoutSavingAnAccount(String role) throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String body = jsonMapper.writeValueAsString(Map.of("name", "Citizen", "email", email,
                "password", PASSWORD, "role", role));

        assertEquals(400, postJson("/api/auth/register", body).statusCode());
        assertEquals(400, postRegister("Citizen", email, "á".repeat(37)).statusCode());
        assertTrue(userRepository.findByEmail(email).isEmpty());
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void registrationDoesNotExposePasswordsOrHashesInResponsesOrLogs(CapturedOutput output) throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String password = "registration-secret-" + UUID.randomUUID();
        HttpResponse<String> created = postRegister("Citizen", email, password);
        assertEquals(201, created.statusCode());
        String hash = userRepository.findByEmail(email).orElseThrow().getPasswordHash();
        HttpResponse<String> duplicate = postRegister("Citizen", email, password);
        assertEquals(409, duplicate.statusCode());
        HttpResponse<String> invalid = postRegister("", email, password);
        assertEquals(400, invalid.statusCode());
        HttpResponse<String> oversized = postRegister("Citizen", email, password + "x".repeat(73));
        assertEquals(400, oversized.statusCode());

        for (HttpResponse<String> response : List.of(created, duplicate, invalid, oversized)) {
            assertFalse(response.body().contains(password));
            assertFalse(response.body().contains(hash));
        }
        assertFalse(output.getAll().contains(password));
        assertFalse(output.getAll().contains(hash));
    }

    @Test
    void logsInAgainstPostgresAndReturnsOnlyPublicFields() throws Exception {
        UserEntity user = createUser(true);

        HttpResponse<String> response = postLogin(user.getEmail(), PASSWORD);

        assertEquals(200, response.statusCode());
        assertEquals(jsonMapper.valueToTree(new LoginResponse(
                        user.getId(), user.getName(), user.getEmail(), user.getRole())),
                jsonMapper.readTree(response.body()).path("user"));
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
        assertEquals(user.getEmail(), jsonMapper.readTree(response.body()).path("user").path("email").asString());
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
        return postJson("/api/auth/login", body);
    }

    private HttpResponse<String> postRegister(String name, String email, String password) throws Exception {
        return postJson("/api/auth/register", jsonMapper.writeValueAsString(
                Map.of("name", name, "email", email, "password", password)));
    }

    private HttpResponse<String> postJson(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
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
