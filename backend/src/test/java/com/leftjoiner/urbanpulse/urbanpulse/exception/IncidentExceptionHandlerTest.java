package com.leftjoiner.urbanpulse.urbanpulse.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IncidentExceptionHandlerTest {

    private final IncidentExceptionHandler handler = new IncidentExceptionHandler();

    @Test
    void mapsMissingIncidentToNotFoundProblem() {
        var problem = handler.handleIncidentNotFound(new IncidentNotFoundException());

        assertEquals(404, problem.getStatus());
        assertEquals("INCIDENT_NOT_FOUND", problem.getProperties().get("code"));
    }

    @Test
    void mapsInvalidPaginationToBadRequestProblem() {
        var problem = handler.handleInvalidPagination(new InvalidPaginationException());

        assertEquals(400, problem.getStatus());
        assertEquals("INVALID_PAGINATION", problem.getProperties().get("code"));
    }
}
