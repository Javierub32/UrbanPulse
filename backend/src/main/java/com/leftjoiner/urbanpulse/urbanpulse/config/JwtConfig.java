package com.leftjoiner.urbanpulse.urbanpulse.config;

import com.leftjoiner.urbanpulse.urbanpulse.security.JwtProperties;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import java.time.Clock;
import java.util.Base64;
import java.util.Date;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {
    @Bean
    public Clock jwtClock() {
        return Clock.systemUTC();
    }

    @Bean
    public SecretKey jwtSigningKey(JwtProperties properties) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(properties.getSecret());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("La clave JWT debe estar codificada en Base64.");
        }
        if (bytes.length < 32) {
            throw new IllegalStateException("La clave JWT debe contener al menos 32 bytes aleatorios.");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    public JwtParser jwtParser(SecretKey jwtSigningKey, JwtProperties properties, Clock jwtClock) {
        return Jwts.parser().verifyWith(jwtSigningKey)
                .sig().clear().add(Jwts.SIG.HS256).and()
                .requireIssuer(properties.getIssuer()).requireAudience(properties.getAudience())
                .clock(() -> Date.from(jwtClock.instant())).build();
    }
}
