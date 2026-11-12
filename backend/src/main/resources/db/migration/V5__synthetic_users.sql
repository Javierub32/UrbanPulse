-- Cuentas de demostración activas; la contraseña común es urbanpulse (BCrypt).
-- Esta migración se ejecuta en todos los entornos: no utilizar estas cuentas en producción.
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "active", "createdAt") VALUES
    ('f5300000-0000-4000-8000-000000000001', 'Ciudadano sintético 1', 'ciudadano1@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'CITIZEN', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000002', 'Ciudadano sintético 2', 'ciudadano2@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'CITIZEN', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000003', 'Operador sintético 1', 'operador1@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'OPERATOR', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000004', 'Operador sintético 2', 'operador2@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'OPERATOR', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000005', 'Técnico sintético 1', 'tecnico1@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'TECHNICIAN', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000006', 'Técnico sintético 2', 'tecnico2@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'TECHNICIAN', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000007', 'Administrador sintético 1', 'administrador1@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'ADMINISTRATOR', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000008', 'Administrador sintético 2', 'administrador2@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'ADMINISTRATOR', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000009', 'Analista sintético 1', 'analista1@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'ANALYST', true, TIMESTAMP '2026-01-01 00:00:00'),
    ('f5300000-0000-4000-8000-000000000010', 'Analista sintético 2', 'analista2@urbanpulse.invalid', '$2a$10$l0dZLnZqh8kvxtrVT63dve8azZbXFg/snQc171kOh2XfUBjh6T9Wq', 'ANALYST', true, TIMESTAMP '2026-01-01 00:00:00');
