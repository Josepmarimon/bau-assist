-- Importa les màquines de Fab-manager (bau.fab-manager.com) com a equipament.
-- Cada categoria de màquina de Fab-manager (taller) es mapeja a una aula de tipus Taller
-- de bau-assist, i les màquines s'agrupen per família amb la seva quantitat.
-- Catàleg: equipment_types (categoria 'machinery'). Assignació: classroom_equipment.

-- 1) Tipus d'equipament (famílies de màquina)
INSERT INTO equipment_types (code, name, category, icon, is_active) VALUES
  ('machinery_ampliadora', $$Ampliadora fotogràfica$$, 'machinery', 'Image', true),
  ('machinery_arrossegament', $$Màquina de doble arrossegament$$, 'machinery', 'Shirt', true),
  ('machinery_electronica', $$Estació d'electrònica$$, 'machinery', 'CircuitBoard', true),
  ('machinery_engomadora', $$Engomadora$$, 'machinery', 'Shirt', true),
  ('machinery_escaner_3d', $$Escàner 3D$$, 'machinery', 'Scan', true),
  ('machinery_estudi_so', $$Estudi de so$$, 'machinery', 'Mic', true),
  ('machinery_fresadora_cnc', $$Fresadora CNC$$, 'machinery', 'Cog', true),
  ('machinery_gravadora_podcast', $$Gravadora de podcast$$, 'machinery', 'Mic', true),
  ('machinery_impressora_3d', $$Impressora 3D$$, 'machinery', 'Box', true),
  ('machinery_impressora_3d_ceramica', $$Impressora 3D ceràmica$$, 'machinery', 'Box', true),
  ('machinery_overlock', $$Overlock$$, 'machinery', 'Shirt', true),
  ('machinery_pc_ia', $$PC alt rendiment (IA)$$, 'machinery', 'Cpu', true),
  ('machinery_plana', $$Màquina de cosir plana$$, 'machinery', 'Shirt', true),
  ('machinery_plana_auto', $$Màquina de cosir plana automàtica$$, 'machinery', 'Shirt', true),
  ('machinery_plato_foto', $$Plató de fotografia$$, 'machinery', 'Camera', true),
  ('machinery_plato_video', $$Plató de vídeo$$, 'machinery', 'Video', true),
  ('machinery_plotter', $$Plotter de tall$$, 'machinery', 'PenTool', true),
  ('machinery_recobridora', $$Recobridora$$, 'machinery', 'Shirt', true),
  ('machinery_revelat', $$Revelat de carret$$, 'machinery', 'Film', true),
  ('machinery_riso', $$Duplicadora RISO$$, 'machinery', 'Printer', true),
  ('machinery_serigrafia', $$Serigrafia$$, 'machinery', 'Layers', true),
  ('machinery_sublimacio', $$Màquina de sublimació$$, 'machinery', 'Flame', true),
  ('machinery_talladora_laser', $$Talladora làser$$, 'machinery', 'Zap', true),
  ('machinery_tricotosa', $$Tricotosa$$, 'machinery', 'Shirt', true),
  ('machinery_vius', $$Màquina de vius$$, 'machinery', 'Shirt', true),
  ('machinery_zigzag', $$Màquina de cosir Zig-Zag$$, 'machinery', 'Shirt', true)
ON CONFLICT (code) DO NOTHING;

-- 2) Assignacions per taller (classroom_equipment), agrupades per quantitat
INSERT INTO classroom_equipment (classroom_id, equipment_type_id, quantity, notes)
SELECT cl.id, et.id, v.qty, 'Importat de Fab-manager'
FROM (VALUES
    ('CABINA_D''AUDIO','machinery_estudi_so',1),
    ('G.0.3','machinery_impressora_3d_ceramica',1),
    ('G.0.5','machinery_fresadora_cnc',1),
    ('G.0.5','machinery_impressora_3d',13),
    ('G.0.5','machinery_talladora_laser',3),
    ('L.0.3_PLATÓ','machinery_ampliadora',3),
    ('L.0.3_PLATÓ','machinery_plato_foto',4),
    ('L.0.3_PLATÓ','machinery_plato_video',2),
    ('L.0.3_PLATÓ','machinery_revelat',1),
    ('T.2_AUDIOVISUAL_LAB','machinery_electronica',1),
    ('T.2_AUDIOVISUAL_LAB','machinery_escaner_3d',1),
    ('T.2_AUDIOVISUAL_LAB','machinery_gravadora_podcast',1),
    ('T.2_AUDIOVISUAL_LAB','machinery_pc_ia',1),
    ('T.3_MODA','machinery_arrossegament',1),
    ('T.3_MODA','machinery_engomadora',1),
    ('T.3_MODA','machinery_overlock',3),
    ('T.3_MODA','machinery_plana',15),
    ('T.3_MODA','machinery_plana_auto',4),
    ('T.3_MODA','machinery_recobridora',1),
    ('T.3_MODA','machinery_vius',1),
    ('T.3_MODA','machinery_zigzag',1),
    ('T.5_TRICOTOSES','machinery_tricotosa',16),
    ('TALLER_DE_SERIGRAFIA','machinery_serigrafia',4),
    ('TALLER_DE_SERIGRAFIA','machinery_sublimacio',1),
    ('TALLER_PROD_GRÀF','machinery_plotter',1),
    ('TALLER_PROD_GRÀF','machinery_riso',1)
) AS v(room_code, eq_code, qty)
JOIN classrooms cl ON cl.code = v.room_code
JOIN equipment_types et ON et.code = v.eq_code
ON CONFLICT (classroom_id, equipment_type_id)
DO UPDATE SET quantity = EXCLUDED.quantity, notes = EXCLUDED.notes;
