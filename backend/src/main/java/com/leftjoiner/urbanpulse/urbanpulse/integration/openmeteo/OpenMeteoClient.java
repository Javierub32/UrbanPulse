package com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public class OpenMeteoClient {
    private static final List<String> AIR_VARIABLES = List.of("pm2_5", "pm10", "nitrogen_dioxide");
    private final HttpClient httpClient;
    private final JsonMapper jsonMapper;
    private final URI weatherUrl;
    private final URI airQualityUrl;
    private final Duration requestTimeout;

    // 
    public OpenMeteoClient(HttpClient httpClient, JsonMapper jsonMapper, URI weatherUrl,
            URI airQualityUrl, Duration requestTimeout) {
        this.httpClient = Objects.requireNonNull(httpClient);
        this.jsonMapper = Objects.requireNonNull(jsonMapper);
        this.weatherUrl = Objects.requireNonNull(weatherUrl);
        this.airQualityUrl = Objects.requireNonNull(airQualityUrl);
        if (requestTimeout == null || requestTimeout.isZero() || requestTimeout.isNegative()) {
            throw new IllegalArgumentException("El tiempo de espera debe ser positivo.");
        }
        this.requestTimeout = requestTimeout;
    }
    //Consulta para las precipitaciones en una posición y en un momento específico.
    public List<AtmosphericReading> fetchPrecipitation(double latitude, double longitude, Instant registeredAt) {
        return fetch(weatherUrl, "precipitation", "", List.of("precipitation"), "Open-Meteo Weather API",
                latitude, longitude, registeredAt);
    }
    //Consulta de la calidad del aires en una posición y en un momento específico.
    public List<AtmosphericReading> fetchAirQuality(double latitude, double longitude, Instant registeredAt) {
        return fetch(airQualityUrl, "pm2_5,pm10,nitrogen_dioxide", "&domains=cams_europe", AIR_VARIABLES,
                "Open-Meteo Air Quality API / CAMS ENSEMBLE", latitude, longitude, registeredAt);
    }
    //
    private List<AtmosphericReading> fetch(URI baseUrl, String hourlyParameter, String extraParameters,
            List<String> variables,
            String source, double latitude, double longitude, Instant registeredAt) {
        validateCoordinates(latitude, longitude);
        //Se trunca la hora para tener solo la hora sin los minutos
        Instant targetHour = Objects.requireNonNull(registeredAt).truncatedTo(ChronoUnit.HOURS);
        LocalDate date = targetHour.atZone(ZoneOffset.UTC).toLocalDate();
        //Se crea la petición
        URI uri = URI.create(baseUrl + (baseUrl.getQuery() == null ? "?" : "&")
                + "latitude=" + latitude + "&longitude=" + longitude
                + "&hourly=" + hourlyParameter + extraParameters + "&start_date=" + date + "&end_date=" + date
                + "&timeformat=unixtime&timezone=GMT");
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(requestTimeout)
                .header("Accept", "application/json").GET().build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            //Consulta interrrumpida
            Thread.currentThread().interrupt();
            throw new OpenMeteoException("Consulta a Open-Meteo interrumpida.", e);
        } catch (IOException e) {
            //COnsulta no obtenida
            throw new OpenMeteoException("No se pudo consultar Open-Meteo.", e);
        }
        if (response.statusCode() != 200) {
            //Caso en el que no devuelva 200
            throw new OpenMeteoException("Open-Meteo respondió con HTTP " + response.statusCode() + ".");
        }
        return parse(response.body(), variables, source, targetHour);
    }

    private List<AtmosphericReading> parse(String body, List<String> variables, String source,
            Instant targetHour) {
        JsonNode root;
        //Se comprueba que los datos sean correctos
        try {
            root = jsonMapper.readTree(body);
        } catch (Exception e) {
            throw new OpenMeteoException("Respuesta JSON de Open-Meteo no válida.", e);
        }
        if (root == null || !root.isObject() || !root.path("latitude").isNumber()
                || !root.path("longitude").isNumber()) {
            throw new OpenMeteoException("Respuesta de Open-Meteo sin coordenadas de la celda.");
        }
        //Establecemos correctamente los valores de latitud y longitud y las validamos
        double gridLatitude = root.path("latitude").asDouble();
        double gridLongitude = root.path("longitude").asDouble();
        try {
            validateCoordinates(gridLatitude, gridLongitude);
        } catch (IllegalArgumentException e) {
            throw new OpenMeteoException("Coordenadas de la celda de Open-Meteo no válidas.", e);
        }
        //Establecemos el valor si está de la hora correspondiente a la incidencia.
        JsonNode hourly = root.path("hourly");
        JsonNode times = hourly.path("time");
        if (!times.isArray()) {
            throw new OpenMeteoException("Respuesta de Open-Meteo sin serie horaria.");
        }
        int index = -1;
        for (int i = 0; i < times.size(); i++) {
            if (!times.get(i).isIntegralNumber()) {
                throw new OpenMeteoException("Hora de Open-Meteo no válida.");
            }
            if (times.get(i).asLong() == targetHour.getEpochSecond()) {
                index = i;
                break;
            }
        }
        if (index < 0) return List.of();
        //Se escogen los valores correspondientes a la hora solicitada
        //Omite los valores null, pero devuelve aquellos que si encuentra.
        JsonNode units = root.path("hourly_units");
        List<AtmosphericReading> readings = new ArrayList<>();
        for (String variable : variables) {
            JsonNode values = hourly.path(variable);
            if (values.isMissingNode()) continue;
            if (!values.isArray() || values.size() != times.size()) {
                throw new OpenMeteoException("Serie horaria de Open-Meteo no válida: " + variable + ".");
            }
            JsonNode value = values.get(index);
            if (value == null || value.isNull()) continue;
            String unit = units.path(variable).asString();
            if (!value.isNumber() || unit == null || unit.isBlank()) {
                throw new OpenMeteoException("Valor o unidad de Open-Meteo no válido: " + variable + ".");
            }
            readings.add(new AtmosphericReading(variable, value.decimalValue(), unit,
                    targetHour, gridLatitude, gridLongitude, source));
        }
        return List.copyOf(readings);
    }

    //Valida que las coordenadas sean correctas.
    private static void validateCoordinates(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Coordenadas no válidas.");
        }
    }
}
