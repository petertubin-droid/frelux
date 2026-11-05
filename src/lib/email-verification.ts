/**
 * Email verification helpers for registration.
 *
 * Accounts are verified by email (Supabase Auth confirmation link) because
 * no SMS gateway is configured on this platform. These helpers only talk to
 * Supabase Auth; no edge function is required.
 */

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-lazy";

export interface EmailVerificationResult {
  success: boolean;
  message: string;
}

/** Re-send the sign up confirmation email for an account. */
export async function resendSignupConfirmation(
  email: string,
): Promise<EmailVerificationResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: "Email verification is not available in this environment.",
    };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { success: false, message: "No email address on this account." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: trimmed,
    options: {
      emailRedirectTo: `${window.location.origin}/login?redirect=/pro-connect/register`,
    },
  });
  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: `Confirmation email sent to ${trimmed}` };
}

/** Whether Supabase reports this user's email as confirmed. */
export function isEmailConfirmed(
  user: { email_confirmed_at?: string | null } | null | undefined,
): boolean {
  return Boolean(user?.email_confirmed_at);
}
