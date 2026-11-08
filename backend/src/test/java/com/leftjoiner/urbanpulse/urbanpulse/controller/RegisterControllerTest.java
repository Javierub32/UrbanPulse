package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.config.JwtConfig;
import com.leftjoiner.urbanpulse.urbanpulse.config.SecurityConfig;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import com.leftjoiner.urbanpulse.urbanpulse.security.JwtService;
import com.leftjoiner.urbanpulse.urbanpulse.security.SecurityProblemHandler;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.exception.EmailAlreadyRegisteredException;
import com.leftjoiner.urbanpulse.urbanpulse.service.AuthService;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.configuration.SpringDocSpecPropertiesConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@Import({SecurityConfig.class,
        JwtConfig.class,
        JwtService.class,
        SecurityProblemHandler.class})
@WebMvcTest(AuthController.class)
@EnableConfigurationProperties(SpringDocConfigProperties.class)
@ImportAutoConfiguration({SpringDocConfiguration.class, SpringDocSpecPropertiesConfiguration.class,
        SpringDocWebMvcConfiguration.class})
class RegisterControllerTest {
    @MockitoBean private UserRepository userRepository;

    private static final JsonMapper JSON = JsonMapper.builder().build();
    @Autowired private MockMvc mockMvc;
    @MockitoBean private AuthService authService;

    @Test
    void createsCitizenReturningOnlyPublicDataWithoutStartingSession() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.register(any())).thenReturn(
                new RegisterResponse(id, "Ana García", "Ana@Example.com", UserRole.CITIZEN));

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsString(Map.of("name", "  Ana García  ",
                                "email", " Ana@Example.com ", "password", " password with spaces "))))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andExpect(jsonPath("$", aMapWithSize(4)))
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Ana García"))
                .andExpect(jsonPath("$.email").value("Ana@Example.com"))
                .andExpect(jsonPath("$.role").value("CITIZEN"));

        verify(authService).register(argThat(request -> request.getName().equals("Ana García")
                && request.getEmail().equals("Ana@Example.com")
                && request.getPassword().equals(" password with spaces ")));
    }

    @ParameterizedTest
    @MethodSource("invalidFields")
    void rejectsInvalidFieldsWithSafeFieldErrors(String field, String value) throws Exception {
        Map<String, Object> body = validBody();
        body.put(field, value);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[?(@.field == '" + field + "')].code").value(hasItem("INVALID_VALUE")))
                .andExpect(jsonPath("$.errors[0].rejectedValue").doesNotExist());
        verifyNoInteractions(authService);
    }

    static Stream<Arguments> invalidFields() {
        return Stream.of(
                Arguments.of("name", null), Arguments.of("name", ""), Arguments.of("name", "  "),
                Arguments.of("name", "a".repeat(101)),
                Arguments.of("email", null), Arguments.of("email", ""), Arguments.of("email", "  "),
                Arguments.of("email", "invalid-email"),
                Arguments.of("email", "a".repeat(64) + "@" + "a".repeat(63) + "." + "b".repeat(63) + "." + "c".repeat(62)),
                Arguments.of("password", null), Arguments.of("password", ""), Arguments.of("password", " ".repeat(8)),
                Arguments.of("password", "a".repeat(7)), Arguments.of("password", "😀".repeat(4)),
                Arguments.of("password", "a".repeat(73)), Arguments.of("password", "á".repeat(37)),
                Arguments.of("password", "😀".repeat(19)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345678", "áááááááá", "😀😀😀😀😀😀😀😀", "        x"})
    void acceptsMinimumPasswordAndPreservesWhitespace(String password) throws Exception {
        assertAcceptedPassword(password);
    }

    @Test
    void acceptsBothAsciiAndUnicodePasswordsAtBcryptByteLimit() throws Exception {
        assertAcceptedPassword("a".repeat(72));
        assertAcceptedPassword("á".repeat(36));
        assertAcceptedPassword("😀".repeat(18));
    }

    @Test
    void acceptsMaximumNameAndEmailLength() throws Exception {
        Map<String, Object> body = validBody();
        body.put("name", "a".repeat(100));
        body.put("email", "a".repeat(64) + "@" + "a".repeat(63) + "." + "b".repeat(63) + "." + "c".repeat(61));

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsString(body)))
                .andExpect(status().isCreated());
    }

    @ParameterizedTest
    @ValueSource(strings = {"role", "active", "id", "passwordHash", "createdAt", "unexpected"})
    void rejectsAdditionalPropertiesIncludingPrivilegeInjection(String property) throws Exception {
        Map<String, Object> body = validBody();
        body.put(property, "ADMINISTRATOR");
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(content().string(not(containsString("test-password"))));
        verifyNoInteractions(authService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "{", "[]", "{\"email\":{}}"})
    void rejectsUnreadableRequestsWithoutExposingParserDetails(String body) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verifyNoInteractions(authService);
    }

    @Test
    void returnsConflictForDuplicateEmail() throws Exception {
        when(authService.register(any())).thenThrow(new EmailAlreadyRegisteredException());
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsString(validBody())))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"))
                .andExpect(jsonPath("$.instance").value("/api/auth/register"));
    }

    @Test
    void hidesInternalErrorDetails() throws Exception {
        when(authService.register(any())).thenThrow(new IllegalStateException("sensitive internal detail"));
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsString(validBody())))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(content().string(not(containsString("sensitive internal detail"))));
    }

    @Test
    void documentsActualInputAndResponsesInOpenApi() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.requestBody.content['application/json'].schema['$ref']")
                        .value("#/components/schemas/RegisterRequest"))
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['201'].content['application/json']").exists())
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['400'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['409'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['500'].content['application/problem+json']").exists())
                .andExpect(jsonPath("$.components.schemas.RegisterRequest.additionalProperties").value(false))
                .andExpect(jsonPath("$.components.schemas.RegisterRequest.properties.password.minLength").value(8));
    }

    private void assertAcceptedPassword(String password) throws Exception {
        Map<String, Object> body = validBody();
        body.put("password", password);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(JSON.writeValueAsString(body)))
                .andExpect(status().isCreated());
    }

    private Map<String, Object> validBody() {
        return new HashMap<>(Map.of("name", "Ana García", "email", "ana@example.com", "password", "test-password"));
    }
}
