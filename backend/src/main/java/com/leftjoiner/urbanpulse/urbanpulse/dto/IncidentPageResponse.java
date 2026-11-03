package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class IncidentPageResponse {
    private List<IncidentListItemResponse> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
