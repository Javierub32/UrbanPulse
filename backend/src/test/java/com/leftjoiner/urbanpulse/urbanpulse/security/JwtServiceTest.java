package com.leftjoiner.urbanpulse.urbanpulse.security;

import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

import com.leftjoiner.urbanpulse.urbanpulse.config.JwtConfig;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private final Instant now = Instant.parse("2026-11-03T10:00:00Z");
    private final Clock clock = Clock.fixed(now, ZoneOffset.UTC);
    private final UUID id = UUID.randomUUID();
    private SecretKey key;
    private JwtService service;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(Base64.getEncoder().encodeToString("test-only-key-".repeat(6).getBytes(StandardCharsets.UTF_8)));
        properties.setIssuer("urbanpulse");
        properties.setAudience("urbanpulse-api");
        properties.setAccessTokenTtlSeconds(900);
        JwtConfig config = new JwtConfig();
        key = config.jwtSigningKey(properties);
        service = new JwtService(key, config.jwtParser(key, properties, clock), properties, clock);
    }

    @Test
    void issuesSignedTokenWithExpectedIdentityAndExpiryWithoutPersonalData() {
        String token = service.issue(id, UserRole.CITIZEN);
        var claims = Jwts.parser().verifyWith(key).clock(() -> Date.from(now)).build()
                .parseSignedClaims(token).getPayload();

        assertEquals(id, service.validate(token).getId());
        assertEquals(UserRole.CITIZEN, service.validate(token).getRole());
        assertEquals("urbanpulse", claims.getIssuer());
        assertEquals(Set.of("urbanpulse-api"), claims.getAudience());
        assertEquals(now, claims.getIssuedAt().toInstant());
        assertEquals(now.plusSeconds(900), claims.getExpiration().toInstant());
        assertNotNull(claims.getId());
        assertEquals(Set.of("sub", "iss", "aud", "iat", "exp", "jti", "role"), claims.keySet());
        assertEquals(900, service.expiresIn());
    }

    @Test
    void rejectsOtherSigningKeyTamperingAndUnsignedTokens() {
        SecretKey otherKey = Jwts.SIG.HS256.key().build();
        rejects(token().signWith(otherKey, Jwts.SIG.HS256).compact());
        String[] parts = service.issue(id, UserRole.CITIZEN).split("\\.");
        parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);
        rejects(String.join(".", parts));
        rejects(token().compact());
    }

    @Test
    void onlyAcceptsHs256EvenWhenTheSameSecretCanSignOtherAlgorithms() {
        rejects(token().signWith(key, Jwts.SIG.HS384).compact());
        rejects(token().signWith(key, Jwts.SIG.HS512).compact());
    }

    @Test
    void rejectsExpiredTokensIncludingTheExactExpiryInstant() {
        rejects(token().issuedAt(Date.from(now.minusSeconds(900))).expiration(Date.from(now.minusSeconds(1)))
                .signWith(key, Jwts.SIG.HS256).compact());
        rejects(token().issuedAt(Date.from(now.minusSeconds(900))).expiration(Date.from(now))
                .signWith(key, Jwts.SIG.HS256).compact());
    }

    @Test
    void requiresExpectedIssuerAudienceAndMandatoryTimestamps() {
        rejects(token().issuer("other-app").signWith(key, Jwts.SIG.HS256).compact());
        rejects(token().audience().clear().add("other-api").and().signWith(key, Jwts.SIG.HS256).compact());
        rejects(token().issuer(null).signWith(key, Jwts.SIG.HS256).compact());
        rejects(token().audience().clear().and().signWith(key, Jwts.SIG.HS256).compact());
        rejects(token().issuedAt(null).signWith(key, Jwts.SIG.HS256).compact());
        rejects(token().expiration(null).signWith(key, Jwts.SIG.HS256).compact());
        rejects(token().issuedAt(Date.from(now.plusSeconds(1))).signWith(key, Jwts.SIG.HS256).compact());
    }

    @ParameterizedTest
    @ValueSource(strings = {"not-a-uuid", "1-1-1-1-1", ""})
    void requiresCanonicalUuidSubject(String subject) {
        rejects(token().subject(subject).signWith(key, Jwts.SIG.HS256).compact());
    }

    @Test
    void rejectsMissingSubject() {
        rejects(token().subject(null).signWith(key, Jwts.SIG.HS256).compact());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERADMIN", "ROLE_CITIZEN", "citizen", ""})
    void rejectsUnknownRoles(String role) {
        rejects(token().claim("role", role).signWith(key, Jwts.SIG.HS256).compact());
    }

    @Test
    void rejectsMissingRole() {
        rejects(token().claim("role", null).signWith(key, Jwts.SIG.HS256).compact());
    }

    private JwtBuilder token() {
        return Jwts.builder().subject(id.toString()).claim("role", "CITIZEN").issuer("urbanpulse").audience().add("urbanpulse-api").and()
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(900)));
    }

    private void rejects(String token) {
        RuntimeException failure = assertThrows(RuntimeException.class, () -> service.validate(token));
        assertTrue(failure instanceof JwtException || failure instanceof IllegalArgumentException);
    }
}
