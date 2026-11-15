package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class IncidentRequest {

    @NotBlank
    @Size(max = 255)
    private String title;

    @NotBlank
    private String description;

    @NotNull
    private IncidentCategory category;

    @NotNull
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double latitude;

    @NotNull
    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double longitude;

    @Schema(description = "Fecha y hora de registro elegida para la incidencia, como instante ISO-8601. Si se omite, se usa la hora actual.", example = "2026-11-14T13:32:00Z")
    private Instant registeredAt;

    @Size(max = 255)
    @Schema(description = "Calle obtenida por la app al seleccionar la ubicación. Si se omite, el servidor intentará obtenerla.", example = "Calle Larios 1")
    private String normalizedAddress;

}
