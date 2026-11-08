package com.leftjoiner.urbanpulse.urbanpulse.exception;

public class EmailAlreadyRegisteredException extends RuntimeException {
    public EmailAlreadyRegisteredException() {
        super("El email ya está registrado.");
    }
}
