package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AssignmentStatus;
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

@Entity
@Table(name = "\"Assignment\"")
@Getter
@Setter
@NoArgsConstructor
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"incidentId\"", referencedColumnName = "\"id\"", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"technicianId\"", referencedColumnName = "\"id\"", nullable = false)
    private User technician;

    @Column(name = "\"department\"")
    private String department;

    @Column(name = "\"team\"")
    private String team;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"status\"", columnDefinition = "\"AssignmentStatus\"")
    private AssignmentStatus status;

    @Column(name = "\"assignedAt\"")
    private LocalDateTime assignedAt;

    @Column(name = "\"startedAt\"")
    private LocalDateTime startedAt;

    @Column(name = "\"finishedAt\"")
    private LocalDateTime finishedAt;

    @OneToMany(mappedBy = "assignment")
    private List<StatusChange> statusChanges = new ArrayList<>();
}
