package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.IncidentAtmosphericDataResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UrbanContextEntity;
import org.springframework.stereotype.Component;

@Component
public class AtmosphericContextMapper extends MapperDTO<IncidentAtmosphericDataResponse, UrbanContextEntity> {
    @Override
    public IncidentAtmosphericDataResponse toDTO(UrbanContextEntity context) {
        if (context == null) return null;
        return new IncidentAtmosphericDataResponse(context.getKey(), context.getValue(), context.getUnit(),
                context.getSource(), context.getObservedAt());
    }
}
