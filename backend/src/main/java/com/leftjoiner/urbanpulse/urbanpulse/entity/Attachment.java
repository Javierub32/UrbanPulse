package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AttachmentType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "\"Attachment\"")
@Getter
@Setter
@NoArgsConstructor
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"incidentId\"", referencedColumnName = "\"id\"", nullable = false)
    private Incident incident;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"type\"", columnDefinition = "\"AttachmentType\"")
    private AttachmentType type;

    @Column(name = "\"url\"")
    private String url;

    @Column(name = "\"name\"")
    private String name;

    @Column(name = "\"size\"")
    private Long size;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"metadata\"", columnDefinition = "json")
    private Map<String, Object> metadata;

    @Column(name = "\"createdAt\"")
    private LocalDateTime createdAt;
}
