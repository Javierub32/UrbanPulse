package com.leftjoiner.urbanpulse.urbanpulse.exception;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException() {
        super("No existe el usuario indicado.");
    }
}
