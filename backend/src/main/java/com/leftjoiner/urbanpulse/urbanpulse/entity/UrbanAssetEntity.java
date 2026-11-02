package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AssetType;
import jakarta.persistence.*;
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
@Table(name = "\"UrbanAsset\"")
@Getter
@Setter
@NoArgsConstructor
public class UrbanAssetEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"type\"", columnDefinition = "\"AssetType\"")
    private AssetType type;

    @Column(name = "\"code\"")
    private String code;

    @Column(name = "\"name\"")
    private String name;

    @Column(name = "\"source\"")
    private String source;

    @Column(name = "\"location\"", columnDefinition = "geometry")
    private Geometry location;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"metadata\"", columnDefinition = "json")
    private Map<String, Object> metadata;

    @OneToMany(mappedBy = "urbanAsset")
    private List<IncidentAssetAssociationEntity> incidentAssociations = new ArrayList<>();
}
