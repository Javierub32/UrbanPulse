package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.User;
import org.springframework.stereotype.Component;

@Component
public class LoginResponseMapper extends MapperDTO<LoginResponse, User> {

    @Override
    public LoginResponse toDTO(User user) {
        if (user == null) {
            return null;
        }
        return new LoginResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
