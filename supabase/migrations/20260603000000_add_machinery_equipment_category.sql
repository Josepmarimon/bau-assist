-- Afegeix la categoria d'equipament "machinery" (Màquines de Taller)
-- Amplia el CHECK de equipment_types.category per acceptar el nou valor.

ALTER TABLE equipment_types DROP CONSTRAINT IF EXISTS equipment_types_category_check;

ALTER TABLE equipment_types ADD CONSTRAINT equipment_types_category_check
  CHECK (category IN (
    'audiovisual',
    'computing',
    'furniture',
    'climate',
    'office',
    'machinery'
  ));
