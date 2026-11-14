-- ==============================================================================
-- MIGRATION SUPABASE : Équivalences d'unités de conversion pour les produits
-- Date : 2026-11-14
-- Colonnes facultatives uniquement, aucune suppression ni renommage.
-- ==============================================================================

-- 1. marmicout_products (table principale / cloud)
ALTER TABLE IF EXISTS marmicout_products
  ADD COLUMN IF NOT EXISTS unit_weight_g NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS density_g_per_ml NUMERIC NULL;

-- 2. demo_marmicout_products (table du mode démo)
ALTER TABLE IF EXISTS demo_marmicout_products
  ADD COLUMN IF NOT EXISTS unit_weight_g NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS density_g_per_ml NUMERIC NULL;

-- Commentaires documentaires
COMMENT ON COLUMN marmicout_products.unit_weight_g IS 'Poids d''une pièce, d''un sachet, d''un pot… en grammes (facultatif)';
COMMENT ON COLUMN marmicout_products.density_g_per_ml IS 'Densité en grammes par millilitre (facultatif, ex: 1 pour l''eau, 0.92 pour l''huile)';
