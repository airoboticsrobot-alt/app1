import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userProfile, updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateDisplayName(displayName);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500">Manage platform configurations and database parameters.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Your Profile</h2>
          <p className="mt-1 text-xs text-slate-500">Update the display name associated with your signed-in account.</p>
          <form onSubmit={handleSaveProfile} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-semibold text-slate-700">
              Display name
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={saving || displayName.trim() === userProfile?.displayName}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          {saved && <p role="status" className="mt-3 text-sm text-emerald-700">Profile updated.</p>}
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" /> School Information
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <span className="text-slate-400 uppercase font-semibold">Institution Name</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">GEMS Modern School</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <span className="text-slate-400 uppercase font-semibold">Academic Session</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">Not configured</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <span className="text-slate-400 uppercase font-semibold">Administrator Email</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{userProfile?.email || 'Unavailable'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <span className="text-slate-400 uppercase font-semibold">System Timezone</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">Asia/Kolkata (IST +5:30)</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
