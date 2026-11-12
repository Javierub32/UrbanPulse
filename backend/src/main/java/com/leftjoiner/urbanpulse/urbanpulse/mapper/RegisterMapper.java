package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class RegisterMapper extends MapperDTO<RegisterResponse, UserEntity> {

    public UserEntity toEntity(RegisterRequest request) {
        UserEntity user = new UserEntity();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        return user;
    }

    @Override
    public RegisterResponse toDTO(UserEntity user) {
        if (user == null) return null;
        return new RegisterResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
