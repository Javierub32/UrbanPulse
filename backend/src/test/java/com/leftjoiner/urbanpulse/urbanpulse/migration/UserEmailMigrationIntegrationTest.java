package com.leftjoiner.urbanpulse.urbanpulse.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
class UserEmailMigrationIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5")
                    .asCompatibleSubstituteFor("postgres"));

    private String databaseUrl;
    private Flyway flyway;

    @BeforeEach
    void prepareIsolatedDatabaseAtVersionOne() throws SQLException {
        String database = "email_migration_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection connection = DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE " + database);
        }
        databaseUrl = "jdbc:postgresql://" + postgres.getHost() + ":"
                + postgres.getMappedPort(5432) + "/" + database;

        Flyway.configure().dataSource(databaseUrl, postgres.getUsername(), postgres.getPassword())
                .target("1").load().migrate();
        flyway = Flyway.configure()
                .dataSource(databaseUrl, postgres.getUsername(), postgres.getPassword()).load();
    }

    @Test
    void upgradesPopulatedV1WithoutChangingEmailOrHash() throws SQLException {
        insertUser("Citizen@Example.com");

        flyway.migrate();

        assertEquals("2", flyway.info().current().getVersion().getVersion());
        try (Connection connection = connection();
             var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT \"email\", \"passwordHash\" FROM \"User\"")) {
            assertTrue(rows.next());
            assertEquals("Citizen@Example.com", rows.getString("email"));
            assertEquals("stored-hash", rows.getString("passwordHash"));
        }

        SQLException exception = assertThrows(SQLException.class,
                () -> insertUser("citizen@example.com"));
        assertEquals("23505", exception.getSQLState());
    }

    @ParameterizedTest
    @ValueSource(strings = {"citizen@example.com", "CITIZEN@EXAMPLE.COM"})
    void refusesExistingDuplicatesWithoutDeletingData(String secondEmail) throws SQLException {
        insertUser("citizen@example.com");
        insertUser(secondEmail);

        FlywayException exception = assertThrows(FlywayException.class, () -> flyway.migrate());

        assertTrue(exception.getMessage().contains("uq_User_email_ignore_case"));
        assertEquals("1", flyway.info().current().getVersion().getVersion());
        try (Connection connection = connection();
             var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT count(*) FROM \"User\"")) {
            assertTrue(rows.next());
            assertEquals(2, rows.getInt(1));
        }
    }

    private void insertUser(String email) throws SQLException {
        try (Connection connection = connection();
             var statement = connection.prepareStatement(
                     "INSERT INTO \"User\" (\"email\", \"passwordHash\") VALUES (?, ?)")) {
            statement.setString(1, email);
            statement.setString(2, "stored-hash");
            statement.executeUpdate();
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(databaseUrl, postgres.getUsername(), postgres.getPassword());
    }
}
