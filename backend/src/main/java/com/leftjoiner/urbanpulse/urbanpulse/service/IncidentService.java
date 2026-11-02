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
}
