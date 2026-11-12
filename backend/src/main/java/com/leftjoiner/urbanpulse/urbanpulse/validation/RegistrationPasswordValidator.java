package com.leftjoiner.urbanpulse.urbanpulse.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

public class RegistrationPasswordValidator implements ConstraintValidator<RegistrationPassword, String> {
    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        return password == null || (password.codePointCount(0, password.length()) >= 8
                && password.getBytes(StandardCharsets.UTF_8).length <= 72);
    }
}
