package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Test
    void returnsOnlyPublicUserDataForValidCredentials() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.authenticate("citizen@example.com", "test-password"))
                .thenReturn(Optional.of(new LoginResponse(id, "Test citizen", "citizen@example.com", UserRole.CITIZEN)));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"citizen@example.com","password":"test-password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", aMapWithSize(4)))
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Test citizen"))
                .andExpect(jsonPath("$.email").value("citizen@example.com"))
                .andExpect(jsonPath("$.role").value("CITIZEN"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void returnsGenericUnauthorizedResponseForInvalidCredentials() throws Exception {
        when(authService.authenticate("citizen@example.com", "wrong-password"))
                .thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"citizen@example.com","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$", aMapWithSize(1)))
                .andExpect(jsonPath("$.message").value("Credenciales inválidas"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}",
            "{\"email\":\"bad-email\",\"password\":\"test-password\"}",
            "{\"email\":\"\",\"password\":\"test-password\"}",
            "{\"email\":\" \",\"password\":\"test-password\"}",
            "{\"email\":null,\"password\":\"test-password\"}",
            "{\"email\":\"citizen@example.com\"}",
            "{\"email\":\"citizen@example.com\",\"password\":null}",
            "{\"email\":\"citizen@example.com\",\"password\":\"\"}",
            "{\"email\":\"citizen@example.com\",\"password\":\" \"}",
            "{\"email\":\"citizen@example.com\",\"password\":\"   \"}",
            "null",
            "{"
    })
    void rejectsInvalidRequestsBeforeCallingService(String body) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    void preservesPasswordWhitespace() throws Exception {
        when(authService.authenticate("citizen@example.com", " test-password "))
                .thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"citizen@example.com","password":" test-password "}
                                """))
                .andExpect(status().isUnauthorized());

        verify(authService).authenticate("citizen@example.com", " test-password ");
    }
}
