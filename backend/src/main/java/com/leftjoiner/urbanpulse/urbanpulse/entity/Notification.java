package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.NotificationType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "\"Notification\"")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"incidentId\"", referencedColumnName = "\"id\"", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"userId\"", referencedColumnName = "\"id\"", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"type\"", columnDefinition = "\"NotificationType\"")
    private NotificationType type;

    @Column(name = "\"channel\"")
    private String channel;

    @Column(name = "\"message\"", columnDefinition = "text")
    private String message;

    @Column(name = "\"status\"")
    private String status;

    @Column(name = "\"createdAt\"")
    private LocalDateTime createdAt;

    @Column(name = "\"sentAt\"")
    private LocalDateTime sentAt;

    @Column(name = "\"deliveredAt\"")
    private LocalDateTime deliveredAt;
}
