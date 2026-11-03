package com.leftjoiner.urbanpulse.urbanpulse.controller;

import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginErrorResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.LoginResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.AuthResponse;
import com.leftjoiner.urbanpulse.urbanpulse.dto.ProblemResponseSchema;
import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterRequest;
import com.leftjoiner.urbanpulse.urbanpulse.dto.RegisterResponse;
import com.leftjoiner.urbanpulse.urbanpulse.service.AuthService;
import com.leftjoiner.urbanpulse.urbanpulse.security.UrbanPulsePrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Registrar un ciudadano",
            description = "Crea una cuenta CITIZEN activa. No inicia sesión ni permite elegir roles. "
                    + "Elimina espacios exteriores del nombre y email, conservando sus mayúsculas. "
                    + "La unicidad del email no distingue mayúsculas. La contraseña no se modifica. "
                    + "Rechaza cualquier campo adicional.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Ciudadano registrado; debe iniciar sesión",
                content = @Content(mediaType = "application/json", schema = @Schema(implementation = RegisterResponse.class))),
        @ApiResponse(responseCode = "400", description = "VALIDATION_ERROR con errores por campo, o INVALID_REQUEST para JSON no válido o campos adicionales",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "409", description = "EMAIL_ALREADY_REGISTERED: el email ya está registrado",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "500", description = "INTERNAL_ERROR: error inesperado",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(authService.register(request));
    }

    @Operation(summary = "Iniciar sesión", description = "Comprueba la cuenta activa y BCrypt. Devuelve un JWT Bearer "
            + "con UUID y role del enum UserRole. Caduca a los 900 segundos por defecto, sin renovación automática. "
            + "Un cambio de rol requiere un nuevo login para obtener un token actualizado.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token y datos públicos del usuario",
                content = @Content(mediaType = "application/json", schema = @Schema(implementation = AuthResponse.class))),
        @ApiResponse(responseCode = "400", description = "VALIDATION_ERROR o INVALID_REQUEST",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "401", description = "Credenciales inválidas o cuenta inactiva",
                content = @Content(mediaType = "application/json", schema = @Schema(implementation = LoginErrorResponse.class))),
        @ApiResponse(responseCode = "500", description = "INTERNAL_ERROR",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Optional<AuthResponse> session = authService.login(request.getEmail(), request.getPassword());
        if (session.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).cacheControl(CacheControl.noStore())
                    .body(new LoginErrorResponse("Credenciales inválidas"));
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(session.get());
    }

    @Operation(summary = "Consultar el usuario autenticado", description = "Recupera los datos públicos de una cuenta "
            + "existente y activa. El rol devuelto es el del JWT, que es el utilizado para autorizar las peticiones. "
            + "Esta consulta explícita accede a la base de datos; el filtro JWT no lo hace.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Identidad actual",
                content = @Content(mediaType = "application/json", schema = @Schema(implementation = LoginResponse.class))),
        @ApiResponse(responseCode = "401", description = "UNAUTHENTICATED: token ausente, no válido, caducado o cuenta inactiva",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class))),
        @ApiResponse(responseCode = "500", description = "INTERNAL_ERROR",
                content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemResponseSchema.class)))
    })
    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me(@AuthenticationPrincipal UrbanPulsePrincipal principal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(authService.currentUser(principal));
    }
}
