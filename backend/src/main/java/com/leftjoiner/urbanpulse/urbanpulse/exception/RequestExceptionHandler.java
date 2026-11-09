package com.leftjoiner.urbanpulse.urbanpulse.exception;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Respuestas de validación compartidas por los controladores de la API. */
public abstract class RequestExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Petición no válida", "El identificador indicado no es válido.", "INVALID_REQUEST");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException exception) {
        return problem(HttpStatus.FORBIDDEN, "Acceso denegado",
                "No tienes permiso para realizar esta operación.", "ACCESS_DENIED");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .cacheControl(CacheControl.noStore()).body(problem(HttpStatus.UNAUTHORIZED, "Autenticación necesaria",
                        "Inicia sesión con una credencial válida.", "UNAUTHENTICATED"));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<Map<String, String>> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of("field", error.getField(), "code", "INVALID_VALUE",
                        "message", error.getDefaultMessage() == null ? "Valor no válido" : error.getDefaultMessage()))
                .toList();
        ProblemDetail detail = problem(HttpStatus.BAD_REQUEST, "Datos de entrada no válidos",
                "Revisa los campos indicados.", "VALIDATION_ERROR");
        detail.setProperty("errors", errors);
        return handleExceptionInternal(exception, detail, headers, HttpStatus.BAD_REQUEST, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail detail = problem(HttpStatus.BAD_REQUEST, "Petición no válida",
                "El cuerpo de la petición no tiene un formato válido.", "INVALID_REQUEST");
        return handleExceptionInternal(exception, detail, headers, HttpStatus.BAD_REQUEST, request);
    }

    protected static ProblemDetail problem(HttpStatus status, String title, String message, String code) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(status, message);
        detail.setTitle(title);
        detail.setProperty("code", code);
        return detail;
    }
}
