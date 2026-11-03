package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.exception.UserNotFoundException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.IncidentMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IncidentService {
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final IncidentMapper incidentMapper;

    private static final int MAX_PAGE_SIZE = 100;

    @Transactional
    public IncidentResponse create(IncidentRequest request) {
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(UserNotFoundException::new);
        IncidentEntity incident = incidentMapper.toEntity(request);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        incident.setUser(user);
        incident.setStatus(IncidentStatus.REPORTED);
        incident.setRegisteredAt(now);
        incident.setUpdatedAt(now);
        return incidentMapper.toDTO(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentPageResponse listIncidents (UUID userId, int page, int size){
        if(page < 0 || size < 1 || size > MAX_PAGE_SIZE ) {
            throw new InvalidPaginationException();
        }

        Pageable pageable = PageRequest.of(
            page, 
            size,
            Sort.by(
                    Sort.Order.desc("registeredAt"),
                    Sort.Order.desc("id")
            )
        );

        Page<IncidentEntity> result = incidentRepository.findAllByUserId(userId, pageable);
        List<IncidentSummaryResponse> incidents = result.getContent().stream()
                .map(incidentMapper::toSummaryDTO)
                .toList();

        return new IncidentPageResponse(
            incidents,
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages()
        );        
    }

    @Transactional
    public IncidentDetailResponse getIncidentDetail(UUID userId, UUID incidentId) {
        IncidentEntity incident = incidentRepository.findByIdAndUserId(incidentId, userId)
                                                    .orElseThrow(IncidentNotFoundException::new);
        IncidentResponse response = incidentMapper.toDTO(incident);
        List<IncidentHistoryResponse> history = statusChangeRepository
            .findAllByIncident_IdOrderByChangedAtAscIdAsc(incidentId)
            .stream()
            .map(statusChangeMapper::toDTO)
            .toList();
        return new IncidentDetailResponse(response, history);
    }
}
