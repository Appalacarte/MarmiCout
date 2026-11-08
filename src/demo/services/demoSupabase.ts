/**
 * Client Supabase Démo (Optionnel)
 * Utilisé si VITE_DEMO_SUPABASE_URL et VITE_DEMO_SUPABASE_ANON_KEY sont définis.
 * Par défaut, le mode démo utilise le stockage local autonome (zéro latence, 100% sécurisé).
 */

export const DEMO_SUPABASE_CONFIG = {
  url: import.meta.env.VITE_DEMO_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(
    import.meta.env.VITE_DEMO_SUPABASE_URL && 
    import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY
  )
};
