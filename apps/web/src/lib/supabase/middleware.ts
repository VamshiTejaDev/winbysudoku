import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Middleware session refresher.
 * Ensures the user's Supabase session cookies stay updated across page navigations,
 * redirects unauthenticated visitors away from protected routes, and enforces
 * the profile completion requirement before granting access to /dashboard.
 *
 * CRITICAL SECURITY ARCHITECTURE NOTE:
 * Subsequent server routes MUST independently query and re-verify 'user_type'
 * and 'is_age_confirmed' directly from the public.profiles database table.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /dashboard and /complete-profile from unauthenticated visitors
  if (!user && (pathname.startsWith('/dashboard') || pathname === '/complete-profile')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated, check their profile status
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_completed')
      .eq('id', user.id)
      .maybeSingle();

    const isCompleted = profile?.profile_completed === true;

    // Block /dashboard if profile is incomplete
    if (!isCompleted && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone();
      url.pathname = '/complete-profile';
      return NextResponse.redirect(url);
    }

    // If profile is already complete, prevent visiting /complete-profile again
    if (isCompleted && pathname === '/complete-profile') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // Redirect already logged-in users away from auth pages
    if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password') {
      const url = request.nextUrl.clone();
      url.pathname = isCompleted ? '/dashboard' : '/complete-profile';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
