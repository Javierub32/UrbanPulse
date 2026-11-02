package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.Priority;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Geometry;

@Entity
@Table(name = "\"Incident\"")
@Getter
@Setter
@NoArgsConstructor
public class IncidentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"userId\"", referencedColumnName = "\"id\"", nullable = false)
    private UserEntity user;

    @Column(name = "\"title\"")
    private String title;

    @Column(name = "\"description\"", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"category\"", columnDefinition = "\"IncidentCategory\"")
    private IncidentCategory category;

    @Column(name = "\"location\"", columnDefinition = "geometry")
    private Geometry location;

    @Column(name = "\"normalizedAddress\"")
    private String normalizedAddress;

    @Column(name = "\"neighborhood\"")
    private String neighborhood;

    @Column(name = "\"district\"")
    private String district;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"priority\"", columnDefinition = "\"Priority\"")
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"status\"", columnDefinition = "\"IncidentStatus\"")
    private IncidentStatus status;

    @Column(name = "\"registeredAt\"")
    private LocalDateTime registeredAt;

    @Column(name = "\"updatedAt\"")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "incident")
    private List<AttachmentEntity> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "incident")
    private List<IncidentAssetAssociationEntity> assetAssociations = new ArrayList<>();

    @OneToMany(mappedBy = "incident")
    private List<UrbanContextEntity> urbanContexts = new ArrayList<>();

    @OneToMany(mappedBy = "incident")
    private List<AssignmentEntity> assignments = new ArrayList<>();

    @OneToMany(mappedBy = "incident")
    private List<StatusChangeEntity> statusChanges = new ArrayList<>();

    @OneToMany(mappedBy = "incident")
    private List<NotificationEntity> notifications = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "\"IncidentKnowledgeDocument\"",
            joinColumns = @JoinColumn(name = "\"incidentId\"", referencedColumnName = "\"id\""),
            inverseJoinColumns = @JoinColumn(name = "\"knowledgeDocumentId\"", referencedColumnName = "\"id\""))
    private List<KnowledgeDocumentEntity> knowledgeDocuments = new ArrayList<>();
}
