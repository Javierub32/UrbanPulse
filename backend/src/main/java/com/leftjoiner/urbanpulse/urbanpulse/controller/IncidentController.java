package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentListItemResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.ProblemResponseSchema;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "http://localhost:8081")
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

    @Operation(
            summary = "Listar incidencias públicas",
            description = "Devuelve las incidencias registradas con los datos mínimos para mostrarlas en la app. No requiere autenticación.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Listado de incidencias",
                content = @Content(mediaType = "application/json",
                        schema = @Schema(implementation = IncidentListItemResponse.class))),
        @ApiResponse(responseCode = "500", description = "Error inesperado",
                content = @Content(mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/public")
    public List<IncidentListItemResponse> listPublicIncidents() {
        return incidentService.listAllPublicIncidents();
    }

}
