import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { signOutAction } from '../../actions/auth-actions';

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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile from the database directly
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile && profile.profile_completed === false) {
    redirect('/complete-profile');
  }

  const userTypeLabel =
    profile?.user_type === 'book_buyer' ? 'Book Buyer (Per-puzzle + Grand Prize)' : 'Free Player (Grand Prize Only)';

  const proofStatusColor =
    profile?.proof_status === 'verified'
      ? 'bg-emerald-100 text-emerald-800'
      : profile?.proof_status === 'rejected'
      ? 'bg-rose-100 text-rose-800'
      : profile?.proof_status === 'pending'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-slate-100 text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-lg text-slate-900 tracking-tight">
            Sudoku Contest
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Log Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Logged in as {user.email}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome to your contest dashboard. Puzzle submission and proof upload features will be unlocked here in the next steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Display Name
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">
                {profile?.display_name || user.email}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Player Type
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {userTypeLabel}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Proof of Purchase Status
              </div>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider ${proofStatusColor}`}>
                  {profile?.proof_status || 'none'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

