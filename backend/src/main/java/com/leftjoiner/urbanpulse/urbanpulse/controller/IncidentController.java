package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.ProblemResponseSchema;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {
    private final IncidentService incidentService;

    @Operation(summary = "Crear una incidencia", description = "Registra una incidencia asociada al usuario indicado.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Incidencia creada",
                content = @Content(mediaType = "application/json", schema = @Schema(implementation = IncidentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Datos de entrada no válidos",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "500", description = "Error inesperado",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @PostMapping("/create")
    public ResponseEntity<IncidentResponse> create(@Valid @RequestBody IncidentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidentService.create(request));
    }

    @Operation(summary = "Listar mis incidencias", description = "Lista las incidencias asociadas al usuario autenticado.")   
    @ApiResponses({
        @ApiResponse(responseCOde = "200", description = "Pagina de incidencias",
                content = @Content(mediaType = "application/json", @Schema(implementation = IncidentPageResponse.class))),
        @ApiResponse(responseCode = "400", description = "Paginación no válida",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
         @ApiResponse(responseCode = "401", description = "Autenticación requerida",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),        
    })
    public IncidentPageResponse list(@AuthenticationPrincipal(expression = "id") UUID citizenId,
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "20") int size) {
        return incidentService.listForCitizen(citizenId, page, size);
    }

    @GetMapping("/{id}")
    @Operation(
        summary = "Consultar una incidencia",
        description = "Devuelve una incidencia propia y su historial visible.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Detalle de la incidencia",
            content = @Content(schema = @Schema(implementation = IncidentDetailResponse.class))),
        @ApiResponse(responseCode = "401", description = "Autenticación requerida",
            content = @Content(schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "404", description = "Incidencia no encontrada",
            content = @Content(schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    public IncidentDetailResponse get(@AuthenticationPrincipal(expression = "id") UUID citizenId,
                                @PathVariable UUID id) {
        return incidentService.getForCitizen(citizenId, id);
    }

}
