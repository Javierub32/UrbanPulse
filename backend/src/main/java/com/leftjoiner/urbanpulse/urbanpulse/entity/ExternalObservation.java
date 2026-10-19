package com.leftjoiner.urbanpulse.urbanpulse.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Geometry;

@Entity
@Table(name = "\"ExternalObservation\"")
@Getter
@Setter
@NoArgsConstructor
public class ExternalObservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"urbanContextId\"", referencedColumnName = "\"id\"", nullable = false)
    private UrbanContext urbanContext;

    @Column(name = "\"source\"")
    private String source;

    @Column(name = "\"type\"")
    private String type;

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

    @Column(name = "\"quality\"")
    private String quality;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"metadata\"", columnDefinition = "json")
    private Map<String, Object> metadata;
}
