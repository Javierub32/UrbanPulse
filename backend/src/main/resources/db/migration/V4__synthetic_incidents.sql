-- Incidencias sintéticas de demostración, asociadas a activos de V3 en Málaga capital.
-- El usuario no tiene credenciales y está inactivo; los datos no son avisos reales.
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "active", "createdAt")
VALUES ('c861dc90-71ea-44f6-9f39-68c194ef9100', 'Usuario sintético de incidencias',
        NULL, NULL, 'CITIZEN', false, TIMESTAMP '2026-10-01 09:00:00');

CREATE TEMPORARY TABLE synthetic_incident_assets (
    asset_id UUID PRIMARY KEY,
    category "IncidentCategory" NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO synthetic_incident_assets (asset_id, category, title, description) VALUES
    ('05b7e0ee-10eb-42fc-8f11-a5f370bbee4c', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19120
    ('49c81cc5-8c97-4520-9672-cb1aa5f0f4ed', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19267
    ('c572731f-025c-40d4-9eb7-21ad3fd37130', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19277
    ('a04b4fe7-c85f-4c6e-a25e-1f9c489c6954', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_18994
    ('a03987cd-975b-43fb-a35a-0644c3e50b6c', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19290
    ('65d1775f-b2a6-4045-82bc-2092c328accd', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19125
    ('50974d0b-9ead-4668-a664-efe9247e31ab', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19190
    ('7b7eb7fb-c519-4af2-beb5-8e3a080139de', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19307
    ('e9ac8720-7083-4c9f-a06e-9b63ae2945db', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19136
    ('1ada0f74-fdc1-402f-a6f8-c5e53ac0a788', 'TRAFFIC', 'Semáforo averiado', 'El semáforo presenta un fallo de funcionamiento y necesita revisión.'), -- MALAGA_TL_19331
    ('d8502d36-fadf-42ba-8e8b-4bae1389a990', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_3799171265
    ('1c0899c8-cd6f-4fe4-9790-ec3499de23c6', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_7517666194
    ('0136bd0d-d952-4a24-9601-a10a20ea3a65', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_8892932139
    ('e3a048f2-5a10-4edd-953f-e2a278531b4d', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_9761232413
    ('5b7165a6-a032-4d13-8e3f-09315bb1a29d', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_10840293910
    ('6d2631fe-1c8b-4a3a-af85-cc7b9881a8a9', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_12153700560
    ('7b784fca-51c1-4c77-86ff-ec60ee4db8d8', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_12731443936
    ('c1f8b909-4c7f-42de-93d7-423ba9f9058a', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_PAPER_BASKET_NODE_13987638318
    ('37c0bcf3-e418-4c0b-916d-8738aeea2d3b', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_BATTERY_BIN_2179
    ('99c5687a-3c71-4b6e-892d-6a7945cc6054', 'WASTE', 'Papelera dañada', 'La papelera presenta desperfectos y necesita reparación.'), -- MALAGA_BATTERY_BIN_2160
    ('ac27078c-e624-4c5b-bf81-8780d0ac794a', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE6
    ('98192f01-966f-4a0c-898f-44527172b6fd', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE21
    ('0c7e791f-0b2f-4bff-8c15-85bc28cd9ef9', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE68
    ('f3052f8a-ecc9-4e0c-8ba0-ecd9273c98d8', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE110
    ('3fa9e5f2-8658-4f1d-bb2f-fa394635899f', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE213
    ('16863d4b-5303-4b7a-9b75-29c619f659f6', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE274
    ('1c8e4139-8da4-4363-b4e8-3b396a28a984', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE322
    ('f94f3f9d-0628-405a-b0f3-63795f7fb5f0', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE368
    ('ae07224f-32cd-406b-bcfb-48225877253a', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE277
    ('563d2c3d-f5f7-43b7-8835-e81e7f0104ea', 'STREET_FURNITURE', 'Fuente de agua averiada', 'La fuente presenta una avería y necesita revisión.'), -- MALAGA_POTABLE_FOUNTAIN_FBE341
    ('8633eba1-de8c-4734-b938-da71333a8f19', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_152
    ('c7aa48a1-7e83-46c3-a0ab-415aca00495f', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_2614
    ('a2d5e11b-0342-45e0-a07a-a27f881d955c', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_463
    ('22db2fa4-9c58-4081-91ba-5aa4c989f688', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_838
    ('4b1077e5-d28d-4e55-b16a-703765283c6d', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_1513
    ('3b50608b-ee0a-4e0d-b50f-e234d5df6be7', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_2460
    ('6e853f91-4989-4de2-bd1a-e2c77a702acf', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_3121
    ('483c4ce7-78b9-457f-b163-da56059a7bab', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_3455
    ('80cecec5-b059-435d-abeb-6b375f60d3c8', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_714
    ('a247b7cb-31a4-40bb-b386-b76649385d70', 'STREET_FURNITURE', 'Parada de autobús dañada', 'El mobiliario de la parada presenta desperfectos.'), -- MALAGA_EMT_STOP_4454
    ('6f080e03-e217-4e74-8a36-b480d8266f81', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_12349_da_cartografiaAreaVerde_12349
    ('4e5d2a69-8b90-4f06-b6b6-f7cf489c5e15', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_10394_da_cartografiaAreaVerde_10394
    ('abe8c330-144d-4432-b7e9-f9d2fd61755f', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_9710_da_cartografiaAreaVerde_9710
    ('7d3723c4-13b6-46a9-9980-0a0849372b93', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_2698_da_cartografiaAreaVerde_2698
    ('5b93620a-42ee-4c6b-a874-1bd2e9bcb78b', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_2668_da_cartografiaAreaVerde_2668
    ('5398ec8b-b31a-4029-b2c9-8936c3cb9d6e', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_2664_da_cartografiaAreaVerde_2664
    ('d16f33e3-ec39-4a34-8324-adfe2a4477ed', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_2686_da_cartografiaAreaVerde_2686
    ('1742d072-18ad-4b54-89cf-1c62c32a8c5f', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_2696_da_cartografiaAreaVerde_2696
    ('5682aef8-7a0b-4a14-8ead-eab9f80abb94', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'), -- MALAGA_GREEN_AREA_2965_da_cartografiaAreaVerde_2965
    ('46fba113-5dbc-4263-9723-a59114699a3e', 'GREEN_AREAS', 'Zona verde necesita mantenimiento', 'La zona verde necesita limpieza y mantenimiento.'); -- MALAGA_GREEN_AREA_2743_da_cartografiaAreaVerde_2743

-- No dejar una carga parcial si los activos de referencia ya no están presentes.
DO $$
BEGIN
    IF (SELECT count(*) FROM synthetic_incident_assets s
        JOIN "UrbanAsset" a ON a."id" = s.asset_id AND a."location" IS NOT NULL) <> 50 THEN
        RAISE EXCEPTION 'La carga de incidencias sintéticas requiere los 50 activos de V3';
    END IF;
END $$;

INSERT INTO "Incident" ("id", "userId", "title", "description", "category", "location",
                        "normalizedAddress", "priority", "status", "registeredAt", "updatedAt")
SELECT md5('synthetic-incident:' || s.asset_id::text)::uuid,
       'c861dc90-71ea-44f6-9f39-68c194ef9100'::uuid,
       s.title, s.description, s.category, ST_Force2D(ST_PointOnSurface(a."location")),
       a."metadata" ->> 'address', 'MEDIUM', 'REPORTED',
       TIMESTAMP '2026-10-01 09:00:00', TIMESTAMP '2026-10-01 09:00:00'
FROM synthetic_incident_assets s
JOIN "UrbanAsset" a ON a."id" = s.asset_id;

INSERT INTO "IncidentAssetAssociation" ("id", "incidentId", "urbanAssetId", "distance", "confidence", "associationType")
SELECT md5('synthetic-association:' || s.asset_id::text)::uuid,
       md5('synthetic-incident:' || s.asset_id::text)::uuid,
       s.asset_id, 0, 1, 'EXPLICIT'
FROM synthetic_incident_assets s;
