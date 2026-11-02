package com.leftjoiner.urbanpulse.urbanpulse.entity;

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

@Entity
@Table(name = "\"KnowledgeDocument\"")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeDocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "\"title\"")
    private String title;

    @Column(name = "\"type\"")
    private String type;

    @Column(name = "\"version\"")
    private String version;

    @Column(name = "\"content\"", columnDefinition = "text")
    private String content;

    @Column(name = "\"url\"")
    private String url;

    @Column(name = "\"source\"")
    private String source;

    @Column(name = "\"createdAt\"")
    private LocalDateTime createdAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"metadata\"", columnDefinition = "json")
    private Map<String, Object> metadata;

    @ManyToMany(mappedBy = "knowledgeDocuments")
    private List<IncidentEntity> incidents = new ArrayList<>();
}
