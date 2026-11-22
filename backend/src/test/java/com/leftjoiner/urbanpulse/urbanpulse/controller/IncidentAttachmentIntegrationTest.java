package com.leftjoiner.urbanpulse.urbanpulse.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.exception.AttachmentException;
import com.leftjoiner.urbanpulse.urbanpulse.repository.AttachmentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import com.leftjoiner.urbanpulse.urbanpulse.security.JwtService;
import com.leftjoiner.urbanpulse.urbanpulse.service.AttachmentStorage;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "spring.docker.compose.enabled=false")
@AutoConfigureMockMvc
class IncidentAttachmentIntegrationTest {
    private static final String ATTACHMENTS = "/api/incidents/{incidentId}/attachments";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private AttachmentRepository attachments;
    @Autowired private JwtService jwt;
    @Autowired private JdbcTemplate jdbc;
    @LocalServerPort private int port;
    @MockitoBean private AttachmentStorage storage;

    private final ConcurrentHashMap<String, byte[]> objects = new ConcurrentHashMap<>();

    @BeforeEach
    void useInMemoryObjectStorage() {
        doAnswer(call -> {
            InputStream input = call.getArgument(1);
            objects.put(call.getArgument(0), input.readAllBytes());
            return null;
        }).when(storage).put(anyString(), any(InputStream.class), anyLong(), anyString());
        when(storage.open(anyString())).thenAnswer(call -> new ByteArrayInputStream(objects.get(call.getArgument(0))));
        doAnswer(call -> {
            objects.remove(call.getArgument(0));
            return null;
        }).when(storage).remove(anyString());
    }

