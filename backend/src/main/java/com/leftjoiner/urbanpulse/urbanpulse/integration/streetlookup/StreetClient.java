package com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public class StreetClient {
    private static final String USER_AGENT = "UrbanPulse/1.0 (+https://github.com/Javierub32/UrbanPulse)";

    private final HttpClient httpClient;
    private final JsonMapper jsonMapper;
    private final URI reverseUrl;
    private final Duration requestTimeout;
    private final Duration minimumRequestInterval;
    private final Object requestLock = new Object();
    private long lastRequestStartedAtNanos = Long.MIN_VALUE;

    public StreetClient(HttpClient httpClient, JsonMapper jsonMapper, URI reverseUrl,
            Duration requestTimeout, Duration minimumRequestInterval) {
        this.httpClient = Objects.requireNonNull(httpClient);
        this.jsonMapper = Objects.requireNonNull(jsonMapper);
        this.reverseUrl = Objects.requireNonNull(reverseUrl);
        this.requestTimeout = requirePositive(requestTimeout, "El timeout de Nominatim debe ser positivo.");
        if (minimumRequestInterval == null || minimumRequestInterval.isNegative()) {
            throw new IllegalArgumentException("El intervalo mínimo entre consultas no puede ser negativo.");
        }
        this.minimumRequestInterval = minimumRequestInterval;
    }

    //Obtiene la calle relacionada con las coordenadas
    public Optional<String> findStreet(double latitude, double longitude) {
        validateCoordinates(latitude, longitude);
        synchronized (requestLock) {
            waitForRequestSlot();
            lastRequestStartedAtNanos = System.nanoTime();
        }
        return requestStreet(latitude, longitude);
    }

    //Crea y envía la petición, recibe la calle correspondiente
    private Optional<String> requestStreet(double latitude, double longitude) {
        URI uri = UriComponentsBuilder.fromUri(reverseUrl)
                .queryParam("format", "jsonv2")
                .queryParam("addressdetails", 1)
                .queryParam("zoom", 18)
                .queryParam("layer", "address")
                .queryParam("lat", latitude)
                .queryParam("lon", longitude)
                .build().encode().toUri();
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(requestTimeout)
                .header("Accept", "application/json")
                .header("User-Agent", USER_AGENT)
                .GET()
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new StreetLookupUnavailableException("La consulta de geocodificación se interrumpió.", exception);
        } catch (IOException exception) {
            throw new StreetLookupUnavailableException("No se pudo consultar el servicio de geocodificación.", exception);
        }

        if (response.statusCode() == 404) return Optional.empty();
        if (response.statusCode() != 200) {
            throw new StreetLookupUnavailableException(
                    "El servicio de geocodificación respondió con HTTP " + response.statusCode() + ".");
        }
        return parseStreet(response.body());
    }

    //Transforma los datos recibidos a la dirección correcta
    private Optional<String> parseStreet(String body) {
        JsonNode root;
        try {
            root = jsonMapper.readTree(body);
        } catch (Exception exception) {
            throw new StreetLookupUnavailableException("La respuesta de geocodificación no es JSON válido.", exception);
        }
        if (root == null || !root.isObject()) {
            throw new StreetLookupUnavailableException("La respuesta de geocodificación no tiene el formato esperado.");
        }

        JsonNode address = root.path("address");
        String road = firstNonBlank(address, "road", "pedestrian", "footway", "path", "residential");
        if (road == null) return Optional.empty();
        //En el caso de que tenga número lo concatena
        String houseNumber = textOrNull(address.path("house_number"));
        return Optional.of(houseNumber == null ? road : road + " " + houseNumber);
    }

    //Debido a las limitaciones de peticiones, comprobamos el tiempo de petición
    private void waitForRequestSlot() {
        if (lastRequestStartedAtNanos == Long.MIN_VALUE || minimumRequestInterval.isZero()) return;
        long intervalNanos = minimumRequestInterval.toNanos();
        long waitNanos = lastRequestStartedAtNanos + intervalNanos - System.nanoTime();
        if (waitNanos <= 0) return;
        try {
            TimeUnit.NANOSECONDS.sleep(waitNanos);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new StreetLookupUnavailableException("La consulta de geocodificación se interrumpió.", exception);
        }
    }

    //Recorre la lista y devuelve el primero con valores, si no, devuelve null
    private static String firstNonBlank(JsonNode address, String... fields) {
        for (String field : fields) {
            String value = textOrNull(address.path(field));
            if (value != null) return value;
        }
        return null;
    }

    //Devuelve el valor encontrado o null
    private static String textOrNull(JsonNode node) {
        if (node == null || !node.isTextual()) return null;
        String value = node.asString().strip();
        return value.isBlank() ? null : value;
    }

    //Se validan si las coordenadas son correctas para usarlas
    private static void validateCoordinates(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Las coordenadas deben estar dentro de los límites geográficos.");
        }
    }

    //Se usa para validar el tiemout y que sea positivo
    private static Duration requirePositive(Duration duration, String message) {
        if (duration == null || duration.isZero() || duration.isNegative()) throw new IllegalArgumentException(message);
        return duration;
    }

}
