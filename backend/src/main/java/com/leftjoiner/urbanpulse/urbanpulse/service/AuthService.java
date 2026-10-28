package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.User;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.LoginResponseMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginResponseMapper loginResponseMapper;

    @Transactional(readOnly = true)
    public Optional<LoginResponse> authenticate(String email, String password) {
        // BCrypt accepts at most 72 UTF-8 bytes; never silently truncate credentials.
        if (email == null || email.isBlank() || password == null || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return Optional.empty();
        }

        Optional<User> user;
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
