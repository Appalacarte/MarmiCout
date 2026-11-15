import { createClient } from '@supabase/supabase-js';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined;
const nodeEnv = typeof globalThis !== 'undefined' && 'process' in globalThis
  ? (globalThis as { process?: { env?: Record<string, string> } }).process?.env
  : undefined;

const SUPABASE_URL = metaEnv?.VITE_SUPABASE_URL || nodeEnv?.VITE_SUPABASE_URL || 'https://cyumdcuqgsmxgbodfrhs.supabase.co';
const SUPABASE_ANON_KEY = metaEnv?.VITE_SUPABASE_ANON_KEY || nodeEnv?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qDlFO1FgCcTuN4a4RIK2zQ_NvUiIPuB';

// Configuration du client Supabase Marmicout
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // La session est échangée côté serveur via jeton signé à usage unique (/api/auth/sso-exchange)
    storageKey: 'marmicout_supabase_auth_token',
  },
});

// Helper pour récupérer le jeton JWT courant
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
