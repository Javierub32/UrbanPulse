package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

// Esta clase se utiliza para la paginación de incidentes
@Getter
@AllArgsConstructor
public class IncidentPageResponse {
    private List<IncidentSummaryResponse> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}