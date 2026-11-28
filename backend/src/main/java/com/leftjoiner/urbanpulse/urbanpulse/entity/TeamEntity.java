package com.leftjoiner.urbanpulse.urbanpulse.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "\"Team\"")
@Getter
@NoArgsConstructor
public class TeamEntity {
    @Id
    @Column(name = "\"id\"")
    private UUID id;

    @Column(name = "\"name\"", nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"departmentId\"", nullable = false)
    private DepartmentEntity department;
}
