package com.leftjoiner.urbanpulse.urbanpulse.exception;

import com.leftjoiner.urbanpulse.urbanpulse.controller.IncidentController;
import com.leftjoiner.urbanpulse.urbanpulse.controller.IncidentAttachmentController;
import com.leftjoiner.urbanpulse.urbanpulse.controller.InitialReviewController;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@Slf4j
@RestControllerAdvice(assignableTypes = {IncidentController.class, InitialReviewController.class,
        IncidentAttachmentController.class})
public class IncidentExceptionHandler extends RequestExceptionHandler {

    @ExceptionHandler(AttachmentException.class)
    public ProblemDetail handleAttachment(AttachmentException exception) {
        if (exception.getStatus() == HttpStatus.SERVICE_UNAVAILABLE) {
            log.warn("Error al acceder al almacenamiento de adjuntos", exception);
        }
        if (exception.getStatus() == HttpStatus.BAD_REQUEST) {
            return fileProblem(exception.getStatus(), exception.getCode(), exception.getMessage());
        }
        return problem(exception.getStatus(), "No se ha podido procesar el adjunto",
                exception.getMessage(), exception.getCode());
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        var detail = fileProblem(HttpStatus.CONTENT_TOO_LARGE, "ATTACHMENT_TOO_LARGE",
                "El fichero supera el límite de 10 MB.");
        return handleExceptionInternal(exception, detail, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestPart(MissingServletRequestPartException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        var detail = fileProblem(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT", "Selecciona un fichero.");
        return handleExceptionInternal(exception, detail, headers, status, request);
    }

    @ExceptionHandler(MultipartException.class)
    public ProblemDetail handleMalformedMultipart(MultipartException exception) {
        return fileProblem(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT", "No se ha podido leer el fichero.");
    }

    private static ProblemDetail fileProblem(HttpStatus status, String code, String message) {
        ProblemDetail detail = problem(status, "Fichero no válido", message, code);
        detail.setProperty("errors", List.of(Map.of("field", "file", "code", code, "message", message)));
        return detail;
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ProblemDetail handleUserNotFound(UserNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, "Usuario no encontrado", "No existe el usuario indicado.", "USER_NOT_FOUND");
    }

    @ExceptionHandler(IncidentNotFoundException.class)
    public ProblemDetail handleIncidentNotFound(IncidentNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, "Incidencia no encontrada",
                "No existe la incidencia indicada.", "INCIDENT_NOT_FOUND");
    }

    @ExceptionHandler(InvalidPaginationException.class)
    public ProblemDetail handleInvalidPagination(InvalidPaginationException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Paginación no válida",
                "La página o el tamaño solicitados no son válidos.", "INVALID_PAGINATION");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleInvalidMap(IllegalArgumentException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Petición no válida", "Los límites o el zoom no son válidos.", "INVALID_REQUEST");
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ProblemDetail handleReviewError(org.springframework.web.server.ResponseStatusException exception) {
        return ProblemDetail.forStatusAndDetail(exception.getStatusCode(), exception.getReason() == null ? "Petición no válida." : exception.getReason());
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception exception) {
        log.error("Error inesperado al procesar una incidencia", exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno",
                "No se ha podido procesar la petición.", "INTERNAL_ERROR");
    }

}
