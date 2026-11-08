package com.leftjoiner.urbanpulse.urbanpulse.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = RegistrationPasswordValidator.class)
public @interface RegistrationPassword {
    String message() default "La contraseña debe tener al menos 8 caracteres y no superar 72 bytes UTF-8.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
