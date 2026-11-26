package com.leftjoiner.urbanpulse.urbanpulse.exception;

public class IncidentNotAssignableException extends RuntimeException {

    public IncidentNotAssignableException() {
        super("Solo se pueden asignar incidencias validadas.");
    }
}
