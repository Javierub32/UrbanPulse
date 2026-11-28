package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.AttachmentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.ProblemResponseSchema;
import com.leftjoiner.urbanpulse.urbanpulse.exception.AttachmentException;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import com.leftjoiner.urbanpulse.urbanpulse.service.IncidentAttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/incidents/{incidentId}/attachments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @ApiResponse(responseCode = "401", description = "Autenticación necesaria", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "403", description = "Rol sin permiso", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "404", description = "Incidencia no accesible o recurso inexistente", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "500", description = "Error interno", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
})
public class IncidentAttachmentController {
    private final IncidentAttachmentService service;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Subir un adjunto", description = "Un ciudadano puede adjuntar un fichero JPEG, PNG, MP4 o MOV de hasta 10 MB a una incidencia propia. Máximo cinco adjuntos.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Adjunto guardado", useReturnTypeSchema = true),
            @ApiResponse(responseCode = "400", description = "Fichero vacío, no válido o ausente", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
            @ApiResponse(responseCode = "409", description = "La incidencia ya tiene cinco adjuntos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
            @ApiResponse(responseCode = "413", description = "Se supera el tamaño máximo", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
            @ApiResponse(responseCode = "415", description = "La petición no usa multipart/form-data", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
            @ApiResponse(responseCode = "503", description = "Almacenamiento no disponible", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    public ResponseEntity<AttachmentResponse> upload(@PathVariable UUID incidentId, @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        AttachmentResponse attachment = service.upload(incidentId, principal, file);
        var location = ServletUriComponentsBuilder.fromCurrentRequestUri()
                .path("/{attachmentId}").buildAndExpand(attachment.getId()).toUri();
        return ResponseEntity.created(location).cacheControl(CacheControl.noStore()).body(attachment);
    }

    @Hidden
    @PostMapping
    public void rejectNonMultipartUpload() {
        throw new AttachmentException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "ATTACHMENT_MULTIPART_REQUIRED",
                "Envía el fichero mediante multipart/form-data.");
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Listar los adjuntos de una incidencia accesible")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Metadatos de los adjuntos", useReturnTypeSchema = true),
            @ApiResponse(responseCode = "400", description = "Identificador incorrecto", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    public ResponseEntity<List<AttachmentResponse>> list(@PathVariable UUID incidentId,
            @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(incidentId, principal));
    }

    @GetMapping("/{attachmentId}")
    @Operation(summary = "Descargar un adjunto de una incidencia accesible")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contenido binario", content = {
                    @Content(mediaType = "image/jpeg", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "image/png", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "video/mp4", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "video/quicktime", schema = @Schema(type = "string", format = "binary"))
            }),
            @ApiResponse(responseCode = "400", description = "Identificador incorrecto", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
            @ApiResponse(responseCode = "503", description = "Almacenamiento no disponible", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID incidentId, @PathVariable UUID attachmentId,
            @AuthenticationPrincipal UrbanPulsePrincipal principal) {
        var download = service.download(incidentId, attachmentId, principal);
        var metadata = download.metadata();
        String filename = metadata.getName() == null ? "adjunto" : metadata.getName();
        var disposition = ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build();
        var response = ResponseEntity.ok().contentType(metadata.getContentType() == null
                ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(metadata.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.noStore());
        if (metadata.getSize() != null) {
            response.contentLength(metadata.getSize());
        }
        return response.body(new InputStreamResource(download.content()));
    }
}
