package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TechnicianOptionResponse {
    private final UUID id;
    private final String name;
}
