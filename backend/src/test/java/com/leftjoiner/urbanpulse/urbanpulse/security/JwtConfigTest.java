package com.leftjoiner.urbanpulse.urbanpulse.security;

import com.leftjoiner.urbanpulse.urbanpulse.config.JwtConfig;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class JwtConfigTest {
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(JwtConfig.class)
            .withPropertyValues("urbanpulse.jwt.issuer=urbanpulse", "urbanpulse.jwt.audience=urbanpulse-api",
                    "urbanpulse.jwt.access-token-ttl-seconds=900");
    private static final String TEST_SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

    @Test
    void startsWithExternallyConfiguredKey() {
        context.withPropertyValues("urbanpulse.jwt.secret=" + TEST_SECRET)
                .run(result -> assertThat(result).hasNotFailed().hasSingleBean(SecretKey.class));
    }

    @Test
    void refusesToStartWithoutKey() {
        context.run(result -> assertThat(result).hasFailed());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "not-valid-base64!", "dG9vLXNob3J0"})
    void refusesEmptyMalformedOrShortKeys(String secret) {
        context.withPropertyValues("urbanpulse.jwt.secret=" + secret)
                .run(result -> assertThat(result).hasFailed());
    }

    @ParameterizedTest
    @ValueSource(strings = {"urbanpulse.jwt.issuer=", "urbanpulse.jwt.audience=",
            "urbanpulse.jwt.access-token-ttl-seconds=0", "urbanpulse.jwt.access-token-ttl-seconds=-1"})
    void refusesInvalidIssuerAudienceOrLifetime(String property) {
        context.withPropertyValues("urbanpulse.jwt.secret=" + TEST_SECRET, property)
                .run(result -> assertThat(result).hasFailed());
    }
}
