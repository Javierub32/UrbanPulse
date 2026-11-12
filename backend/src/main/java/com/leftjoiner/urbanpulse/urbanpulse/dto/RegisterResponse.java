package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Datos públicos del ciudadano registrado. El registro no inicia sesión.")
public class RegisterResponse {
    private UUID id;
    private String name;
    private String email;
    @Schema(allowableValues = "CITIZEN")
    private UserRole role;
}
