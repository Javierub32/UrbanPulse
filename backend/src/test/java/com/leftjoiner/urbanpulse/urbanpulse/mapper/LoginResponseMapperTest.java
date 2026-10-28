package com.leftjoiner.urbanpulse.urbanpulse.mapper;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.entity.User;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.UserRole;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginResponseMapperTest {

    private final LoginResponseMapper mapper = new LoginResponseMapper();

    @Test
    void mapsPublicFieldsOfEachUserInOriginalOrder() {
        User first = user("First", "first@example.com", UserRole.CITIZEN);
        User second = user("Second", "second@example.com", UserRole.OPERATOR);

        List<LoginResponse> responses = mapper.toDTOList(List.of(first, second));

        assertEquals(List.of(
                new LoginResponse(first.getId(), "First", "first@example.com", UserRole.CITIZEN),
                new LoginResponse(second.getId(), "Second", "second@example.com", UserRole.OPERATOR)
        ), responses);
        assertEquals(first.getId(), responses.get(0).getId());
        assertEquals("First", responses.get(0).getName());
        assertEquals("first@example.com", responses.get(0).getEmail());
        assertEquals(UserRole.CITIZEN, responses.get(0).getRole());
    }

    @Test
    void returnsEmptyListForEmptyInput() {
        assertTrue(mapper.toDTOList(List.of()).isEmpty());
    }

    @Test
    void returnsEmptyListForNullInput() {
        assertTrue(mapper.toDTOList(null).isEmpty());
    }

    @Test
    void returnsNullForNullUser() {
        assertNull(mapper.toDTO(null));
    }

    private User user(String name, String email, UserRole role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName(name);
        user.setEmail(email);
        user.setRole(role);
        user.setPasswordHash("internal-hash-not-part-of-response");
        return user;
    }
}
