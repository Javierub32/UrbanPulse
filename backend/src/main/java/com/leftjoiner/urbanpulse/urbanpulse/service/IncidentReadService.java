package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentCursorResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentSummaryResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.exception.InvalidPaginationException;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentReadRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentReadRepository.Cursor;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentReadRepository.Filters;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class IncidentReadService {

    private static final int MAX_PAGE_SIZE = 100;
    private final IncidentReadRepository repository;

    @Transactional(readOnly = true)
    public IncidentCursorResponse list(UrbanPulsePrincipal principal, int size, String pageToken,
                                       IncidentCategory category, List<IncidentStatus> statuses, String text,
                                       Instant since, Instant until, boolean includeTotal) {
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidPaginationException();
        }
        if (since != null && until != null && !since.isBefore(until)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Intervalo de fechas no válido.");
        }
        if (text != null && text.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La búsqueda admite hasta 200 caracteres.");
        }

        Cursor after = decode(pageToken);
        var filters = new Filters(category, statuses, normalize(text), utc(since), utc(until));
        var rows = repository.findPage(principal, filters, after, size + 1);
        String next = null;
        if (rows.size() > size) {
            rows = rows.subList(0, size);
            var last = rows.get(size - 1);
            next = encode(new Cursor(last.getRegisteredAt(), last.getId()));
        }
        Long total = includeTotal && after == null ? repository.count(principal, filters) : null;
        return new IncidentCursorResponse(rows, next, total);
    }

    @Transactional(readOnly = true)
    public IncidentSummaryResponse summary(UrbanPulsePrincipal principal, String zone) {
        try {
            return repository.summarize(principal, zone == null ? null : ZoneId.of(zone));
        } catch (DateTimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zona horaria no válida.");
        }
    }

    private static LocalDateTime utc(Instant instant) {
        return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static String normalize(String text) {
        if (text == null) return null;
        return Normalizer.normalize(text.strip().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }

    private static String encode(Cursor cursor) {
        String date = cursor.registeredAt() == null ? "" : cursor.registeredAt().toString();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString((cursor.id() + "\n" + date).getBytes(StandardCharsets.UTF_8));
    }

    private static Cursor decode(String token) {
        if (token == null) return null;
        if (token.length() > 120) throw new InvalidPaginationException();
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8).split("\n", -1);
            if (parts.length != 2) throw new InvalidPaginationException();
            return new Cursor(parts[1].isEmpty() ? null : LocalDateTime.parse(parts[1]), UUID.fromString(parts[0]));
        } catch (IllegalArgumentException | DateTimeException ex) {
            throw new InvalidPaginationException();
        }
    }
}
