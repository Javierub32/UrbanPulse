package com.leftjoiner.urbanpulse.urbanpulse.exception;

public class IncidentNotFoundException extends RuntimeException {

    public IncidentNotFoundException() {
        super("No existe la incidencia indicada.");
    }
}
