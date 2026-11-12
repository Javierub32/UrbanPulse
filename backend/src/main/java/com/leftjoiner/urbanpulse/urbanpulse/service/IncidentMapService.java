package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentMapItem;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;

@Service
@RequiredArgsConstructor
public class IncidentMapService {
    private final NamedParameterJdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<IncidentMapItem> find(double west, double south, double east, double north, double zoom,
            IncidentCategory category, IncidentStatus status, java.time.Instant since, UrbanPulsePrincipal principal) {
        if (!Double.isFinite(west) || !Double.isFinite(east) || !Double.isFinite(south) || !Double.isFinite(north)
                || !Double.isFinite(zoom) || west < -180 || east > 180 || west >= east
                || south < -85 || north > 85 || south >= north || zoom < 0 || zoom > 22) {
            throw new IllegalArgumentException("Límites o zoom no válidos");
        }
        var params = new MapSqlParameterSource().addValue("west", west).addValue("south", south)
                .addValue("east", east).addValue("north", north)
                .addValue("accessRole", principal.getRole().name()).addValue("viewerId", principal.getId())
                .addValue("category", category == null ? null : category.name())
                .addValue("status", status == null ? null : status.name())
                .addValue("since", since == null ? null : java.time.LocalDateTime.ofInstant(since, java.time.ZoneOffset.UTC));
        // Una cuadrícula global estable evita que los grupos cambien al desplazar el mapa.
        // El filtro espacial utiliza el índice GiST sobre la geometría original.
        String sql = """
            WITH points AS (
              SELECT "id", "title", "category"::text AS category, "status"::text AS status,
                     ST_X("location") AS x, ST_Y("location") AS y
              FROM "Incident"
              WHERE "location" && ST_MakeEnvelope(:west, :south, :east, :north, 4326)
                AND (:accessRole = 'OPERATOR' OR (:accessRole = 'CITIZEN' AND "userId" = :viewerId)
                  OR (:accessRole = 'TECHNICIAN' AND EXISTS (SELECT 1 FROM "Assignment" a
                    WHERE a."incidentId" = "Incident"."id" AND a."technicianId" = :viewerId)))
                AND ST_Intersects("location", ST_MakeEnvelope(:west, :south, :east, :north, 4326))
                AND (CAST(:category AS text) IS NULL OR "category"::text = :category)
                AND (CAST(:status AS text) IS NULL OR "status"::text = :status)
                AND (CAST(:since AS timestamp) IS NULL OR "registeredAt" >= CAST(:since AS timestamp))
            ), grouped AS (
              SELECT floor((x + 180) / :cell) AS gx, floor((y + 90) / :cell) AS gy,
                count(*) AS amount, avg(x) AS x, avg(y) AS y, min(x) AS west, max(x) AS east, min(y) AS south, max(y) AS north,
                min("id"::text) AS id, min("title") AS title,
                min(category) AS category, min(status) AS status
              FROM points GROUP BY 1, 2
            ) SELECT * FROM grouped ORDER BY gx, gy
            """;
        double cell = 360.0 * 24.0 / (512.0 * Math.pow(2, zoom));
        long singles;
        boolean overlapping;
        double separation = 360.0 * 44.0 / (512.0 * Math.pow(2, zoom));
        params.addValue("separation", separation);
        do {
            params.addValue("cell", cell);
            Long count = jdbc.queryForObject("SELECT count(*) FROM (" + sql + ") groups WHERE amount = 1", params, Long.class);
            singles = count == null ? 0 : count;
            // Las celdas adyacentes pueden producir centros casi coincidentes.
            // Comparamos en Mercator, la misma proyección usada por el mapa.
            Boolean collision = jdbc.queryForObject("""
                WITH candidates AS (
                """ + sql + """
                )
                SELECT EXISTS (SELECT 1 FROM candidates a JOIN candidates b
                  ON (a.gx, a.gy) < (b.gx, b.gy)
                  AND a.amount > 1 AND b.amount > 1
                  AND abs(a.x - b.x) < :separation
                  AND abs(degrees(ln(tan(pi()/4 + radians(a.y)/2)))
                        - degrees(ln(tan(pi()/4 + radians(b.y)/2)))) < :separation
                  WHERE power(a.x - b.x, 2) + power(
                      degrees(ln(tan(pi()/4 + radians(a.y)/2)))
                      - degrees(ln(tan(pi()/4 + radians(b.y)/2))), 2) < power(:separation, 2))
                """, params, Boolean.class);
            overlapping = Boolean.TRUE.equals(collision);
            cell *= 2;
        } while (singles > 50 || overlapping);
        return jdbc.query(sql, params, (rs, row) -> {
            long count = rs.getLong("amount");
            return new IncidentMapItem(count == 1 ? "incident" : "cluster",
                    count == 1 ? rs.getString("id") : null, count == 1 ? rs.getString("title") : null,
                    count == 1 ? rs.getString("category") : null, count == 1 ? rs.getString("status") : null,
                    rs.getDouble("y"), rs.getDouble("x"), count, rs.getDouble("west"), rs.getDouble("south"),
                    rs.getDouble("east"), rs.getDouble("north"));
        });
    }
    @Transactional(readOnly = true)
    public List<IncidentMapItem> members(double west, double south, double east, double north,
            IncidentCategory category, IncidentStatus status, int page, java.time.Instant since, UrbanPulsePrincipal principal) {
        if (!Double.isFinite(west) || !Double.isFinite(east) || !Double.isFinite(south) || !Double.isFinite(north)
                || west < -180 || east > 180 || west > east || south < -85 || north > 85 || south > north
                || page < 0 || page > 100000) throw new IllegalArgumentException("Área o página no válida");
        var params = new MapSqlParameterSource().addValue("west", west).addValue("south", south)
                .addValue("east", east).addValue("north", north).addValue("offset", (long) page * 50)
                .addValue("accessRole", principal.getRole().name()).addValue("viewerId", principal.getId())
                .addValue("category", category == null ? null : category.name())
                .addValue("status", status == null ? null : status.name())
                .addValue("since", since == null ? null : java.time.LocalDateTime.ofInstant(since, java.time.ZoneOffset.UTC));
        return jdbc.query("""
            SELECT "id"::text AS id, "title", "category"::text AS category, "status"::text AS status,
                   ST_X("location") AS x, ST_Y("location") AS y
            FROM "Incident"
            WHERE "location" && ST_MakeEnvelope(:west - 0.00000001, :south - 0.00000001, :east + 0.00000001, :north + 0.00000001, 4326)
              AND (:accessRole = 'OPERATOR' OR (:accessRole = 'CITIZEN' AND "userId" = :viewerId)
                OR (:accessRole = 'TECHNICIAN' AND EXISTS (SELECT 1 FROM "Assignment" a
                  WHERE a."incidentId" = "Incident"."id" AND a."technicianId" = :viewerId)))
              AND ST_X("location") BETWEEN :west AND :east AND ST_Y("location") BETWEEN :south AND :north
              AND (CAST(:category AS text) IS NULL OR "category"::text = :category)
              AND (CAST(:status AS text) IS NULL OR "status"::text = :status)
                AND (CAST(:since AS timestamp) IS NULL OR "registeredAt" >= CAST(:since AS timestamp))
            ORDER BY "id" LIMIT 50 OFFSET :offset
            """, params, (rs, row) -> new IncidentMapItem("incident", rs.getString("id"), rs.getString("title"),
                    rs.getString("category"), rs.getString("status"), rs.getDouble("y"), rs.getDouble("x"), 1,
                    null, null, null, null));
    }

}
