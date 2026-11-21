package com.leftjoiner.urbanpulse.urbanpulse.exception;

public class InvalidPaginationException extends RuntimeException {

    public InvalidPaginationException() {
        super("La página, el tamaño o el cursor solicitados no son válidos.");
    }
}
