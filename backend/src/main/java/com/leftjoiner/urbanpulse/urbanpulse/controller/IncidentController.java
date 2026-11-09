package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentDetailResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentListItemResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.ProblemResponseSchema;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentService;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {
    private final IncidentService incidentService;
    private final com.leftjoiner.urbanpulse.urbanpulse.service.IncidentMapService incidentMapService;

    @Operation(summary = "Crear una incidencia", description = "Registra una incidencia del ciudadano autenticado. "
            + "El autor se obtiene del JWT y debe seguir activo al recuperarlo en el servicio. "
            + "userId no forma parte de la entrada y, si se envía, se ignora.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Incidencia creada",
                content = @Content(mediaType = "application/json", schema = @Schema(implementation = IncidentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Datos de entrada no válidos",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "401", description = "UNAUTHENTICATED: token ausente, no válido o caducado; cuenta inexistente o inactiva",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "403", description = "ACCESS_DENIED: la creación está reservada a ciudadanos",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "500", description = "Error inesperado",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @PostMapping("/create")
    public ResponseEntity<IncidentResponse> create(@Valid @RequestBody IncidentRequest request,
            @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidentService.create(request, principal.getId()));
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

    @Operation(summary = "Consultar incidencias agrupadas para el mapa", description = "Filtra el área visible y devuelve grupos con su recuento y hasta 50 incidencias individuales. Coordenadas WGS84 y zoom entre 0 y 22.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Puntos y agrupaciones", content = @Content(array = @ArraySchema(schema = @Schema(implementation = com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem.class)))),
        @ApiResponse(responseCode = "400", description = "Límites, zoom o filtros no válidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/map")
    public List<com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem> map(
            @RequestParam double west, @RequestParam double south, @RequestParam double east,
            @RequestParam double north, @RequestParam double zoom,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory category,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus status) {
        return incidentMapService.find(west, south, east, north, zoom, category, status);
    }

    @Operation(summary = "Consultar incidencias de una agrupación", description = "Devuelve páginas de hasta 50 incidencias del área del grupo con los filtros activos.")
    @GetMapping("/map-members")
    public List<com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem> mapMembers(
            @RequestParam double west, @RequestParam double south, @RequestParam double east, @RequestParam double north,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory category,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus status) {
        return incidentMapService.members(west, south, east, north, category, status, page);
    }

    @Operation(summary = "Consultar una incidencia pública", description = "Devuelve el detalle y el historial público de una incidencia, sin datos del autor.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Detalle de la incidencia", content = @Content(schema = @Schema(implementation = IncidentDetailResponse.class))),
        @ApiResponse(responseCode = "400", description = "Identificador no válido", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "404", description = "Incidencia inexistente", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/{id}")
    public IncidentDetailResponse getDetail(@PathVariable UUID id) {
        return incidentService.getIncidentDetail(id);
    }

}
