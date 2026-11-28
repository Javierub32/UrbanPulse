package com.leftjoiner.urbanpulse.urbanpulse.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AttachmentException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AttachmentException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    private AttachmentException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    public static AttachmentException unavailable(Throwable cause) {
        return new AttachmentException(HttpStatus.SERVICE_UNAVAILABLE, "ATTACHMENT_STORAGE_UNAVAILABLE",
                "El almacenamiento de adjuntos no está disponible. Vuelve a intentarlo.", cause);
    }

    public static AttachmentException notFound() {
        return new AttachmentException(HttpStatus.NOT_FOUND, "ATTACHMENT_NOT_FOUND",
                "No existe el adjunto indicado.");
    }
}
