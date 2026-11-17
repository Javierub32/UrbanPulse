package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.*;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import com.leftjoiner.urbanpulse.urbanpulse.service.InitialReviewService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operator/reviews")
@RequiredArgsConstructor
public class InitialReviewController {
    private final InitialReviewService service;
    @GetMapping
    public Page<IncidentListItemResponse> pending(@RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return service.pending(page, size);
    }
    @PostMapping("/{id}/edit")
    public void edit(@PathVariable UUID id, @Valid @RequestBody ReviewEditRequest request) { service.edit(id, request); }
    @PostMapping("/{id}/validate")
    public void validate(@PathVariable UUID id, @AuthenticationPrincipal UrbanPulsePrincipal actor) {
        service.act(id, actor.getId(), IncidentStatus.VALIDATED, null, "VALIDATED");
    }
    @PostMapping("/{id}/reject")
    public void reject(@PathVariable UUID id, @Valid @RequestBody ReviewReasonRequest request,
                       @AuthenticationPrincipal UrbanPulsePrincipal actor) {
        service.act(id, actor.getId(), IncidentStatus.REJECTED, request.reason(), "REJECTED");
    }
    @PostMapping("/{id}/request-information")
    public void requestInformation(@PathVariable UUID id, @Valid @RequestBody ReviewReasonRequest request,
                                   @AuthenticationPrincipal UrbanPulsePrincipal actor) {
        service.act(id, actor.getId(), IncidentStatus.REPORTED, request.reason(), "INFORMATION_REQUESTED");
    }
}
