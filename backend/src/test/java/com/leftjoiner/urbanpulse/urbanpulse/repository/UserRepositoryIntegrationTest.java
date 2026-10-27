package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.User;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
@SpringBootTest(properties = "spring.docker.compose.enabled=false")
@Transactional
class UserRepositoryIntegrationTest {

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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @ParameterizedTest
    @ValueSource(strings = {"citizen@example.com", "CITIZEN@EXAMPLE.COM", "Citizen@Example.com"})
    void findsUserIgnoringEmailCaseAndReadsStoredBcryptHash(String email) {
        String password = "test-password";
        User user = new User();
        user.setName("Test citizen");
        user.setEmail("Citizen@Example.com");
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(UserRole.CITIZEN);
        user.setActive(true);
        entityManager.persist(user);
        entityManager.flush();
        entityManager.clear();

        User found = userRepository.findByEmail(email).orElseThrow();

        assertEquals(user.getId(), found.getId());
        assertEquals("Citizen@Example.com", found.getEmail());
        assertEquals(user.getPasswordHash(), found.getPasswordHash());
        assertTrue(passwordEncoder.matches(password, found.getPasswordHash()));
    }

    @Test
    void returnsEmptyWhenEmailDoesNotExist() {
        assertTrue(userRepository.findByEmail("missing@example.com").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"citizen@example.com", "CITIZEN@EXAMPLE.COM"})
    void databaseRejectsDuplicateEmailRegardlessOfCase(String email) {
        User first = new User();
        first.setEmail("citizen@example.com");
        userRepository.saveAndFlush(first);

        User duplicate = new User();
        duplicate.setEmail(email);

        assertThrows(DataIntegrityViolationException.class,
                () -> userRepository.saveAndFlush(duplicate));
    }
}
