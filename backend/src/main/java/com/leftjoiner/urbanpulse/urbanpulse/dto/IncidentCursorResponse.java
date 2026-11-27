package com.leftjoiner.urbanpulse.urbanpulse.dto;

import java.util.List;

public record IncidentCursorResponse(
        List<IncidentListItemResponse> items,
        String nextPageToken,
        Long totalElements) {
}
