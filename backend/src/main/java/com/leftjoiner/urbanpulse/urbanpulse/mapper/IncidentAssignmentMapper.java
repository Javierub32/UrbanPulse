package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentAssignmentResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.AssignmentEntity;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class IncidentAssignmentMapper extends MapperDTO<IncidentAssignmentResponse, AssignmentEntity> {

    @Override
    public IncidentAssignmentResponse toDTO(AssignmentEntity assignment) {
        UserEntity technician = assignment.getTechnician();
        return new IncidentAssignmentResponse(assignment.getDepartment(), assignment.getTeam(),
                technician == null ? null : technician.getId(),
                technician == null ? null : technician.getName());
    }
}
