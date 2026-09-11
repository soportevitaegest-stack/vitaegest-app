-- =============================================================================
-- VitaeGest · seed_system.sql
-- Plantillas de evaluación de SISTEMA (professional_id = NULL).
-- Se corre SIEMPRE: en el proyecto demo Y en cada cliente real (onboarding).
-- Idempotente: borra las de sistema y las recarga.
-- Requiere el esquema aplicado (schema.sql → 0001 … 0008 / 00_migraciones_consolidadas.sql).
-- =============================================================================

delete from public.evaluation_templates where is_system = true;

insert into public.evaluation_templates (professional_id, area, name, description, schema, is_system, is_active)
values
(null, 'general', 'Escala de dolor (EVA)',
 'Escala visual analógica del dolor de 0 a 10.',
 '{
    "fields": [
      { "key": "eva", "label": "Dolor (EVA)", "type": "scale", "min": 0, "max": 10, "step": 1,
        "hints": { "0": "Sin dolor", "10": "Máximo" } }
    ]
 }'::jsonb, true, true),

(null, 'pelvic_perineal', 'Evaluación PERFECT (piso pélvico)',
 'Valoración de la musculatura del suelo pélvico. Cada dimensión se puntúa 0–5.',
 '{
    "fields": [
      { "key": "eva",  "label": "Dolor (EVA)",         "type": "scale",  "min": 0, "max": 10, "step": 1 },
      { "key": "P",    "label": "P · Power (fuerza)",    "type": "select", "options": [0,1,2,3,4,5] },
      { "key": "E",    "label": "E · Endurance",         "type": "select", "options": [0,1,2,3,4,5] },
      { "key": "R",    "label": "R · Repeticiones",      "type": "select", "options": [0,1,2,3,4,5] },
      { "key": "F",    "label": "F · Fast (contracc. rápidas)", "type": "select", "options": [0,1,2,3,4,5] },
      { "key": "notes","label": "Observaciones",         "type": "textarea" }
    ]
 }'::jsonb, true, true),

(null, 'dermatofunctional', 'Evaluación dermatofuncional',
 'Valoración de edema, fibrosis y estado de la cicatriz.',
 '{
    "fields": [
      { "key": "eva",   "label": "Dolor (EVA)",  "type": "scale",  "min": 0, "max": 10, "step": 1 },
      { "key": "edema", "label": "Edema / fibrosis", "type": "select",
        "options": ["leve", "moderado", "severo", "resuelto"] },
      { "key": "perimetro", "label": "Perímetro (cm)", "type": "number" },
      { "key": "treatment_map", "label": "Mapa de tratamiento", "type": "bodymap" }
    ]
 }'::jsonb, true, true),

(null, 'respiratory', 'Evaluación respiratoria',
 'Parámetros básicos de kinesiología respiratoria.',
 '{
    "fields": [
      { "key": "eva",  "label": "Dolor / disnea (EVA)", "type": "scale",  "min": 0, "max": 10, "step": 1 },
      { "key": "spo2", "label": "SpO2 (%)",             "type": "number", "min": 80, "max": 100 },
      { "key": "notes","label": "Patrón respiratorio",  "type": "textarea" }
    ]
 }'::jsonb, true, true);
