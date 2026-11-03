package com.leftjoiner.urbanpulse.urbanpulse.migration;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@Testcontainers
class SyntheticIncidentMigrationIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"));

    private String databaseUrl;

    @BeforeEach
    void prepareDatabaseAtVersionThree() throws SQLException {
        String database = "incident_migration_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection connection = DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE " + database);
        }
        databaseUrl = "jdbc:postgresql://" + postgres.getHost() + ":"
                + postgres.getMappedPort(5432) + "/" + database;
        flyway("3").migrate();
    }

    @Test
    void addsFiftyLinkedIncidentsWithoutChangingExistingData() throws SQLException {
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO \"User\" (\"id\", \"email\") VALUES "
                    + "('11111111-1111-4111-8111-111111111111', 'existing@example.com')");
            statement.execute("INSERT INTO \"Incident\" (\"id\", \"userId\", \"title\") VALUES "
                    + "('22222222-2222-4222-8222-222222222222', "
                    + "'11111111-1111-4111-8111-111111111111', 'Existing incident')");
        }

        flyway("4").migrate();

        assertEquals(1, count("SELECT count(*) FROM \"Incident\" WHERE \"title\" = 'Existing incident'"));
        assertEquals(50, count("SELECT count(*) FROM \"Incident\" WHERE \"userId\" = "
                + "'c861dc90-71ea-44f6-9f39-68c194ef9100'"));
        assertEquals(1, count("SELECT count(*) FROM \"User\" WHERE \"id\" = "
                + "'c861dc90-71ea-44f6-9f39-68c194ef9100' AND NOT \"active\" "
                + "AND \"email\" IS NULL AND \"passwordHash\" IS NULL"));
        assertEquals(50, count("SELECT count(*) FROM \"Incident\" i "
                + "JOIN \"IncidentAssetAssociation\" x ON x.\"incidentId\" = i.\"id\" "
                + "JOIN \"UrbanAsset\" a ON a.\"id\" = x.\"urbanAssetId\" "
                + "WHERE i.\"userId\" = 'c861dc90-71ea-44f6-9f39-68c194ef9100' "
                + "AND x.\"associationType\" = 'EXPLICIT' AND ST_SRID(i.\"location\") = 4326 "
                + "AND GeometryType(i.\"location\") = 'POINT' "
                + "AND ST_Intersects(ST_Force2D(a.\"location\"), i.\"location\") "
                + "AND ((a.\"type\" = 'TRAFFIC_LIGHT' AND i.\"category\" = 'TRAFFIC') "
                + "OR (a.\"type\" = 'WASTE_CONTAINER' AND i.\"category\" = 'WASTE') "
                + "OR (a.\"type\" IN ('FOUNTAIN', 'TRANSIT_STOP') AND i.\"category\" = 'STREET_FURNITURE') "
                + "OR (a.\"type\" = 'GREEN_AREA' AND i.\"category\" = 'GREEN_AREAS'))"));
    }

    @Test
    void rejectsMissingAssetsWithoutLeavingPartialData() throws SQLException {
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("DELETE FROM \"UrbanAsset\" WHERE \"id\" = '05b7e0ee-10eb-42fc-8f11-a5f370bbee4c'");
        }
        assertThrows(FlywayException.class, () -> flyway("4").migrate());
        assertEquals(0, count("SELECT count(*) FROM \"User\" WHERE \"id\" = "
                + "'c861dc90-71ea-44f6-9f39-68c194ef9100'"));
        assertEquals(0, count("SELECT count(*) FROM \"IncidentAssetAssociation\""));
    }

    private Flyway flyway(String target) {
        return Flyway.configure().dataSource(databaseUrl, postgres.getUsername(), postgres.getPassword())
                .target(target).load();
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(databaseUrl, postgres.getUsername(), postgres.getPassword());
    }

    private int count(String sql) throws SQLException {
        try (Connection connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery(sql)) {
            rows.next();
            return rows.getInt(1);
        }
    }
}
