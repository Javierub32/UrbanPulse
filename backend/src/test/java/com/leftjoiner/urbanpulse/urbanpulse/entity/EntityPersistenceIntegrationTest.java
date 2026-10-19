package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AssociationType;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Testcontainers
@SpringBootTest(properties = "spring.docker.compose.enabled=false")
class EntityPersistenceIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:17-3.5")
                    .asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void persistsBothKindsOfIncidentAssociation() {
        User user = new User();
        user.setRole(UserRole.CITIZEN);
        entityManager.persist(user);

        KnowledgeDocument document = new KnowledgeDocument();
        document.setMetadata(Map.of("source", "test"));
        entityManager.persist(document);

        UrbanAsset asset = new UrbanAsset();
        entityManager.persist(asset);

        Incident incident = new Incident();
        incident.setUser(user);
        incident.setStatus(IncidentStatus.REPORTED);
        incident.setLocation(new GeometryFactory().createPoint(new Coordinate(-3.7, 40.4)));
        incident.getKnowledgeDocuments().add(document);
        entityManager.persist(incident);

        IncidentAssetAssociation association = new IncidentAssetAssociation();
        association.setIncident(incident);
        association.setUrbanAsset(asset);
        association.setConfidence(new BigDecimal("0.8"));
        association.setAssociationType(AssociationType.EXPLICIT);
        entityManager.persist(association);

        UUID incidentId = incident.getId();
        entityManager.flush();
        entityManager.clear();

        Incident saved = entityManager.find(Incident.class, incidentId);
        assertEquals(1, saved.getKnowledgeDocuments().size());
        assertEquals("test", saved.getKnowledgeDocuments().get(0).getMetadata().get("source"));
        assertEquals(-3.7, ((Point) saved.getLocation()).getX());
        assertEquals(1, saved.getAssetAssociations().size());
        assertEquals(new BigDecimal("0.8"),
                saved.getAssetAssociations().get(0).getConfidence());
        assertEquals(AssociationType.EXPLICIT,
                saved.getAssetAssociations().get(0).getAssociationType());
    }
}
