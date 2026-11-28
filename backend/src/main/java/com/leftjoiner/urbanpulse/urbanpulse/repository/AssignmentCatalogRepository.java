package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.dto.AssignmentCatalogOption;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AssignmentCatalogRepository {
    private final JdbcTemplate jdbc;

    public List<AssignmentCatalogOption> findOptions() {
        return jdbc.query("""
            WITH technicians AS (
                SELECT u."id", u."name", u."teamId", t."departmentId"
                FROM "User" u JOIN "Team" t ON t."id" = u."teamId"
                WHERE u."role" = 'TECHNICIAN' AND u."active" = true
            ), active_work AS (
                SELECT a."incidentId", a."teamId", a."technicianId"
                FROM "Assignment" a JOIN "Incident" i ON i."id" = a."incidentId"
                WHERE a."status" IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS')
                  AND i."status" IN ('ASSIGNED', 'IN_PROGRESS')
            ), technician_work AS (
                SELECT technician."id", count(DISTINCT work."incidentId") AS total
                FROM technicians technician
                JOIN active_work work ON work."technicianId" = technician."id"
                                      OR work."teamId" = technician."teamId"
                GROUP BY technician."id"
            ), team_work AS (
                SELECT coalesce(work."teamId", technician."teamId") AS id,
                       count(DISTINCT work."incidentId") AS total
                FROM active_work work LEFT JOIN technicians technician ON technician."id" = work."technicianId"
                GROUP BY 1
            )
            SELECT 'DEPARTMENT' AS kind, d."id" AS id, NULL::uuid AS department_id,
                   d."name" AS name, 0::bigint AS assigned_count
            FROM "Department" d
            UNION ALL
            SELECT 'TEAM', t."id", t."departmentId", t."name", coalesce(w.total, 0)
            FROM "Team" t LEFT JOIN team_work w ON w.id = t."id"
            WHERE EXISTS (SELECT 1 FROM technicians WHERE technicians."teamId" = t."id")
            UNION ALL
            SELECT 'TECHNICIAN', t."id", t."departmentId", t."name", coalesce(w.total, 0)
            FROM technicians t LEFT JOIN technician_work w ON w."id" = t."id"
            ORDER BY kind, name, id
            """, (rs, row) -> new AssignmentCatalogOption(
                AssignmentCatalogOption.Kind.valueOf(rs.getString("kind")),
                rs.getObject("id", UUID.class), rs.getObject("department_id", UUID.class),
                rs.getString("name"), rs.getLong("assigned_count")));
    }
}
