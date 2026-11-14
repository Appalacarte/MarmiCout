-- ==============================================================================
-- MIGRATION SUPABASE : Ajout de la colonne allergens dans marmicout_products
-- Date : 2026-11-14
-- Colonne facultative uniquement, aucune suppression ni renommage.
-- ==============================================================================

-- 1. marmicout_products (table principale / cloud)
ALTER TABLE IF EXISTS marmicout_products
  ADD COLUMN IF NOT EXISTS allergens TEXT[] NULL;

-- 2. demo_marmicout_products (table du mode démo si présente)
ALTER TABLE IF EXISTS demo_marmicout_products
  ADD COLUMN IF NOT EXISTS allergens TEXT[] NULL;

-- Commentaire documentaire
COMMENT ON COLUMN marmicout_products.allergens IS 'Liste des 14 allergènes à déclaration obligatoire en Europe (Règlement UE n° 1169/2011)';
