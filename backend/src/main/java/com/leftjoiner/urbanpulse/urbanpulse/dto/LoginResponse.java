package com.leftjoiner.urbanpulse.urbanpulse.dto;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;

import java.util.UUID;

public record LoginResponse(UUID id, String name, String email, UserRole role) {
}
