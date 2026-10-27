package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.User;
import org.springframework.stereotype.Component;

@Component
public class LoginResponseMapper extends MapperDTO<User, LoginResponse> {

    @Override
    public LoginResponse toDTO(User user) {
        return new LoginResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
