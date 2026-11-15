package com.leftjoiner.urbanpulse.urbanpulse.integration.streetlookup;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class StreetLookupConfig {
    @Bean
    public StreetClient streetClient(
            @Value("${urbanpulse.street-lookup.nominatim-url}") URI reverseUrl,
            @Value("${urbanpulse.street-lookup.connect-timeout-ms}") long connectTimeoutMs,
            @Value("${urbanpulse.street-lookup.request-timeout-ms}") long requestTimeoutMs,
            @Value("${urbanpulse.street-lookup.minimum-request-interval-ms}") long minimumRequestIntervalMs,
            JsonMapper jsonMapper) {
        if (minimumRequestIntervalMs < 1_000) {
            throw new IllegalStateException("Nominatim requiere al menos un segundo entre consultas.");
        }
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        return new StreetClient(httpClient, jsonMapper, reverseUrl,
                Duration.ofMillis(requestTimeoutMs), Duration.ofMillis(minimumRequestIntervalMs));
    }
}
