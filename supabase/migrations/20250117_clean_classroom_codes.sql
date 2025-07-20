-- Clean up classroom names while preserving codes
-- Updates names for codes like "T.3_TALLER_DE_MODA" to have proper name "Taller de moda"
-- Codes remain unchanged to avoid duplicates

BEGIN;

-- Update classrooms where code contains underscore and name equals code
-- This indicates the name hasn't been properly set
UPDATE classrooms
SET 
    name = CASE
        -- Specific cases with known formatting
        WHEN code = 'T.3_STOPMOTION' THEN 'T.3 - StopMotion'
        WHEN code = 'T.4_STOPMOTION' THEN 'T.4 - StopMotion'
        WHEN code = 'T.3_TALLER_DE_MODA' THEN 'T.3 - Taller de moda'
        WHEN code = 'T.4_TALLER_DE_MODA' THEN 'T.4 - Taller de moda'
        WHEN code = 'T.2_AUDIOVISUAL_LAB' THEN 'T.2 - Audiovisual Lab'
        WHEN code = 'T.5_TRICOTOSES' THEN 'T.5 - Tricotoses'
        WHEN code = 'L.0.3_PLATÓ' THEN 'L.0.3 - Plató'
        WHEN code = 'G.0.3_TALLER_D''ESCULTURA_CERAMICA_METALL' THEN 'G.0.3 - Taller d''Escultura, ceràmica, metall'
        WHEN code = 'CABINA_D''AUDIO' THEN 'Cabina d''Audio'
        WHEN code = 'SALA_BADAJOZ' THEN 'Sala Badajoz'
        WHEN code = 'SALA_CAROLINES' THEN 'Sala Carolines'
        WHEN code = 'TALLER_DE_PRODUCCIÓ_GRÀFICA' THEN 'Taller de Producció Gràfica'
        WHEN code = 'TALLER_DE_SERIGRAFIA' THEN 'Taller de Serigrafia'
        -- For any other cases where name equals code and contains underscore
        WHEN name = code AND code ~ '_' THEN
            -- Extract the base code and format the descriptive part
            CASE 
                WHEN code ~ '\.[0-9]+.*_' THEN
                    SUBSTRING(code FROM 1 FOR POSITION('_' IN code) - 1) || ' - ' ||
                    REPLACE(
                        LOWER(REPLACE(SUBSTRING(code FROM POSITION('_' IN code) + 1), '_', ' ')),
                        'd''', 'd'''
                    )
                ELSE
                    -- For codes without dots, just format the name part
                    REPLACE(
                        INITCAP(REPLACE(code, '_', ' ')),
                        'D''', 'd'''
                    )
            END
        ELSE name  -- Keep existing name if it's already different from code
    END,
    updated_at = NOW()
WHERE name = code AND code ~ '_';

COMMIT;