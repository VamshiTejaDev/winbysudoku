import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { isAgeCheckRequired } from '../../../lib/settings';
import { CompleteProfileForm } from './CompleteProfileForm';

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if profile is already completed
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_completed, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.profile_completed === true) {
    redirect('/dashboard');
  }

  const ageRequired = await isAgeCheckRequired();
  const defaultDisplayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    '';

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full mb-3 text-xl font-bold">
            👤
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Complete Your Profile</h1>
          <p className="text-sm text-slate-600 mt-1">
            Just a couple of details before you begin the Sudoku challenge
          </p>
        </div>

        <CompleteProfileForm
          initialDisplayName={defaultDisplayName}
          ageRequired={ageRequired}
        />
      </div>
    </main>
  );
}

