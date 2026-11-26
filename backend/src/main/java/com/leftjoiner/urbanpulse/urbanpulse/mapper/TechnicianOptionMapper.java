package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.TechnicianOptionResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class TechnicianOptionMapper extends MapperDTO<TechnicianOptionResponse, UserEntity> {

    @Override
    public TechnicianOptionResponse toDTO(UserEntity technician) {
        return new TechnicianOptionResponse(technician.getId(), technician.getName());
    }
}
