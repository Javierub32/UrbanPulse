package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentAssignmentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.ProblemResponseSchema;
import com.leftjoiner.urbanpulse.urbanpulse.dto.AssignmentCatalogOption;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/operator/assignments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Se requiere autenticación",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
    @ApiResponse(responseCode = "403", description = "Operación reservada a operadores",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
})
public class IncidentAssignmentController {
    private final IncidentAssignmentService service;

    @GetMapping("/catalog")
    @Operation(summary = "Consultar departamentos, equipos y técnicos disponibles",
            description = "Los equipos y técnicos indican su departamento y el número de incidencias asignadas o en curso.")
    @ApiResponse(responseCode = "200", description = "Catálogo de destinos y carga de trabajo")
    public List<AssignmentCatalogOption> listOptions() {
        return service.listOptions();
    }

    @PostMapping("/{incidentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Asignar una incidencia validada",
            description = "Envía departmentId y un único destino de ese departamento: teamId o technicianId. La incidencia pasa a ASSIGNED.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Asignación registrada"),
        @ApiResponse(responseCode = "400", description = "Destino o petición inválidos",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "404", description = "Incidencia no encontrada",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "409", description = "La incidencia no está validada",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    public void assign(@PathVariable UUID incidentId, @Valid @RequestBody IncidentAssignmentRequest request,
                       @AuthenticationPrincipal UrbanPulsePrincipal actor) {
        service.assign(incidentId, request, actor.getId());
    }
}
