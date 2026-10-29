package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AssociationType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "\"IncidentAssetAssociation\"")
@Getter
@Setter
@NoArgsConstructor
public class IncidentAssetAssociationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"incidentId\"", referencedColumnName = "\"id\"", nullable = false)
    private IncidentEntity incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"urbanAssetId\"", referencedColumnName = "\"id\"", nullable = false)
    private UrbanAssetEntity urbanAsset;

    @Column(name = "\"distance\"")
    private BigDecimal distance;

    @Column(name = "\"confidence\"")
    private BigDecimal confidence;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"associationType\"", columnDefinition = "\"AssociationType\"")
    private AssociationType associationType;
}
