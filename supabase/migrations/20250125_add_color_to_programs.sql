-- Add color field to programs table
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Set default colors for existing programs based on type
UPDATE programs 
SET color = CASE 
    WHEN type = 'master' THEN '#3B82F6'  -- Blue for masters
    WHEN type = 'postgrau' THEN '#10B981' -- Green for postgraus
    ELSE '#6B7280' -- Gray for others
END
WHERE color IS NULL OR color = '#3B82F6';

-- Add some variety to existing programs
UPDATE programs 
SET color = CASE 
    -- Masters with different colors
    WHEN code = 'MUD' THEN '#3B82F6'      -- Blue
    WHEN code = 'MUDAT' THEN '#8B5CF6'   -- Purple
    WHEN code = 'MUDG' THEN '#EC4899'    -- Pink
    WHEN code = 'M_DXD' THEN '#F59E0B'   -- Amber
    WHEN code = 'M_IAEI' THEN '#10B981'  -- Emerald
    WHEN code = 'M_MGD' THEN '#EF4444'   -- Red
    WHEN code = 'M_DBP' THEN '#14B8A6'   -- Teal
    WHEN code = 'M_CCCD' THEN '#F97316'  -- Orange
    WHEN code = 'M_DTM' THEN '#A855F7'   -- Purple
    WHEN code = 'M_DI' THEN '#06B6D4'    -- Cyan
    WHEN code = 'M_DG' THEN '#84CC16'    -- Lime
    WHEN code = 'M_DCG' THEN '#6366F1'   -- Indigo
    WHEN code = 'M_DEEDA' THEN '#F43F5E' -- Rose
    WHEN code = 'M_ASM' THEN '#0EA5E9'   -- Sky
    WHEN code = 'M_IC' THEN '#FACC15'    -- Yellow
    WHEN code = 'M_SD' THEN '#22C55E'    -- Green
    -- Postgraus with different colors
    WHEN code = 'PG_MIC' THEN '#10B981'  -- Emerald
    WHEN code = 'PG_PD' THEN '#14B8A6'   -- Teal
    WHEN code = 'PG_BD' THEN '#06B6D4'   -- Cyan
    WHEN code = 'PG_IDNM' THEN '#3B82F6' -- Blue
    WHEN code = 'PG_I' THEN '#6366F1'    -- Indigo
    WHEN code = 'PG_M3D' THEN '#8B5CF6'  -- Violet
    WHEN code = 'PG_MD' THEN '#A855F7'   -- Purple
    ELSE color
END
WHERE type IN ('master', 'postgrau');

-- Add comment
COMMENT ON COLUMN programs.color IS 'Hex color code for visual representation in calendars and UI';