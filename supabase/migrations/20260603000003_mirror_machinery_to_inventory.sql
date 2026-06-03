-- La fitxa pública d'aula llegeix de equipment_inventory, però la maquinària
-- de Fab-manager es va importar a classroom_equipment. Replica la maquinària a
-- equipment_inventory perquè es vegi a la fitxa pública.
-- Idempotent: esborra la maquinària existent a inventory i la torna a inserir.

DELETE FROM equipment_inventory ei
USING equipment_types et
WHERE ei.equipment_type_id = et.id
  AND et.category = 'machinery';

INSERT INTO equipment_inventory (classroom_id, equipment_type_id, quantity, status, notes)
SELECT ce.classroom_id, ce.equipment_type_id, ce.quantity, 'operational', 'Importat de Fab-manager'
FROM classroom_equipment ce
JOIN equipment_types et ON et.id = ce.equipment_type_id
WHERE et.category = 'machinery';
