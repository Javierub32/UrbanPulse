package com.leftjoiner.urbanpulse.urbanpulse.config;

import io.minio.MinioClient;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AttachmentStorageConfig.Settings.class)
public class AttachmentStorageConfig {
    @Bean
    MinioClient minioClient(Settings settings) {
        MinioClient client = MinioClient.builder().endpoint(settings.endpoint())
                .credentials(settings.accessKey(), settings.secretKey()).build();
        client.setTimeout(2_000, 10_000, 10_000);
        return client;
    }

    @ConfigurationProperties("urbanpulse.storage")
    public record Settings(String endpoint, String accessKey, String secretKey, String bucket) {}
}
