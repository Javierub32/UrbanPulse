package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.exception.EmailAlreadyRegisteredException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.LoginResponseMapper;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.RegisterMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginResponseMapper loginResponseMapper;
    private final RegisterMapper registerMapper;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new EmailAlreadyRegisteredException();
        }

        UserEntity user = registerMapper.toEntity(request);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.CITIZEN);
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));

        try {
            return registerMapper.toDTO(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            // The unique index also covers registrations that race after the initial lookup.
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause instanceof ConstraintViolationException violation
                        && "uq_User_email_ignore_case".equals(violation.getConstraintName())) {
                    throw new EmailAlreadyRegisteredException();
                }
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public Optional<LoginResponse> authenticate(String email, String password) {
        // BCrypt accepts at most 72 UTF-8 bytes; never silently truncate credentials.
        if (email == null || email.isBlank() || password == null || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return Optional.empty();
        }

        Optional<UserEntity> user;
        try {
            user = userRepository.findByEmail(email);
        } catch (IncorrectResultSizeDataAccessException exception) {
            // The current schema allows duplicate emails. Never choose an arbitrary account.
            return Optional.empty();
        }

        return user.filter(candidate -> Boolean.TRUE.equals(candidate.getActive()))
                .filter(candidate -> matchesPassword(password, candidate.getPasswordHash()))
                .map(loginResponseMapper::toDTO);
    }

    private boolean matchesPassword(String password, String hash) {
        if (hash == null || hash.isBlank()) {
            return false;
        }
        try {
            return passwordEncoder.matches(password, hash);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
