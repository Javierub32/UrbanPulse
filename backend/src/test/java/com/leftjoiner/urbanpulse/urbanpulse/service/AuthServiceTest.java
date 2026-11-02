package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.LoginResponseMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String EMAIL = "citizen@example.com";
    private static final String PASSWORD = "test-password";

    @Mock
    private UserRepository userRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, new LoginResponseMapper());
    }

    @Test
    void returnsPublicUserForValidCredentials() {
        UserEntity user = activeUser(PASSWORD);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        LoginResponse response = authService.authenticate(EMAIL, PASSWORD).orElseThrow();

        assertEquals(new LoginResponse(user.getId(), user.getName(), EMAIL, UserRole.CITIZEN), response);
    }

    @Test
    void rejectsUnknownEmail() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertTrue(authService.authenticate(EMAIL, PASSWORD).isEmpty());
    }

    @Test
    void rejectsIncorrectPassword() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(activeUser(PASSWORD)));

        assertTrue(authService.authenticate(EMAIL, "wrong-password").isEmpty());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(booleans = false)
    void rejectsInactiveOrUnspecifiedActiveState(Boolean active) {
        UserEntity user = activeUser(PASSWORD);
        user.setActive(active);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertTrue(authService.authenticate(EMAIL, PASSWORD).isEmpty());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "plaintext", "$2a$10$bad"})
    void rejectsMissingOrMalformedStoredHash(String hash) {
        UserEntity user = activeUser(PASSWORD);
        user.setPasswordHash(hash);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertTrue(authService.authenticate(EMAIL, PASSWORD).isEmpty());
    }

    @Test
    void rejectsBcryptHashWithInvalidCost() {
        UserEntity user = activeUser(PASSWORD);
        user.setPasswordHash("$2a$03$" + "a".repeat(53));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertTrue(authService.authenticate(EMAIL, PASSWORD).isEmpty());
    }

    @Test
    void rejectsDuplicateEmails() {
        when(userRepository.findByEmail(EMAIL))
                .thenThrow(new IncorrectResultSizeDataAccessException(1, 2));

        assertTrue(authService.authenticate(EMAIL, PASSWORD).isEmpty());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " "})
    void rejectsMissingPasswordWithoutQueryingDatabase(String password) {
        assertTrue(authService.authenticate(EMAIL, password).isEmpty());
        verifyNoInteractions(userRepository);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " "})
    void rejectsMissingEmailWithoutQueryingDatabase(String email) {
        assertTrue(authService.authenticate(email, PASSWORD).isEmpty());
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsPasswordBeyondBcryptByteLimit() {
        assertTrue(authService.authenticate(EMAIL, "a".repeat(73)).isEmpty());
        assertTrue(authService.authenticate(EMAIL, "á".repeat(37)).isEmpty());
        verifyNoInteractions(userRepository);
    }

    @Test
    void acceptsPasswordAtBcryptByteLimit() {
        String password = "á".repeat(36);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(activeUser(password)));

        assertTrue(authService.authenticate(EMAIL, password).isPresent());
    }

    private UserEntity activeUser(String password) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setName("Test citizen");
        user.setEmail(EMAIL);
        user.setRole(UserRole.CITIZEN);
        user.setActive(true);
        user.setPasswordHash(passwordEncoder.encode(password));
        return user;
    }
}
