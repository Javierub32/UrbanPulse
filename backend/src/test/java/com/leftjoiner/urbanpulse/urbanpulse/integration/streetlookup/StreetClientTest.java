package com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class StreetClientTest {
    private HttpServer server;
    private final AtomicInteger requestCount = new AtomicInteger();
    private final AtomicReference<String> requestQuery = new AtomicReference<>();
    private final AtomicReference<String> requestUserAgent = new AtomicReference<>();
    private volatile int responseStatus;
    private volatile String responseBody;

    @BeforeEach
    void startServer() throws IOException {
        responseStatus = 200;
        responseBody = "{\"address\":{\"road\":\"Calle Larios\",\"house_number\":\"12\"}}";
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/reverse", exchange -> {
            requestCount.incrementAndGet();
            requestQuery.set(exchange.getRequestURI().getRawQuery());
            requestUserAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            respond(exchange, responseStatus, responseBody);
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void returnsTheStreetAndIdentifiesTheApplicationToNominatim() {
        Optional<String> street = client().findStreet(36.7213, -4.4214);

        assertEquals(Optional.of("Calle Larios 12"), street);
        assertTrue(requestQuery.get().contains("format=jsonv2"));
        assertTrue(requestQuery.get().contains("addressdetails=1"));
        assertTrue(requestQuery.get().contains("lat=36.7213"));
        assertTrue(requestQuery.get().contains("lon=-4.4214"));
        assertTrue(requestUserAgent.get().startsWith("UrbanPulse/"));
    }

    @Test
    void looksUpMissingStreetAgainInsteadOfCachingIt() {
        responseBody = "{\"address\":{\"city\":\"Málaga\"}}";
        StreetClient client = client();

        assertEquals(Optional.empty(), client.findStreet(36.7213, -4.4214));
        assertEquals(Optional.empty(), client.findStreet(36.7213, -4.4214));
        assertEquals(2, requestCount.get());
    }

    @Test
    void performsANewLookupForRepeatedCoordinates() {
        StreetClient client = client();

        assertEquals(Optional.of("Calle Larios 12"), client.findStreet(36.721300, -4.421400));
        assertEquals(Optional.of("Calle Larios 12"), client.findStreet(36.721300, -4.421400));
        assertEquals(2, requestCount.get());
    }

    @Test
    void treatsAnUncoveredCoordinateAsNoStreet() {
        responseStatus = 404;

        assertEquals(Optional.empty(), client().findStreet(36.7213, -4.4214));
    }

    @Test
    void reportsProviderAndMalformedResponseFailures() {
        responseStatus = 429;
        assertThrows(StreetLookupUnavailableException.class,
                () -> client().findStreet(36.7213, -4.4214));

        responseStatus = 200;
        responseBody = "{";
        assertThrows(StreetLookupUnavailableException.class,
                () -> client().findStreet(36.7213, -4.4214));
    }

    @Test
    void rejectsCoordinatesOutsideTheGeographicRange() {
        assertThrows(IllegalArgumentException.class, () -> client().findStreet(91, -4.42));
        assertEquals(0, requestCount.get());
    }

    private StreetClient client() {
        return new StreetClient(HttpClient.newHttpClient(), JsonMapper.builder().build(),
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/reverse"),
                Duration.ofSeconds(2), Duration.ZERO);
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
