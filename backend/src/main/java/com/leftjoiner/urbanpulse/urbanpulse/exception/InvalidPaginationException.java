package com.leftjoiner.urbanpulse.urbanpulse.exception;

public class InvalidPaginationException extends RuntimeException {

    public InvalidPaginationException() {
        super("La página o el tamaño solicitados no son válidos.");
    }
}
