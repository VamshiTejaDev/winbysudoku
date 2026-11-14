import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/**
 * Token Hash Email Confirmation Route Handler.
 * Uses verifyOtp with token_hash instead of PKCE code exchange.
 * This guarantees the confirmation works reliably even when the user opens
 * the email on mobile, inside an in-app browser (Gmail, Outlook, WhatsApp),
 * or in a different browser than where they registered.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');
  redirectTo.searchParams.delete('next');

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Successfully confirmed; redirect to the requested destination (e.g. /dashboard or /reset-password)
      return NextResponse.redirect(redirectTo);
    }

    console.error('Email verification error:', error.message);
  }

  // If token is missing, expired, or invalid, redirect to login with error explanation
  redirectTo.pathname = '/login';
  redirectTo.searchParams.set(
    'error',
    'The confirmation link is invalid or has expired. Please note: For security, confirmation and password reset links must be opened in the same browser where they were requested.'
  );
  return NextResponse.redirect(redirectTo);
}

