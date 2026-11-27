package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentCursorResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentSummaryResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatusGroup;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentDetailResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentListItemResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.ProblemResponseSchema;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentReadService;
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
import java.time.Instant;
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
    private final IncidentReadService incidentReadService;
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

    @Operation(summary = "Listar incidencias accesibles por cursor",
            description = "Aplica filtros antes de paginar. Envía nextPageToken como pageToken para continuar con los mismos filtros. "
                    + "since es inclusivo y until es exclusivo. includeTotal devuelve el total filtrado en la primera página.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping
    public IncidentCursorResponse list(@RequestParam(defaultValue = "12") int size,
                                       @RequestParam(required = false) String pageToken,
                                       @RequestParam(required = false) IncidentCategory category,
                                       @RequestParam(name = "status", required = false) List<IncidentStatus> statuses,
                                       @RequestParam(name = "q", required = false) String text,
                                       @RequestParam(required = false) Instant since,
                                       @RequestParam(required = false) Instant until,
                                       @RequestParam(defaultValue = "false") boolean includeTotal,
                                       @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return incidentReadService.list(principal, size, pageToken, category,
                statuses == null ? List.of() : statuses, text, since, until, includeTotal);
    }

    @Operation(summary = "Resumir las incidencias accesibles",
            description = "Devuelve el total y los recuentos por estado. Con zone añade categorías y actividad de los últimos 60 días.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/summary")
    public IncidentSummaryResponse summary(@RequestParam(required = false) String zone,
                                           @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return incidentReadService.summary(principal, zone);
    }

    @Operation(
            summary = "Listar incidencias accesibles",
            description = "Devuelve las incidencias accesibles según el rol y las asignaciones del usuario autenticado.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Listado de incidencias",
                content = @Content(mediaType = "application/json",
                        schema = @Schema(implementation = IncidentListItemResponse.class))),
        @ApiResponse(responseCode = "401", description = "Autenticación necesaria", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "403", description = "Rol sin permiso para consultar incidencias", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "500", description = "Error inesperado",
                content = @Content(mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/public")
    public List<IncidentListItemResponse> listPublicIncidents(@AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return incidentService.listAccessibleIncidents(principal);
    }

    @Operation(summary = "Consultar incidencias accesibles agrupadas para el mapa", description = "Agrupa únicamente las incidencias accesibles para el usuario autenticado. statusGroup admite ACTIVE o RESOLVED y se combina con status. since es inclusivo y until es exclusivo.", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Puntos y agrupaciones", content = @Content(array = @ArraySchema(schema = @Schema(implementation = com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem.class)))),
        @ApiResponse(responseCode = "400", description = "Límites, zoom o filtros no válidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "401", description = "Autenticación necesaria", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "403", description = "Rol sin permiso para consultar incidencias", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/map")
    public List<com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem> map(
            @RequestParam double west, @RequestParam double south, @RequestParam double east,
            @RequestParam double north, @RequestParam double zoom,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory category,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus status,
            @RequestParam(required = false) java.time.Instant since,
            @RequestParam(required = false) java.time.Instant until,
            @RequestParam(required = false) IncidentStatusGroup statusGroup,
            @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return incidentMapService.find(west, south, east, north, zoom, category, status, since, until, statusGroup, principal);
    }

    @Operation(summary = "Consultar incidencias accesibles de una agrupación", description = "Devuelve páginas de hasta 50 incidencias accesibles del área del grupo; admite los mismos filtros statusGroup, status, since y until que el mapa; until es exclusivo.", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Incidencias accesibles", content = @Content(array = @ArraySchema(schema = @Schema(implementation = com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem.class)))),
        @ApiResponse(responseCode = "400", description = "Área o página no válida", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "401", description = "Autenticación necesaria", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "403", description = "Rol sin permiso para consultar incidencias", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/map-members")
    public List<com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem> mapMembers(
            @RequestParam double west, @RequestParam double south, @RequestParam double east, @RequestParam double north,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory category,
            @RequestParam(required = false) com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus status,
            @RequestParam(required = false) java.time.Instant since,
            @RequestParam(required = false) java.time.Instant until,
            @RequestParam(required = false) IncidentStatusGroup statusGroup,
            @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return incidentMapService.members(west, south, east, north, category, status, page, since, until, statusGroup, principal);
    }

    @Operation(summary = "Consultar una incidencia accesible", description = "Devuelve el detalle y el historial si el usuario tiene acceso a la incidencia.", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Detalle de la incidencia", content = @Content(schema = @Schema(implementation = IncidentDetailResponse.class))),
        @ApiResponse(responseCode = "400", description = "Identificador no válido", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "401", description = "Autenticación necesaria", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "403", description = "Rol sin permiso para consultar incidencias", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "404", description = "Incidencia inexistente o no accesible", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/{id}")
    public IncidentDetailResponse getDetail(@PathVariable UUID id, @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return incidentService.getIncidentDetail(id, principal);
    }

}
