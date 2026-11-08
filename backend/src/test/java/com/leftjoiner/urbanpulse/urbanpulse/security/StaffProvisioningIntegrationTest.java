package com.leftjoiner.urbanpulse.urbanpulse.security;

import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class StaffProvisioningIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"));

    @BeforeAll
    static void setup() {
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration").load().migrate();
        postgres.copyFileToContainer(MountableFile.forHostPath("scripts/habilitar-personal.sql"), "/tmp/habilitar-personal.sql");
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERATOR", "TECHNICIAN", "ADMINISTRATOR", "ANALYST", "CITIZEN"})
    void changesOnlyTheExplicitAccountToAValidRole(String role) throws Exception {
        UUID id = account(true);
        UUID other = account(true);
        assertEquals(0, run(id, role, "responsable de pruebas").getExitCode());
        assertEquals(role, role(id));
        assertEquals("CITIZEN", role(other));
    }

    @Test
    void rejectsInvalidRolesWithoutModifyingTheAccount() throws Exception {
        UUID id = account(true);
        assertNotEquals(0, run(id, "SUPERADMIN", "responsable").getExitCode());
        assertEquals("CITIZEN", role(id));
    }

    @Test
    void requiresAnExistingActiveAccountAndAnIdentifiedOperator() throws Exception {
        UUID inactive = account(false);
        assertNotEquals(0, run(inactive, "OPERATOR", "responsable").getExitCode());
        assertEquals("CITIZEN", role(inactive));
        assertNotEquals(0, run(UUID.randomUUID(), "OPERATOR", "responsable").getExitCode());
        UUID active = account(true);
        assertNotEquals(0, run(active, "OPERATOR", " ").getExitCode());
        assertEquals("CITIZEN", role(active));
    }

    @Test
    void worksWithReadAccessAndUpdatePermissionLimitedToTheRoleColumn() throws Exception {
        UUID id = account(true);
        String operator = "staff_provisioner";
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE ROLE " + operator + " LOGIN");
            statement.execute("GRANT USAGE ON SCHEMA public TO " + operator);
            statement.execute("GRANT SELECT ON \"User\" TO " + operator);
            statement.execute("GRANT UPDATE (\"role\") ON \"User\" TO " + operator);
        }
        var result = postgres.execInContainer("psql", "-U", operator, "-d", postgres.getDatabaseName(),
                "-v", "user_id=" + id, "-v", "role=TECHNICIAN", "-v", "actor=responsable de pruebas",
                "-f", "/tmp/habilitar-personal.sql");
        assertEquals(0, result.getExitCode(), result.getStderr());
        assertEquals("TECHNICIAN", role(id));
        assertTrue(result.getStderr().contains("CITIZEN -> TECHNICIAN"));
        var forbidden = postgres.execInContainer("psql", "-U", operator, "-d", postgres.getDatabaseName(),
                "-v", "ON_ERROR_STOP=1", "-c", "UPDATE \"User\" SET \"active\" = false WHERE \"id\" = '" + id + "'");
        assertNotEquals(0, forbidden.getExitCode());
    }

    private org.testcontainers.containers.Container.ExecResult run(UUID id, String role, String actor) throws Exception {
        return postgres.execInContainer("psql", "-U", postgres.getUsername(), "-d", postgres.getDatabaseName(),
                "-v", "user_id=" + id, "-v", "role=" + role, "-v", "actor=" + actor,
                "-f", "/tmp/habilitar-personal.sql");
    }

    private UUID account(boolean active) throws Exception {
        UUID id = UUID.randomUUID();
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.prepareStatement("INSERT INTO \"User\" (\"id\", \"role\", \"active\") VALUES (?, 'CITIZEN', ?)")) {
            statement.setObject(1, id);
            statement.setBoolean(2, active);
            statement.executeUpdate();
        }
        return id;
    }

    private String role(UUID id) throws Exception {
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.prepareStatement("SELECT \"role\" FROM \"User\" WHERE \"id\" = ?")) {
            statement.setObject(1, id);
            try (var result = statement.executeQuery()) { result.next(); return result.getString(1); }
        }
    }
}
