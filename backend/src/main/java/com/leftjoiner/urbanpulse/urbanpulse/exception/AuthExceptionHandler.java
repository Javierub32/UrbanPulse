package com.leftjoiner.urbanpulse.urbanpulse.exception;

import com.leftjoiner.urbanpulse.urbanpulse.controller.AuthController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler extends RequestExceptionHandler {

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ProblemDetail handleDuplicateEmail(EmailAlreadyRegisteredException exception) {
        return problem(HttpStatus.CONFLICT, "Email ya registrado", "El email ya está registrado.",
                "EMAIL_ALREADY_REGISTERED");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception exception) {
        // Authentication exceptions can contain credentials in their message or cause.
        log.error("Error inesperado de autenticación: {}", exception.getClass().getSimpleName());
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno",
                "No se ha podido procesar la petición.", "INTERNAL_ERROR");
    }
}
