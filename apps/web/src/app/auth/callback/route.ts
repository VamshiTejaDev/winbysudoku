import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/**
 * OAuth & PKCE Code Exchange Callback Route.
 *
 * Handles:
 * 1. Google OAuth sign-in / sign-up code exchange.
 * 2. Password reset link code exchange (?code=...) from Supabase default email templates.
 * 3. Checks if user profile is completed. If not (first Google sign-in), redirects to /complete-profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const redirectTo = request.nextUrl.clone();
  redirectTo.searchParams.delete('code');
  redirectTo.searchParams.delete('next');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has completed their profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_completed')
          .eq('id', user.id)
          .maybeSingle();

        // If this is a password reset flow, take them directly to /reset-password
        if (next === '/reset-password') {
          redirectTo.pathname = '/reset-password';
          return NextResponse.redirect(redirectTo);
        }

        // If the profile is not yet completed (first Google sign-in), redirect to complete-profile
        if (!profile || profile.profile_completed === false) {
          redirectTo.pathname = '/complete-profile';
          return NextResponse.redirect(redirectTo);
        }
      }

      redirectTo.pathname = next;
      return NextResponse.redirect(redirectTo);
    }

    console.error('Code exchange error:', error.message);
  }

  // If exchange fails, redirect to login with a clear explanation
  redirectTo.pathname = '/login';
  redirectTo.searchParams.set(
    'error',
    'The link is invalid or has expired. Please note: For security, confirmation and password reset links must be opened in the same browser where they were requested.'
  );
  return NextResponse.redirect(redirectTo);
}

