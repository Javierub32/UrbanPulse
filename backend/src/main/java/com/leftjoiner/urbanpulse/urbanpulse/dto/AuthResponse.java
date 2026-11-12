package com.leftjoiner.urbanpulse.urbanpulse.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    @Schema(allowableValues = "Bearer")
    private String tokenType;
    @Schema(description = "Duración del token en segundos")
    private int expiresIn;
    private LoginResponse user;
}
