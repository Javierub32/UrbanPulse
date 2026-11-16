package com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo;

public class OpenMeteoException extends RuntimeException {
    public OpenMeteoException(String message) {
        super(message);
    }

    public OpenMeteoException(String message, Throwable cause) {
        super(message, cause);
    }
}
