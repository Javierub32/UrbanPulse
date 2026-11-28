package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentAssignmentRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.AssignmentCatalogOption;
import com.leftjoiner.urbanpulse.urbanpulse.entity.AssignmentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.IncidentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.StatusChangeEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.TeamEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.AssignmentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotAssignableException;
import com.leftjoiner.urbanpulse.urbanpulse.exception.IncidentNotFoundException;
import com.leftjoiner.urbanpulse.urbanpulse.exception.InvalidAssignmentDestinationException;
import com.leftjoiner.urbanpulse.urbanpulse.repository.AssignmentCatalogRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.AssignmentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.IncidentRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.StatusChangeRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.TeamRepository;
import com.leftjoiner.urbanpulse.urbanpulse.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
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
    private final TeamRepository teams;
    private final AssignmentCatalogRepository catalog;

    @Transactional(readOnly = true)
    public List<AssignmentCatalogOption> listOptions() {
        return catalog.findOptions();
    }

    @Transactional
    public void assign(UUID incidentId, IncidentAssignmentRequest request, UUID actorId) {
        IncidentEntity incident = incidents.findForReview(incidentId).orElseThrow(IncidentNotFoundException::new);
        if (incident.getStatus() != IncidentStatus.VALIDATED) {
            throw new IncidentNotAssignableException();
        }

        UUID teamId = request.getTeamId();
        UUID technicianId = request.getTechnicianId();
        UUID departmentId = request.getDepartmentId();
        if ((teamId == null) == (technicianId == null)) {
            throw new InvalidAssignmentDestinationException("Selecciona un equipo o un técnico del departamento.");
        }

        TeamEntity team = teamId == null ? null
                : teams.findByIdAndDepartment_Id(teamId, departmentId)
                        .filter(candidate -> users.existsByTeam_IdAndRoleAndActiveTrue(candidate.getId(), UserRole.TECHNICIAN))
                        .orElseThrow(() -> new InvalidAssignmentDestinationException("El equipo seleccionado no está disponible en el departamento."));
        UserEntity technician = technicianId == null ? null
                : users.findByIdAndTeam_Department_IdAndRoleAndActiveTrue(technicianId, departmentId, UserRole.TECHNICIAN)
                        .orElseThrow(() -> new InvalidAssignmentDestinationException("El técnico seleccionado no está disponible en el departamento."));
        UserEntity actor = users.findByIdAndRoleAndActiveTrue(actorId, UserRole.OPERATOR)
                .orElseThrow(() -> new BadCredentialsException("Credencial no válida."));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setIncident(incident);
        TeamEntity recipientTeam = team != null ? team : technician.getTeam();
        assignment.setDepartment(recipientTeam.getDepartment().getName());
        assignment.setTeam(recipientTeam.getName());
        assignment.setAssignedTeam(team);
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
}
