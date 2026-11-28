package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    @Query("select user from UserEntity user where lower(user.email) = lower(:email)")
    Optional<UserEntity> findByEmail(@Param("email") String email);

    Optional<UserEntity> findByIdAndTeam_Department_IdAndRoleAndActiveTrue(UUID id, UUID departmentId, UserRole role);

    boolean existsByTeam_IdAndRoleAndActiveTrue(UUID teamId, UserRole role);

    Optional<UserEntity> findByIdAndRoleAndActiveTrue(UUID id, UserRole role);
}
