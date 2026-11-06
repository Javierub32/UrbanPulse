\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('urbanpulse.staff_user_id', :'user_id', true),
       set_config('urbanpulse.staff_role', :'role', true),
       set_config('urbanpulse.staff_actor', :'actor', true);

DO $$
DECLARE
    account "User"%ROWTYPE;
    new_role "UserRole" := current_setting('urbanpulse.staff_role')::"UserRole";
    actor TEXT := trim(current_setting('urbanpulse.staff_actor'));
BEGIN
    IF actor = '' THEN
        RAISE EXCEPTION 'Indica la persona responsable del cambio.';
    END IF;
    SELECT * INTO account FROM "User"
    WHERE "id" = current_setting('urbanpulse.staff_user_id')::UUID FOR UPDATE;
    IF NOT FOUND OR account."active" IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'La cuenta debe existir y estar activa.';
    END IF;
    UPDATE "User" SET "role" = new_role WHERE "id" = account."id";
    RAISE LOG 'Cambio de rol UrbanPulse: usuario_bd=%, responsable=%, cuenta=%, rol_anterior=%, rol_nuevo=%',
        session_user, actor, account."id", account."role", new_role;
    RAISE NOTICE 'Cuenta %: % -> %', account."id", account."role", new_role;
END $$;
COMMIT;
