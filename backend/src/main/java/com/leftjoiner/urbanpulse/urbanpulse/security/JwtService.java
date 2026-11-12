package com.leftjoiner.urbanpulse.urbanpulse.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class JwtService {
    private final SecretKey jwtSigningKey;
    private final JwtParser jwtParser;
    private final JwtProperties properties;
    private final Clock jwtClock;

    public String issue(UUID userId, UserRole role) {
        Instant now = jwtClock.instant();
        return Jwts.builder().subject(userId.toString())
                .claim("role", role.name())
                .issuer(properties.getIssuer()).audience().add(properties.getAudience()).and()
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(properties.getAccessTokenTtlSeconds())))
                .id(UUID.randomUUID().toString()).signWith(jwtSigningKey, Jwts.SIG.HS256).compact();
    }

    public UrbanPulsePrincipal validate(String token) {
        Claims claims = jwtParser.parseSignedClaims(token).getPayload();
        if (claims.getSubject() == null || claims.getExpiration() == null || claims.getIssuedAt() == null
                || !claims.getExpiration().toInstant().isAfter(jwtClock.instant())
                || claims.getIssuedAt().after(Date.from(jwtClock.instant()))
                || !claims.getExpiration().after(claims.getIssuedAt())) {
            throw new JwtException("Token no válido.");
        }
        UUID userId = UUID.fromString(claims.getSubject());
        if (!userId.toString().equals(claims.getSubject())) {
            throw new JwtException("Token no válido.");
        }
        String claimRole = claims.get("role", String.class);
        if (claimRole == null) throw new JwtException("Token sin rol.");
        UserRole role = UserRole.valueOf(claimRole);
        return new UrbanPulsePrincipal(userId, role);
    }

    public int expiresIn() {
        return properties.getAccessTokenTtlSeconds();
    }
}
