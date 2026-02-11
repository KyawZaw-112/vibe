import type { AuthError, SupabaseClient } from '@supabase/supabase-js';

export type AdminCheckResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      reason: 'NOT_AUTHENTICATED' | 'NOT_ADMIN' | 'QUERY_ERROR';
      error?: string;
    };

export type AdminSignInResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; reason: 'AUTH_ERROR' | 'NOT_ADMIN' | 'QUERY_ERROR' };

/**
 * Uses RPC `is_admin(uuid)` to avoid selecting missing columns like role/is_active.
 */
export async function checkAdminAccess(
  supabase: SupabaseClient,
): Promise<AdminCheckResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false, reason: 'QUERY_ERROR', error: userError.message };
  }

  if (!user) {
    return { ok: false, reason: 'NOT_AUTHENTICATED' };
  }

  const { data, error } = await supabase.rpc('is_admin', { p_user_id: user.id });

  if (error) {
    return { ok: false, reason: 'QUERY_ERROR', error: error.message };
  }

  if (!data) {
    return { ok: false, reason: 'NOT_ADMIN' };
  }

  return { ok: true, userId: user.id };
}

/**
 * Full admin sign-in flow:
 * 1) email/password sign-in
 * 2) verify admin row exists via RPC
 * 3) auto sign-out when user is not admin
 */
export async function signInAsAdmin(
  supabase: SupabaseClient,
  params: { email: string; password: string },
): Promise<AdminSignInResult> {
  const { error: signInError } = await supabase.auth.signInWithPassword(params);

  if (signInError) {
    return formatAuthError(signInError);
  }

  const adminAccess = await checkAdminAccess(supabase);

  if (!adminAccess.ok) {
    await supabase.auth.signOut();

    if (adminAccess.reason === 'NOT_ADMIN') {
      return {
        ok: false,
        reason: 'NOT_ADMIN',
        error: 'You do not have admin access',
      };
    }

    return {
      ok: false,
      reason: 'QUERY_ERROR',
      error: adminAccess.error ?? 'Unable to verify admin access',
    };
  }

  return { ok: true, userId: adminAccess.userId };
}

function formatAuthError(error: AuthError): AdminSignInResult {
  return {
    ok: false,
    reason: 'AUTH_ERROR',
    error: error.message,
  };
}
