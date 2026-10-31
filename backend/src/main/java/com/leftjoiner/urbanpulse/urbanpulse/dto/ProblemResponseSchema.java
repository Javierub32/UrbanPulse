package com.leftjoiner.urbanpulse.urbanpulse.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Modelo de documentación; las respuestas se construyen con ProblemDetail. */
@Getter
@Setter
@Schema(name = "ProblemResponse", description = "Detalle de un error HTTP")
public class ProblemResponseSchema {
    private String type;
    private String title;
    private Integer status;
    private String detail;
    private String instance;
    @Schema(description = "Código estable del error", example = "VALIDATION_ERROR")
    private String code;
    @Schema(description = "Errores por campo, presentes en errores de validación")
    private List<FieldError> errors;

    @Getter
    @Setter
    public static class FieldError {
        private String field;
        private String code;
        private String message;
    }
}
