package com.leftjoiner.urbanpulse.urbanpulse.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record ReviewReasonRequest(@NotBlank @Size(max = 2000) String reason) {}
