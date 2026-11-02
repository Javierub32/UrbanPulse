package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class LoginResponseMapper extends MapperDTO<LoginResponse, UserEntity> {

    @Override
    public LoginResponse toDTO(UserEntity user) {
        if (user == null) {
            return null;
        }
        return new LoginResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
