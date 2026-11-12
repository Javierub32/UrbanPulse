package com.leftjoiner.urbanpulse.urbanpulse.security;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties("urbanpulse.jwt")
public class JwtProperties {
    @NotBlank private String secret;
    @NotBlank private String issuer;
    @NotBlank private String audience;
    @Min(1) private int accessTokenTtlSeconds;
}
