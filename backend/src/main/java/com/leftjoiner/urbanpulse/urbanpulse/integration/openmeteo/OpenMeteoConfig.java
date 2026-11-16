package com.leftjoiner.urbanpulse.urbanpulse.integration.openmeteo;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class OpenMeteoConfig { 
    @Bean
    public OpenMeteoClient openMeteoClient(
            @Value("${urbanpulse.open-meteo.weather-url}") URI weatherUrl,
            @Value("${urbanpulse.open-meteo.air-quality-url}") URI airQualityUrl,
            @Value("${urbanpulse.open-meteo.connect-timeout-ms}") long connectTimeoutMs,
            @Value("${urbanpulse.open-meteo.request-timeout-ms}") long requestTimeoutMs,
            JsonMapper jsonMapper) {
        //Conexión con Open-Meteo
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
        return new OpenMeteoClient(httpClient, jsonMapper, weatherUrl, airQualityUrl,
                Duration.ofMillis(requestTimeoutMs));
    }
}
