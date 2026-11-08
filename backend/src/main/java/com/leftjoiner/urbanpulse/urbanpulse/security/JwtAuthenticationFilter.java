package com.leftjoiner.urbanpulse.urbanpulse.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final SecurityProblemHandler problemHandler;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return "POST".equals(request.getMethod()) && ("/api/auth/login".equals(path)
                || "/api/auth/register".equals(path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        List<String> headers = Collections.list(request.getHeaders(HttpHeaders.AUTHORIZATION));
        if (!headers.isEmpty()) {
            try {
                String header = headers.get(0);
                if (headers.size() != 1 || header.length() > 8192
                        || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
                    throw new BadCredentialsException("Credencial no válida.");
                }
                String token = header.substring(7);
                if (token.isBlank() || token.chars().anyMatch(Character::isWhitespace)) {
                    throw new BadCredentialsException("Credencial no válida.");
                }
                UrbanPulsePrincipal principal = jwtService.validate(token);
                var authentication = UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
                var context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);
            } catch (JwtException | IllegalArgumentException | BadCredentialsException exception) {
                SecurityContextHolder.clearContext();
                problemHandler.commence(request, response, new BadCredentialsException("Credencial no válida."));
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
