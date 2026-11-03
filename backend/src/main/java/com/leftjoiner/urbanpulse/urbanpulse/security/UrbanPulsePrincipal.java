package com.leftjoiner.urbanpulse.urbanpulse.security;

import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import java.security.Principal;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class UrbanPulsePrincipal implements Principal {
    private final UUID id;
    private final UserRole role;

    @Override
    public String getName() {
        return id.toString();
    }
}
