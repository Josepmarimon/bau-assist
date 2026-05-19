-- RustDesk és codi obert (https://github.com/rustdesk/rustdesk).
-- Corregim el license_type per agrupar-lo correctament a la UI.

UPDATE public.software
SET license_type = 'open_source'
WHERE name = 'RustDesk';
