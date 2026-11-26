package com.leftjoiner.urbanpulse.urbanpulse.repository;

import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    @Query("select user from UserEntity user where lower(user.email) = lower(:email)")
    Optional<UserEntity> findByEmail(@Param("email") String email);

    List<UserEntity> findAllByRoleAndActiveTrueOrderByNameAscIdAsc(UserRole role);

    Optional<UserEntity> findByIdAndRoleAndActiveTrue(UUID id, UserRole role);
}
