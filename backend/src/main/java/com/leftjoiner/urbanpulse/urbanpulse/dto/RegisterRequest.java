package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.leftjoiner.urbanpulse.urbanpulse.validation.RegistrationPassword;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "Datos para registrar un ciudadano. No admite campos adicionales.",
        additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public class RegisterRequest {

    @NotBlank(message = "El nombre es obligatorio.")
    @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
    @Schema(example = "Ana García", maxLength = 100)
    private String name;

    @NotBlank(message = "El email es obligatorio.")
    @Email(message = "El email debe tener un formato válido.")
    @Size(max = 254, message = "El email no puede superar 254 caracteres.")
    @Schema(example = "ana@example.com", maxLength = 254)
    private String email;

    @NotBlank(message = "La contraseña es obligatoria.")
    @RegistrationPassword
    @Schema(description = "Al menos 8 caracteres y como máximo 72 bytes UTF-8. Se conserva sin cambios.",
            format = "password", minLength = 8, accessMode = Schema.AccessMode.WRITE_ONLY)
    private String password;

    public void setName(String name) {
        this.name = name == null ? null : name.strip();
    }

    public void setEmail(String email) {
        this.email = email == null ? null : email.strip();
    }

    @JsonAnySetter
    public void rejectUnknownProperty(String name, Object value) {
        throw new IllegalArgumentException("El registro no admite campos adicionales.");
    }
}
