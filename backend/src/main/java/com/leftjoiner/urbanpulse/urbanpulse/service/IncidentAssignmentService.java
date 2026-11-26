package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentAssignmentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.TechnicianOptionResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.AssignmentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.StatusChangeEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AssignmentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotAssignableException;
import com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotFoundException;
import com.leftjoiner.urbanpulse.urbanpulse.exception.InvalidAssignmentDestinationException;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.TechnicianOptionMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.AssignmentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.StatusChangeRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IncidentAssignmentService {
    private final IncidentRepository incidents;
    private final AssignmentRepository assignments;
    private final StatusChangeRepository history;
    private final UserRepository users;
    private final TechnicianOptionMapper technicianMapper;

    @Transactional(readOnly = true)
    public List<TechnicianOptionResponse> listTechnicians() {
        return technicianMapper.toDTOList(users.findAllByRoleAndActiveTrueOrderByNameAscIdAsc(UserRole.TECHNICIAN));
    }

    @Transactional
    public void assign(UUID incidentId, IncidentAssignmentRequest request, UUID actorId) {
        IncidentEntity incident = incidents.findForReview(incidentId).orElseThrow(IncidentNotFoundException::new);
        if (incident.getStatus() != IncidentStatus.VALIDATED) {
            throw new IncidentNotAssignableException();
        }

        String department = normalize(request.getDepartment());
        String team = normalize(request.getTeam());
        UUID technicianId = request.getTechnicianId();
        if (Stream.of(department, team, technicianId).filter(Objects::nonNull).count() != 1) {
            throw new InvalidAssignmentDestinationException("Selecciona un departamento, un equipo o un técnico.");
        }

        UserEntity technician = technicianId == null ? null
                : users.findByIdAndRoleAndActiveTrue(technicianId, UserRole.TECHNICIAN)
                        .orElseThrow(() -> new InvalidAssignmentDestinationException("El técnico seleccionado no está disponible."));
        UserEntity actor = users.findByIdAndRoleAndActiveTrue(actorId, UserRole.OPERATOR)
                .orElseThrow(() -> new BadCredentialsException("Credencial no válida."));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setIncident(incident);
        assignment.setDepartment(department);
        assignment.setTeam(team);
        assignment.setTechnician(technician);
        assignment.setStatus(AssignmentStatus.PENDING);
        assignment.setAssignedAt(now);

        StatusChangeEntity change = new StatusChangeEntity();
        change.setIncident(incident);
        change.setAssignment(assignments.save(assignment));
        change.setUser(actor);
        change.setPreviousStatus(incident.getStatus());
        change.setStatus(IncidentStatus.ASSIGNED);
        change.setChangedAt(now);
        change.setComment("ASSIGNED");
        history.save(change);

        incident.setStatus(IncidentStatus.ASSIGNED);
        incident.setUpdatedAt(now);
    }

    private String normalize(String name) {
        return name == null || name.isBlank() ? null : name.strip();
    }
}
