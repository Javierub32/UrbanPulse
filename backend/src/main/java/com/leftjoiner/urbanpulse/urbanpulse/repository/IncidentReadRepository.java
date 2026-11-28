package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentListItemResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentSummaryResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class IncidentReadRepository {

    private static final String INCIDENTS = " FROM \"Incident\" i WHERE ";
    private static final String ORDER = " ORDER BY i.\"registeredAt\" DESC NULLS LAST, i.\"id\" DESC";
    private static final String NORMALIZED_TITLE = """
        regexp_replace(normalize(lower(i."title"), NFD), U&'[\\0300-\\036f]', '', 'g')
        """;
    private static final String NORMALIZED_ADDRESS = """
        regexp_replace(normalize(lower(i."normalizedAddress"), NFD), U&'[\\0300-\\036f]', '', 'g')
        """;

    private final NamedParameterJdbcTemplate jdbc;

    public record Filters(IncidentCategory category, List<IncidentStatus> statuses, String text,
                          LocalDateTime since, LocalDateTime until) {
    }

    public record Cursor(LocalDateTime registeredAt, UUID id) {
    }

    public List<IncidentListItemResponse> findPage(UrbanPulsePrincipal principal, Filters filters,
                                                   Cursor after, int limit) {
        var params = parameters(principal).addValue("limit", limit);
        String where = filtered(principal, filters, params);
        if (after != null) {
            params.addValue("afterId", after.id());
            if (after.registeredAt() == null) {
                where += " AND i.\"registeredAt\" IS NULL AND i.\"id\" < :afterId";
            } else {
                params.addValue("afterDate", after.registeredAt());
                where += """
                     AND ((i."registeredAt", i."id") < (:afterDate, :afterId) OR i."registeredAt" IS NULL)
                    """;
            }
        }

        return jdbc.query("""
                SELECT i."id", i."title", i."category", i."status", i."registeredAt", i."normalizedAddress",
                       CASE WHEN GeometryType(i."location") = 'POINT' THEN ST_Y(i."location") END AS latitude,
                       CASE WHEN GeometryType(i."location") = 'POINT' THEN ST_X(i."location") END AS longitude
                """ + INCIDENTS + where + ORDER + " LIMIT :limit", params, (rs, row) -> {
            String category = rs.getString("category");
            String status = rs.getString("status");
            return new IncidentListItemResponse(
                    rs.getObject("id", UUID.class),
                    rs.getString("title"),
                    category == null ? null : IncidentCategory.valueOf(category),
                    status == null ? null : IncidentStatus.valueOf(status),
                    rs.getObject("registeredAt", LocalDateTime.class),
                    rs.getObject("latitude", Double.class),
                    rs.getObject("longitude", Double.class),
                    rs.getString("normalizedAddress"));
        });
    }

    public long count(UrbanPulsePrincipal principal, Filters filters) {
        var params = parameters(principal);
        return jdbc.queryForObject("SELECT count(*)" + INCIDENTS + filtered(principal, filters, params),
                params, Long.class);
    }

    public IncidentSummaryResponse summarize(UrbanPulsePrincipal principal, ZoneId zone) {
        var params = parameters(principal);
        String accessible = INCIDENTS + accessCondition(principal);
        Map<String, Long> statuses = counts("""
                SELECT coalesce(i."status"::text, '') AS value, count(*) AS total
                """ + accessible + " GROUP BY 1", params);
        long total = statuses.values().stream().mapToLong(Long::longValue).sum();
        if (zone == null) {
            return new IncidentSummaryResponse(total, statuses, Map.of(), Map.of());
        }

        Map<String, Long> categories = counts("""
                SELECT coalesce(i."category"::text, 'OTHER') AS value, count(*) AS total
                """ + accessible + " GROUP BY 1", params);

        LocalDate tomorrow = LocalDate.now(zone).plusDays(1);
        params.addValue("zone", zone.getId())
                .addValue("since", tomorrow.minusDays(60).atStartOfDay(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime())
                .addValue("until", tomorrow.atStartOfDay(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime());
        Map<LocalDate, Long> days = jdbc.query("""
                SELECT (i."registeredAt" AT TIME ZONE 'UTC' AT TIME ZONE :zone)::date AS day, count(*) AS total
                """ + accessible + """
                 AND i."registeredAt" >= :since AND i."registeredAt" < :until GROUP BY 1
                """, params, rs -> {
            Map<LocalDate, Long> result = new LinkedHashMap<>();
            while (rs.next()) {
                result.put(rs.getObject("day", LocalDate.class), rs.getLong("total"));
            }
            return result;
        });
        return new IncidentSummaryResponse(total, statuses, categories, days);
    }

    private Map<String, Long> counts(String sql, MapSqlParameterSource params) {
        return jdbc.query(sql, params, rs -> {
            Map<String, Long> result = new LinkedHashMap<>();
            while (rs.next()) {
                result.put(rs.getString("value"), rs.getLong("total"));
            }
            return result;
        });
    }

    private String filtered(UrbanPulsePrincipal principal, Filters filters, MapSqlParameterSource params) {
        var where = new StringBuilder(accessCondition(principal));
        if (filters.category() != null) {
            where.append(" AND i.\"category\" = CAST(:category AS \"IncidentCategory\")");
            params.addValue("category", filters.category().name());
        }
        if (!filters.statuses().isEmpty()) {
            where.append(" AND i.\"status\"::text IN (:statuses)");
            params.addValue("statuses", filters.statuses().stream().map(IncidentStatus::name).distinct().toList());
        }
        if (filters.text() != null && !filters.text().isEmpty()) {
            where.append(" AND (strpos(").append(NORMALIZED_TITLE).append(", :text) > 0 OR strpos(")
                    .append(NORMALIZED_ADDRESS).append(", :text) > 0)");
            params.addValue("text", filters.text());
        }
        if (filters.since() != null) {
            where.append(" AND i.\"registeredAt\" >= :since");
            params.addValue("since", filters.since());
        }
        if (filters.until() != null) {
            where.append(" AND i.\"registeredAt\" < :until");
            params.addValue("until", filters.until());
        }
        return where.toString();
    }

    private String accessCondition(UrbanPulsePrincipal principal) {
        return switch (principal.getRole()) {
            case OPERATOR -> "TRUE";
            case CITIZEN -> "i.\"userId\" = :viewerId";
            case TECHNICIAN -> """
                EXISTS (SELECT 1 FROM "IncidentTechnicianAccess" a
                        WHERE a."incidentId" = i."id" AND a."technicianId" = :viewerId)
                """;
            default -> throw new AccessDeniedException("Acceso denegado");
        };
    }

    private MapSqlParameterSource parameters(UrbanPulsePrincipal principal) {
        return new MapSqlParameterSource().addValue("viewerId", principal.getId());
    }
}
