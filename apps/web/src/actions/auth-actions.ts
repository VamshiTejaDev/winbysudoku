'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';
import {
  checkSignupRateLimit,
  checkLoginRateLimit,
  checkPasswordResetRateLimit,
} from '../lib/rate-limit';
import { isAgeCheckRequired } from '../lib/settings';

/**
 * ==============================================================================
 * CRITICAL SECURITY ARCHITECTURE NOTE:
 * ==============================================================================
 * Any subsequent server routes or server actions handling puzzle submissions,
 * proof of purchase uploads, or prize declarations MUST independently re-query
 * and re-verify the user's 'user_type' and 'is_age_confirmed' directly from the
 * 'public.profiles' table using the authenticated user's ID (auth.uid()).
 * Never trust client-provided claims or session tokens for authorization decisions.
 * ==============================================================================
 */

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

function getClientIp(): string {
  const headerList = headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = headerList.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

function getOrigin(): string {
  const headerList = headers();
  const host = headerList.get('host') || 'localhost:3000';
  const proto = headerList.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = (formData.get('password') as string || '');
  const displayName = (formData.get('displayName') as string || '').trim();
  const userType = formData.get('userType') as string;
  const isAgeConfirmed = formData.get('isAgeConfirmed') === 'true';
  const captchaToken = (formData.get('captchaToken') as string || '').trim();

  // 1. Server validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  if (!displayName || displayName.length < 2) {
    return { success: false, error: 'Please enter a display name (at least 2 characters).' };
  }

  if (userType !== 'book_buyer' && userType !== 'free_player') {
    return { success: false, error: "Please select whether you bought the book or want to play free." };
  }

  const ageRequired = await isAgeCheckRequired();
  if (ageRequired && !isAgeConfirmed) {
    return { success: false, error: 'You must confirm that you are 18 years or older to participate.' };
  }

  // 2. Server-side Rate Limiting (Upstash Redis with sliding window)
  const clientIp = getClientIp();
  const rateLimit = await checkSignupRateLimit(clientIp, email);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  // 3. Supabase Auth signup
  const supabase = await createClient();
  const origin = getOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        user_type: userType,
        is_age_confirmed: isAgeConfirmed,
      },
      emailRedirectTo: `${origin}/auth/callback`,
      captchaToken: captchaToken || undefined,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please log in instead.',
      };
    }
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: `Account created! We've sent a confirmation link to ${email}. Please check your inbox and click the link to activate your account.`,
  };
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = (formData.get('password') as string || '');
  const captchaToken = (formData.get('captchaToken') as string || '').trim();

  if (!email || !password) {
    return { success: false, error: 'Please enter both your email and password.' };
  }

  // Server-side Rate Limiting
  const clientIp = getClientIp();
  const rateLimit = await checkLoginRateLimit(clientIp, email);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken: captchaToken || undefined,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return {
        success: false,
        error: 'Please verify your email address before logging in. Check your inbox for the confirmation link.',
      };
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return {
        success: false,
        error: 'Invalid email or password. Please double-check your credentials and try again.',
      };
    }
    return { success: false, error: error.message };
  }

  // Check if profile is complete
  if (data?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_completed')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile || profile.profile_completed === false) {
      redirect('/complete-profile');
    }
  }

  redirect('/dashboard');
}

export async function forgotPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const captchaToken = (formData.get('captchaToken') as string || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // Server-side Rate Limiting
  const clientIp = getClientIp();
  const rateLimit = await checkPasswordResetRateLimit(clientIp, email);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  const supabase = await createClient();
  const origin = getOrigin();

  // Route through /auth/callback?next=/reset-password so Supabase's default ?code= link is exchanged properly
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
    captchaToken: captchaToken || undefined,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: 'If an account exists with this email, we have sent a password reset link. Please check your inbox.',
  };
}

export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const password = (formData.get('password') as string || '');
  const confirmPassword = (formData.get('confirmPassword') as string || '');

  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      success: false,
      error: `${error.message}. Please note: Password reset links must be opened in the same browser where they were requested.`,
    };
  }

  return {
    success: true,
    message: 'Your password has been successfully updated! You can now access your account.',
  };
}

/**
 * Server action to complete profile (used after Google OAuth first sign-in).
 * Sets display_name, user_type, is_age_confirmed, and locks them by setting profile_completed = true.
 */
export async function completeProfileAction(formData: FormData): Promise<AuthActionResult> {
  const displayName = (formData.get('displayName') as string || '').trim();
  const userType = formData.get('userType') as string;
  const isAgeConfirmed = formData.get('isAgeConfirmed') === 'true';

  if (!displayName || displayName.length < 2) {
    return { success: false, error: 'Please enter a display name (at least 2 characters).' };
  }

  if (userType !== 'book_buyer' && userType !== 'free_player') {
    return { success: false, error: 'Please choose whether you bought the book or want to play free.' };
  }

  const ageRequired = await isAgeCheckRequired();
  if (ageRequired && !isAgeConfirmed) {
    return { success: false, error: 'You must confirm that you are 18 years or older to participate.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to complete your profile.' };
  }

  // Update profile and mark completed.
  // The PostgreSQL trigger protect_profile_status_columns ensures user_type can ONLY be set
  // while profile_completed is false, and once true, it is permanently locked.
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      user_type: userType,
      is_age_confirmed: isAgeConfirmed,
      profile_completed: true,
    })
    .eq('id', user.id)
    .eq('profile_completed', false);

  if (error) {
    return { success: false, error: error.message };
  }

  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
