-- ==============================================================================
-- MIGRATION SUPABASE : Table marmicout_planning & demo_marmicout_planning
-- Date : 2026-11-15
-- Planning hebdomadaire des recettes avec portions, suivi de fabrication et RLS
-- ==============================================================================

-- 1. marmicout_planning (table de production / cloud multi-tenant)
CREATE TABLE IF NOT EXISTS marmicout_planning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES marmicout_establishments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    recipe_id TEXT NOT NULL,
    portions NUMERIC NOT NULL DEFAULT 1,
    meal_slot TEXT NOT NULL DEFAULT 'journee',
    notes TEXT,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    production_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances de filtrage par établissement et date
CREATE INDEX IF NOT EXISTS idx_marmicout_planning_establishment_date
  ON marmicout_planning(establishment_id, date);

-- Activation de Row Level Security (RLS)
ALTER TABLE marmicout_planning ENABLE ROW LEVEL SECURITY;

-- Politiques RLS identiques aux autres tables marmicout_* (isolation stricte par établissement)
CREATE POLICY "marmicout_planning_select"
  ON marmicout_planning
  FOR SELECT
  TO authenticated
  USING (
    establishment_id IN (
      SELECT m.establishment_id
      FROM marmicout_members m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE POLICY "marmicout_planning_insert"
  ON marmicout_planning
  FOR INSERT
  TO authenticated
  WITH CHECK (
    establishment_id IN (
      SELECT m.establishment_id
      FROM marmicout_members m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE POLICY "marmicout_planning_update"
  ON marmicout_planning
  FOR UPDATE
  TO authenticated
  USING (
    establishment_id IN (
      SELECT m.establishment_id
      FROM marmicout_members m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  )
  WITH CHECK (
    establishment_id IN (
      SELECT m.establishment_id
      FROM marmicout_members m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE POLICY "marmicout_planning_delete"
  ON marmicout_planning
  FOR DELETE
  TO authenticated
  USING (
    establishment_id IN (
      SELECT m.establishment_id
      FROM marmicout_members m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

-- 2. demo_marmicout_planning (table du mode démo isolé)
CREATE TABLE IF NOT EXISTS demo_marmicout_planning (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES demo_marmicout_recipes(id) ON DELETE CASCADE,
    portions NUMERIC NOT NULL DEFAULT 1,
    meal_slot TEXT NOT NULL DEFAULT 'journee',
    notes TEXT,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    production_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demo_marmicout_planning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read demo planning"
  ON demo_marmicout_planning
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Commentaires documentaires
COMMENT ON TABLE marmicout_planning IS 'Planning hebdomadaire des recettes planifiées par établissement';
COMMENT ON COLUMN marmicout_planning.date IS 'Date du jour prévu de préparation ou de service (YYYY-MM-DD)';
COMMENT ON COLUMN marmicout_planning.portions IS 'Nombre de portions prévues pour ce créneau';
COMMENT ON COLUMN marmicout_planning.is_done IS 'Statut de réalisation (vrai si cuisiné / production lancée)';
