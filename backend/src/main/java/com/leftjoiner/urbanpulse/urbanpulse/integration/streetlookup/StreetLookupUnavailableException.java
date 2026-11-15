package com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup;

public class StreetLookupUnavailableException extends RuntimeException {
    public StreetLookupUnavailableException(String message) {
        super(message);
    }

    public StreetLookupUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
