package com.leftjoiner.urbanpulse.urbanpulse.entity;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
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
@Table(name = "\"User\"")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "\"id\"", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "\"name\"")
    private String name;

    @Column(name = "\"email\"")
    private String email;

    @Column(name = "\"passwordHash\"")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"role\"", columnDefinition = "\"UserRole\"")
    private UserRole role;

    @Column(name = "\"active\"")
    private Boolean active;

    @Column(name = "\"createdAt\"")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user")
    private List<Incident> incidents = new ArrayList<>();

    @OneToMany(mappedBy = "technician")
    private List<Assignment> assignments = new ArrayList<>();

    @OneToMany(mappedBy = "user")
    private List<StatusChange> statusChanges = new ArrayList<>();

    @OneToMany(mappedBy = "user")
    private List<Notification> notifications = new ArrayList<>();
}