    @Test
    void ownerCanUploadAndDownloadWithAnInternalRelativeKey() throws Exception {
        UserEntity owner = user(UserRole.CITIZEN);
        UUID incident = incident(owner);
        var file = photo();
        var response = mvc.perform(multipart(ATTACHMENTS, incident).file(file)
                        .header("Authorization", token(owner)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.type").value("PHOTO"))
                .andExpect(jsonPath("$.name").value("foto.png")).andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.url").doesNotExist()).andReturn().getResponse();
        UUID attachment = UUID.fromString(JsonMapper.builder().build().readTree(response.getContentAsString())
                .path("id").asString());
        String key = "incidents/photos/" + incident + "/" + attachment + ".png";
        assertEquals(key, attachments.findById(attachment).orElseThrow().getUrl());
        assertEquals("http://localhost/api/incidents/" + incident + "/attachments/" + attachment,
                response.getHeader("Location"));

        mvc.perform(get(ATTACHMENTS, incident).header("Authorization", token(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(attachment.toString()));
        mvc.perform(get(ATTACHMENTS + "/{attachmentId}", incident, attachment).header("Authorization", token(owner)))
                .andExpect(status().isOk()).andExpect(content().contentType("image/png"))
                .andExpect(header().string("Cache-Control", "no-store")).andExpect(content().bytes(file.getBytes()));
        mvc.perform(get(ATTACHMENTS + "/{attachmentId}", incident(owner), attachment)
                        .header("Authorization", token(owner)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ATTACHMENT_NOT_FOUND"));
    }

    @Test
    void unauthorizedRequestsCannotUploadListOrDownload() throws Exception {
        UserEntity owner = user(UserRole.CITIZEN);
        UserEntity stranger = user(UserRole.CITIZEN);
        UserEntity operator = user(UserRole.OPERATOR);
        UserEntity technician = user(UserRole.TECHNICIAN);
        UserEntity analyst = user(UserRole.ANALYST);
        UUID incident = incident(owner);
        UUID attachment = UUID.randomUUID();
        mvc.perform(multipart(ATTACHMENTS, incident).file(photo())).andExpect(status().isUnauthorized());
        mvc.perform(multipart(ATTACHMENTS, incident).file(photo()).header("Authorization", token(stranger)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("INCIDENT_NOT_FOUND"));
        mvc.perform(multipart(ATTACHMENTS, incident).file(photo()).header("Authorization", token(operator)))
                .andExpect(status().isForbidden());
        mvc.perform(get(ATTACHMENTS, incident).header("Authorization", token(operator))).andExpect(status().isOk());
        mvc.perform(get(ATTACHMENTS, incident).header("Authorization", token(technician))).andExpect(status().isNotFound());
        jdbc.update("""
                INSERT INTO "Assignment" ("incidentId", "technicianId") VALUES (?, ?)
                """, incident, technician.getId());
        mvc.perform(get(ATTACHMENTS, incident).header("Authorization", token(technician))).andExpect(status().isOk());
        mvc.perform(get(ATTACHMENTS, incident).header("Authorization", token(analyst))).andExpect(status().isForbidden());
        mvc.perform(get(ATTACHMENTS + "/{attachmentId}", incident, attachment).header("Authorization", token(stranger)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("INCIDENT_NOT_FOUND"));
        assertTrue(objects.isEmpty());
    }

    @Test
    void invalidFilesCreateNoMetadataAndFailedUploadsAreRolledBack() throws Exception {
        UserEntity owner = user(UserRole.CITIZEN);
        UUID incident = incident(owner);
        var pdf = new MockMultipartFile("file", "foto.png", "image/png", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII));
        mvc.perform(multipart(ATTACHMENTS, incident).file(pdf).header("Authorization", token(owner)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("file"))
                .andExpect(jsonPath("$.code").value("INVALID_ATTACHMENT"));
        mvc.perform(multipart(ATTACHMENTS, incident).header("Authorization", token(owner)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_ATTACHMENT"));
        mvc.perform(post(ATTACHMENTS, incident).header("Authorization", token(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("ATTACHMENT_MULTIPART_REQUIRED"));

        doAnswer(call -> {
            InputStream input = call.getArgument(1);
            objects.put(call.getArgument(0), input.readAllBytes());
            throw AttachmentException.unavailable(new IOException("Connection closed before acknowledgement"));
        }).when(storage).put(anyString(), any(InputStream.class), anyLong(), anyString());

        mvc.perform(multipart(ATTACHMENTS, incident).file(photo()).header("Authorization", token(owner)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("ATTACHMENT_STORAGE_UNAVAILABLE"));
        assertTrue(objects.isEmpty());
        mvc.perform(get(ATTACHMENTS, incident).header("Authorization", token(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void servletRejectsMultipartFileLargerThanTenMegabytes() throws Exception {
        UserEntity owner = user(UserRole.CITIZEN);
        UUID incident = incident(owner);
        String boundary = "urbanpulse-test-boundary";
        var body = HttpRequest.BodyPublishers.concat(
                HttpRequest.BodyPublishers.ofString("--" + boundary + "\r\n"
                        + "Content-Disposition: form-data; name=\"file\"; filename=\"large.png\"\r\n"
                        + "Content-Type: image/png\r\n\r\n"),
                HttpRequest.BodyPublishers.ofByteArray(new byte[10_485_761]),
                HttpRequest.BodyPublishers.ofString("\r\n--" + boundary + "--\r\n"));
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ATTACHMENTS.replace("{incidentId}", incident.toString())))
                .header("Authorization", token(owner))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .timeout(Duration.ofSeconds(15)).POST(body).build();
        var response = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build()
                .send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(413, response.statusCode(), response.body());
        assertEquals("ATTACHMENT_TOO_LARGE", JsonMapper.builder().build()
                .readTree(response.body()).path("code").asString());
        assertTrue(objects.isEmpty());
    }

    @Test
    void concurrentUploadsCannotExceedFiveAttachments() throws Exception {
        UserEntity owner = user(UserRole.CITIZEN);
        UUID incident = incident(owner);
        String authorization = token(owner);
        for (int i = 0; i < 4; i++) {
            mvc.perform(multipart(ATTACHMENTS, incident).file(photo()).header("Authorization", authorization))
                    .andExpect(status().isCreated());
        }
        var ready = new CountDownLatch(2);
        var executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> upload = () -> {
                ready.countDown();
                if (!ready.await(5, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Concurrent requests did not start");
                }
                return mvc.perform(multipart(ATTACHMENTS, incident).file(photo()).header("Authorization", authorization))
                        .andReturn().getResponse().getStatus();
            };
            var first = executor.submit(upload);
            var second = executor.submit(upload);
            var statuses = List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)).stream()
                    .sorted().toList();
            assertEquals(List.of(201, 409), statuses);
        } finally {
            executor.shutdownNow();
        }
        assertEquals(5, objects.size());
        mvc.perform(get(ATTACHMENTS, incident).header("Authorization", authorization))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5));
    }

    private UserEntity user(UserRole role) {
        var user = new UserEntity();
        user.setActive(true);
        user.setRole(role);
        return users.saveAndFlush(user);
    }

    private UUID incident(UserEntity owner) {
        UUID incident = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO "Incident" ("id", "userId", "title", "category", "status", "location")
                VALUES (?, ?, 'Adjunto de prueba', 'PUBLIC_ROAD', 'REPORTED', ST_SetSRID(ST_MakePoint(10, 10), 4326))
                """, incident, owner.getId());
        return incident;
    }

    private String token(UserEntity user) {
        return "Bearer " + jwt.issue(user.getId(), user.getRole());
    }

    private MockMultipartFile photo() throws IOException {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        return new MockMultipartFile("file", "foto.png", "application/octet-stream", bytes.toByteArray());
    }
}
