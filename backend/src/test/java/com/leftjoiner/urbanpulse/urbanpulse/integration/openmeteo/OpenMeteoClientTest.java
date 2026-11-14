package com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class OpenMeteoClientTest {
    private static final Instant REGISTERED_AT = Instant.parse("2026-11-14T14:32:00Z");
    private static final long HOUR = Instant.parse("2026-11-14T14:00:00Z").getEpochSecond();
    private HttpServer server;
    private final AtomicReference<String> weatherQuery = new AtomicReference<>();
    private final AtomicReference<String> airQuery = new AtomicReference<>();
    private volatile String weatherBody;
    private volatile String airBody;
    private volatile int weatherStatus;
    private volatile int airStatus;

    @BeforeEach
    void startServer() throws IOException {
        weatherBody = weatherResponse("0.8");
        airBody = airResponse("12.5", "21.0", "8.4");
        weatherStatus = 200;
        airStatus = 200;
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/weather", exchange -> {
            weatherQuery.set(exchange.getRequestURI().getRawQuery());
            respond(exchange, weatherStatus, weatherBody);
        });
        server.createContext("/air", exchange -> {
            airQuery.set(exchange.getRequestURI().getRawQuery());
            respond(exchange, airStatus, airBody);
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void readsWeatherAndAirAtTheIncidentsUtcHour() {
        OpenMeteoClient client = client();

        List<AtmosphericReading> rain = client.fetchPrecipitation(36.7213, -4.4214, REGISTERED_AT);
        List<AtmosphericReading> air = client.fetchAirQuality(36.7213, -4.4214, REGISTERED_AT);

        assertEquals(1, rain.size());
        assertEquals("precipitation", rain.get(0).variable());
        assertEquals(new BigDecimal("0.8"), rain.get(0).value());
        assertEquals("mm", rain.get(0).unit());
        assertEquals(Instant.parse("2026-11-14T14:00:00Z"), rain.get(0).validAt());
        assertEquals(36.72, rain.get(0).gridLatitude());
        assertEquals(-4.42, rain.get(0).gridLongitude());
        assertEquals(List.of("pm2_5", "pm10", "nitrogen_dioxide"),
                air.stream().map(AtmosphericReading::variable).toList());
        assertEquals(new BigDecimal("12.5"), air.get(0).value());
        assertEquals("μg/m³", air.get(0).unit());
        assertTrue(air.get(0).source().contains("CAMS"));
        assertTrue(weatherQuery.get().contains("hourly=precipitation"));
        assertTrue(weatherQuery.get().contains("start_date=2026-11-14"));
        assertTrue(airQuery.get().contains("hourly=pm2_5,pm10,nitrogen_dioxide"));
        assertTrue(airQuery.get().contains("domains=cams_europe"));
    }

    @Test
    void returnsOnlyAvailableVariablesAndNoResultForMissingHour() {
        airBody = airResponse("null", "21.0", "null");
        weatherBody = weatherResponse("0.8").replace(Long.toString(HOUR), Long.toString(HOUR - 3600));

        assertTrue(client().fetchPrecipitation(36.7213, -4.4214, REGISTERED_AT).isEmpty());
        List<AtmosphericReading> air = client().fetchAirQuality(36.7213, -4.4214, REGISTERED_AT);
        assertEquals(1, air.size());
        assertEquals("pm10", air.get(0).variable());
    }

    @Test
    void reportsHttpAndMalformedResponses() {
        weatherStatus = 429;
        assertTrue(assertThrows(OpenMeteoException.class,
                () -> client().fetchPrecipitation(36.7213, -4.4214, REGISTERED_AT)).getMessage().contains("429"));

        airBody = "{";
        assertThrows(OpenMeteoException.class,
                () -> client().fetchAirQuality(36.7213, -4.4214, REGISTERED_AT));
        airBody = "{\"latitude\":36.72,\"longitude\":-4.42,\"hourly\":{}}";
        assertThrows(OpenMeteoException.class,
                () -> client().fetchAirQuality(36.7213, -4.4214, REGISTERED_AT));
    }

    private OpenMeteoClient client() {
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        return new OpenMeteoClient(HttpClient.newHttpClient(), JsonMapper.builder().build(),
                URI.create(base + "/weather"), URI.create(base + "/air"), Duration.ofSeconds(2));
    }

    private static String weatherResponse(String rain) {
        return """
                {"latitude":36.72,"longitude":-4.42,"hourly_units":{"precipitation":"mm"},
                 "hourly":{"time":[%d],"precipitation":[%s]}}
                """.formatted(HOUR, rain);
    }

    private static String airResponse(String pm25, String pm10, String no2) {
        return """
                {"latitude":36.72,"longitude":-4.42,
                 "hourly_units":{"pm2_5":"μg/m³","pm10":"μg/m³","nitrogen_dioxide":"μg/m³"},
                 "hourly":{"time":[%d],"pm2_5":[%s],"pm10":[%s],"nitrogen_dioxide":[%s]}}
                """.formatted(HOUR, pm25, pm10, no2);
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
