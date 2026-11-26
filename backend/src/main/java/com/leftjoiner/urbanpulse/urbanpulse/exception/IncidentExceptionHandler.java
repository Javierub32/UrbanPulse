package com.leftjoiner.urbanpulse.urbanpulse.exception;

import com.leftjoiner.urbanpulse.urbanpulse.controller.IncidentAssignmentController;
import com.leftjoiner.urbanpulse.urbanpulse.controller.IncidentController;
import com.leftjoiner.urbanpulse.urbanpulse.controller.InitialReviewController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice(assignableTypes = {IncidentController.class, InitialReviewController.class, IncidentAssignmentController.class})
public class IncidentExceptionHandler extends RequestExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ProblemDetail handleUserNotFound(UserNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, "Usuario no encontrado", "No existe el usuario indicado.", "USER_NOT_FOUND");
    }

    @ExceptionHandler(IncidentNotFoundException.class)
    public ProblemDetail handleIncidentNotFound(IncidentNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, "Incidencia no encontrada",
                "No existe la incidencia indicada.", "INCIDENT_NOT_FOUND");
    }

    @ExceptionHandler(InvalidAssignmentDestinationException.class)
    public ProblemDetail handleInvalidAssignmentDestination(InvalidAssignmentDestinationException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Destino de asignación no válido",
                exception.getMessage(), "INVALID_ASSIGNMENT_DESTINATION");
    }

    @ExceptionHandler(IncidentNotAssignableException.class)
    public ProblemDetail handleIncidentNotAssignable(IncidentNotAssignableException exception) {
        return problem(HttpStatus.CONFLICT, "Incidencia no asignable", exception.getMessage(), "INCIDENT_NOT_ASSIGNABLE");
    }

    @ExceptionHandler(InvalidPaginationException.class)
    public ProblemDetail handleInvalidPagination(InvalidPaginationException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Paginación no válida",
                exception.getMessage(), "INVALID_PAGINATION");
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
