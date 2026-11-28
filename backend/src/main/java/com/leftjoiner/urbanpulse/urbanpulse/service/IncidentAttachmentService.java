package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.AttachmentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.AttachmentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AttachmentType;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.exception.AttachmentException;
import com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotFoundException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.AttachmentMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.AttachmentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import com.leftjoiner.urbanpulse.urbanpulse.validation.AttachmentPolicy;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentAttachmentService {
    private final IncidentRepository incidents;
    private final IncidentService incidentService;
    private final AttachmentRepository attachments;
    private final AttachmentStorage storage;
    private final AttachmentMapper mapper;

    @Transactional
    public AttachmentResponse upload(UUID incidentId, UrbanPulsePrincipal principal, MultipartFile file) {
        if (principal.getRole() != UserRole.CITIZEN) {
            throw new AccessDeniedException("Acceso denegado");
        }
        var incident = incidents.findOwnedForAttachmentUpload(incidentId, principal.getId())
                .orElseThrow(IncidentNotFoundException::new);
        try {
            AttachmentPolicy.validateCapacity(attachments.countByIncident_Id(incidentId));
        } catch (IllegalArgumentException e) {
            throw new AttachmentException(HttpStatus.CONFLICT, "ATTACHMENT_LIMIT_REACHED", e.getMessage());
        }

        FileFormat format = validate(file);
        var attachment = new AttachmentEntity();
        attachment.setIncident(incident);
        attachment.setType(format.type());
        attachment.setName(displayName(file.getOriginalFilename(), format.extension()));
        attachment.setSize(file.getSize());
        attachment.setMetadata(Map.of("contentType", format.contentType()));
        attachment.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        attachments.save(attachment);

        String folder = format.type() == AttachmentType.PHOTO ? "photos" : "videos";
        String key = "incidents/" + folder + "/" + incidentId + "/" + attachment.getId() + "." + format.extension();
        attachment.setUrl(key);
        try (InputStream stream = file.getInputStream()) {
            removeOnRollback(key);
            storage.put(key, stream, file.getSize(), format.contentType());
        } catch (IOException e) {
            throw AttachmentException.unavailable(e);
        }
        return mapper.toDTO(attachment);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> list(UUID incidentId, UrbanPulsePrincipal principal) {
        incidentService.requireAccessibleIncident(incidentId, principal);
        return mapper.toDTOList(attachments.findAllByIncident_IdOrderByCreatedAtAscIdAsc(incidentId));
    }

    @Transactional(readOnly = true)
    public Download download(UUID incidentId, UUID attachmentId, UrbanPulsePrincipal principal) {
        incidentService.requireAccessibleIncident(incidentId, principal);
        var attachment = attachments.findByIdAndIncident_Id(attachmentId, incidentId)
                .filter(candidate -> candidate.getUrl() != null && !candidate.getUrl().isBlank())
                .orElseThrow(AttachmentException::notFound);
        return new Download(mapper.toDTO(attachment), storage.open(attachment.getUrl()));
    }

    private FileFormat validate(MultipartFile file) {
        try {
            return switch (AttachmentPolicy.validateFile(file)) {
                case JPEG -> new FileFormat(AttachmentType.PHOTO, "jpg", "image/jpeg");
                case PNG -> new FileFormat(AttachmentType.PHOTO, "png", "image/png");
                case MP4 -> new FileFormat(AttachmentType.VIDEO, "mp4", "video/mp4");
                case MOV -> new FileFormat(AttachmentType.VIDEO, "mov", "video/quicktime");
            };
        } catch (IllegalArgumentException e) {
            throw new AttachmentException(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT", e.getMessage());
        } catch (IOException e) {
            throw new AttachmentException(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT",
                    "No se ha podido leer el fichero.");
        }
    }

    private void removeOnRollback(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try {
                        storage.remove(key);
                    } catch (AttachmentException e) {
                        log.warn("No se pudo limpiar el adjunto {}", key, e);
                    }
                } else if (status == STATUS_UNKNOWN) {
                    log.warn("No se pudo confirmar la transacción del adjunto {}", key);
                }
            }
        });
    }

    private static String displayName(String original, String extension) {
        if (original == null) {
            return "adjunto." + extension;
        }
        String name = original.substring(Math.max(original.lastIndexOf('/'), original.lastIndexOf('\\')) + 1)
                .replaceAll("[\\p{Cc}\\p{Cf}]", "").strip();
        return name.isEmpty() ? "adjunto." + extension : name.substring(0,
                name.offsetByCodePoints(0, Math.min(120, name.codePointCount(0, name.length()))));
    }

    private record FileFormat(AttachmentType type, String extension, String contentType) {}

    public record Download(AttachmentResponse metadata, InputStream content) {}
}
