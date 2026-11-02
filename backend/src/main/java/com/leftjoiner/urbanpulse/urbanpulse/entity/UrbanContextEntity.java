package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.ContextType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Geometry;

@Entity
@Table(name = "\"UrbanContext\"")
@Getter
@Setter
@NoArgsConstructor
public class UrbanContextEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"incidentId\"", referencedColumnName = "\"id\"", nullable = false)
    private IncidentEntity incident;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"type\"", columnDefinition = "\"ContextType\"")
    private ContextType type;

    @Column(name = "\"key\"")
    private String key;

    @Column(name = "\"value\"")
    private String value;

    @Column(name = "\"unit\"")
    private String unit;

    @Column(name = "\"geometry\"", columnDefinition = "geometry")
    private Geometry geometry;

    @Column(name = "\"observedAt\"")
    private LocalDateTime observedAt;

    @Column(name = "\"ingestedAt\"")
    private LocalDateTime ingestedAt;

    @Column(name = "\"source\"")
    private String source;

    @Column(name = "\"status\"")
    private String status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"metadata\"", columnDefinition = "json")
    private Map<String, Object> metadata;

    @OneToMany(mappedBy = "urbanContext")
    private List<ExternalObservationEntity> externalObservations = new ArrayList<>();
}
