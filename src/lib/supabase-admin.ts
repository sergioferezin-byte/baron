import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

// Admin client: service role ONLY. Falling back to the anon key would silently
// break admin operations (createUser, listUsers) with confusing 401/403 errors.
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (!supabaseAdmin) {
  if (supabaseUrl && !supabaseServiceRoleKey) {
    console.error(
      "[Supabase Server] SUPABASE_SERVICE_ROLE_KEY está AUSENTE. " +
      "Sem ela, usuários NÃO serão criados no Supabase Auth (Authentication). " +
      "Copie a service_role key em Supabase > Project Settings > API e defina no ambiente."
    );
  } else {
    console.warn(
      "[Supabase Server] SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas. " +
      "Autenticação Supabase desativada; usando modo local."
    );
  }
}

// Separate client for password sign-ins. Never sign in with the admin client:
// it would replace the service-role Authorization header with the user's token.
export function createSupabaseAuthClient() {
  const key = supabaseAnonKey || supabaseServiceRoleKey;
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
