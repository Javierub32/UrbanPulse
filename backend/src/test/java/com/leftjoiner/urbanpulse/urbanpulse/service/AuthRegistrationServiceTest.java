package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.exception.EmailAlreadyRegisteredException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.LoginResponseMapper;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.RegisterMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthRegistrationServiceTest {

    @Mock private UserRepository userRepository;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, new LoginResponseMapper(), new RegisterMapper());
    }

    @Test
    void storesOnlyHashAndCreatesAnActiveCitizenWithServerTimestamp() {
        RegisterRequest request = request();
        request.setPassword(" password with spaces ");
        UUID id = UUID.randomUUID();
        LocalDateTime before = LocalDateTime.now(ZoneOffset.UTC);
        when(userRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            UserEntity user = invocation.getArgument(0);
            assertNull(user.getId());
            assertEquals("Ana García", user.getName());
            assertEquals("Ana@Example.com", user.getEmail());
            assertEquals(UserRole.CITIZEN, user.getRole());
            assertTrue(user.getActive());
            assertFalse(user.getCreatedAt().isBefore(before));
            assertFalse(user.getCreatedAt().isAfter(LocalDateTime.now(ZoneOffset.UTC)));
            assertNotEquals(request.getPassword(), user.getPasswordHash());
            assertTrue(passwordEncoder.matches(request.getPassword(), user.getPasswordHash()));
            assertFalse(passwordEncoder.matches(request.getPassword().strip(), user.getPasswordHash()));
            user.setId(id);
            return user;
        });

        RegisterResponse result = authService.register(request);

        assertEquals(new RegisterResponse(id, "Ana García", "Ana@Example.com", UserRole.CITIZEN), result);
        verify(userRepository).findByEmail("Ana@Example.com");
    }

    @Test
    void rejectsEmailAlreadyRegisteredBeforeSaving() {
        when(userRepository.findByEmail("Ana@Example.com")).thenReturn(Optional.of(new UserEntity()));

        assertThrows(EmailAlreadyRegisteredException.class, () -> authService.register(request()));

        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void translatesUniqueEmailViolationWhenAnotherRegistrationWinsTheRace() {
        when(userRepository.saveAndFlush(any())).thenThrow(violation("uq_User_email_ignore_case"));

        assertThrows(EmailAlreadyRegisteredException.class, () -> authService.register(request()));
    }

    @Test
    void doesNotMisreportOtherPersistenceFailuresAsDuplicateEmails() {
        DataIntegrityViolationException failure = violation("another_constraint");
        when(userRepository.saveAndFlush(any())).thenThrow(failure);

        assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                () -> authService.register(request())));
    }

    private DataIntegrityViolationException violation(String constraint) {
        return new DataIntegrityViolationException("Database constraint failure",
                new ConstraintViolationException("Constraint failure", new SQLException(), constraint));
    }

    private RegisterRequest request() {
        RegisterRequest request = new RegisterRequest();
        request.setName("  Ana García  ");
        request.setEmail("  Ana@Example.com  ");
        request.setPassword("test-password");
        return request;
    }
}
