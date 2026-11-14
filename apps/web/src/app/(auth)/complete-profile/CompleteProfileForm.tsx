'use client';

import { useState } from 'react';
import { completeProfileAction } from '../../../actions/auth-actions';

interface CompleteProfileFormProps {
  initialDisplayName: string;
  ageRequired: boolean;
}

export function CompleteProfileForm({ initialDisplayName, ageRequired }: CompleteProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [userType, setUserType] = useState<'book_buyer' | 'free_player'>('book_buyer');
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMessage('Please enter a display name (at least 2 characters).');
      return;
    }

    if (ageRequired && !isAgeConfirmed) {
      setErrorMessage('Please confirm that you are 18 years or older to participate.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('displayName', displayName.trim());
    formData.append('userType', userType);
    formData.append('isAgeConfirmed', isAgeConfirmed ? 'true' : 'false');

    try {
      const res = await completeProfileAction(formData);
      if (res && !res.success) {
        setErrorMessage(res.error || 'Failed to complete profile.');
      }
    } catch {
      // In Next.js, redirect() will automatically handle navigation
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg p-3.5 leading-snug">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
          Display Name
        </label>
        <input
          type="text"
          required
          minLength={2}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. SudokuPlayer"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
          Participation Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setUserType('book_buyer')}
            className={`p-3.5 rounded-xl border text-left transition ${
              userType === 'book_buyer'
                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <div className="font-semibold text-sm text-slate-900">I bought the book</div>
            <div className="text-xs text-slate-500 mt-1 leading-snug">
              Eligible for $1,000 per-puzzle prizes & $1 billion grand prize
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUserType('free_player')}
            className={`p-3.5 rounded-xl border text-left transition ${
              userType === 'free_player'
                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <div className="font-semibold text-sm text-slate-900">Play free</div>
            <div className="text-xs text-slate-500 mt-1 leading-snug">
              Eligible for grand prize only (free puzzles)
            </div>
          </button>
        </div>
      </div>

      {/* Conditionally rendered age check based on settings */}
      {ageRequired && (
        <div className="flex items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            id="completeAgeCheck"
            checked={isAgeConfirmed}
            onChange={(e) => setIsAgeConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label
            htmlFor="completeAgeCheck"
            className="text-xs text-slate-700 leading-snug cursor-pointer select-none"
          >
            I confirm that I am <strong>18 years of age or older</strong>.
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-lg shadow-sm transition"
      >
        {loading ? 'Saving Profile...' : 'Save & Continue to Dashboard'}
      </button>
    </form>
  );
}

