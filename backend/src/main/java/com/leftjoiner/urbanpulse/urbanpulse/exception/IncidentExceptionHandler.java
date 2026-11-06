package com.leftjoiner.urbanpulse.urbanpulse.exception;

import com.leftjoiner.urbanpulse.urbanpulse.controller.IncidentController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice(assignableTypes = IncidentController.class)
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

    @ExceptionHandler(InvalidPaginationException.class)
    public ProblemDetail handleInvalidPagination(InvalidPaginationException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Paginación no válida",
                "La página o el tamaño solicitados no son válidos.", "INVALID_PAGINATION");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception exception) {
        log.error("Error inesperado al procesar una incidencia", exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno",
                "No se ha podido procesar la petición.", "INTERNAL_ERROR");
    }

}
