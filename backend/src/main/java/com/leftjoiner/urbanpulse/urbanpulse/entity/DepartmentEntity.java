package com.leftjoiner.urbanpulse.urbanpulse.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "\"Department\"")
@Getter
@NoArgsConstructor
public class DepartmentEntity {
    @Id
    @Column(name = "\"id\"")
    private UUID id;

    @Column(name = "\"name\"", nullable = false)
    private String name;
}
