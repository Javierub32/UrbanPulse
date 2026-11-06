package com.leftjoiner.urbanpulse.urbanpulse.config;

import com.leftjoiner.urbanpulse.urbanpulse.security.JwtAuthenticationFilter;
import com.leftjoiner.urbanpulse.urbanpulse.security.JwtService;
import com.leftjoiner.urbanpulse.urbanpulse.security.SecurityProblemHandler;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import jakarta.servlet.DispatcherType;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class SecurityConfig {
    private final JwtService jwtService;
    private final SecurityProblemHandler problemHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource)
            throws Exception {
        return http.cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable()).logout(logout -> logout.disable())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(problemHandler).accessDeniedHandler(problemHandler))
                .authorizeHttpRequests(access -> access
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/v3/api-docs/**",
                                "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/incidents/public").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/incidents/create").hasRole("CITIZEN")
                        .anyRequest().denyAll())
                .addFilterBefore(new JwtAuthenticationFilter(jwtService, problemHandler),
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${urbanpulse.cors.allowed-origins:}") String allowedOrigins) {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::strip).filter(origin -> !origin.isEmpty()).toList();
        for (String origin : origins) {
            URI uri = URI.create(origin);
            if ((!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null
                    || uri.getFragment() != null || (uri.getRawPath() != null && !uri.getRawPath().isEmpty())) {
                throw new IllegalStateException("CORS requiere orígenes HTTP(S) exactos, sin rutas ni comodines.");
            }
        }
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setExposedHeaders(List.of("WWW-Authenticate"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
