package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "\"StatusChange\"")
@Getter
@Setter
@NoArgsConstructor
public class StatusChange {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"incidentId\"", referencedColumnName = "\"id\"", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"assignmentId\"", referencedColumnName = "\"id\"", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"userId\"", referencedColumnName = "\"id\"", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"previousStatus\"", columnDefinition = "\"IncidentStatus\"")
    private IncidentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"status\"", columnDefinition = "\"IncidentStatus\"")
    private IncidentStatus status;

    @Column(name = "\"changedAt\"")
    private LocalDateTime changedAt;

    @Column(name = "\"reason\"")
    private String reason;

    @Column(name = "\"comment\"", columnDefinition = "text")
    private String comment;
}
