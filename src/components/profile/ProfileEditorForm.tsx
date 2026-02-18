'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, Save, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { buildImageCropStyle, resolveImageCrop } from '@/utils/imageCrop';

export type EditableProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_zoom: number | null;
  avatar_focus_x: number | null;
  avatar_focus_y: number | null;
  gender: string | null;
  bio: string | null;
  birthdate: string | null;
  onboarding_completed: boolean;
};

type ProfileEditorFormProps = {
  profile: EditableProfile;
  title?: string;
  description?: string;
  submitLabel?: string;
  markOnboardingComplete?: boolean;
  onSaved?: (profile: EditableProfile) => void;
};

type SavedProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_zoom: number | null;
  avatar_focus_x: number | null;
  avatar_focus_y: number | null;
  gender: string | null;
  bio: string | null;
  birthdate: string | null;
  onboarding_completed: boolean;
};

function extractProfileAvatarPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/profile-avatars/';
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex < 0) return null;

    const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    return path || null;
  } catch {
    return null;
  }
}

function buildDisplayName(firstName: string, lastName: string, fallbackEmail: string | null) {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (full) return full;
  if (fallbackEmail) return fallbackEmail.split('@')[0] || 'Family Member';
  return 'Family Member';
}

export function ProfileEditorForm({
  profile,
  title = 'Profile Details',
  description = 'Update your personal information.',
  submitLabel = 'Save Profile',
  markOnboardingComplete = false,
  onSaved,
}: ProfileEditorFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile.first_name || '');
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [birthdate, setBirthdate] = useState(profile.birthdate || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const initialAvatarCrop = resolveImageCrop(
    {
      zoom: profile.avatar_zoom,
      focusX: profile.avatar_focus_x,
      focusY: profile.avatar_focus_y,
    },
    { minZoom: 1, maxZoom: 3 }
  );
  const [avatarZoom, setAvatarZoom] = useState(initialAvatarCrop.zoom);
  const [avatarFocusX, setAvatarFocusX] = useState(initialAvatarCrop.focusX);
  const [avatarFocusY, setAvatarFocusY] = useState(initialAvatarCrop.focusY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initials = `${firstName.trim()[0] || ''}${lastName.trim()[0] || ''}`.trim();

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarZoom(1);
    setAvatarFocusX(50);
    setAvatarFocusY(50);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName) {
      setError('First name is required.');
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== profile.id) {
      setSaving(false);
      setError('Sign in again to update your profile.');
      return;
    }

    const previousAvatarPath = avatarUrl ? extractProfileAvatarPath(avatarUrl) : null;
    let nextAvatarUrl = avatarUrl;
    const normalizedAvatarCrop = resolveImageCrop(
      {
        zoom: avatarZoom,
        focusX: avatarFocusX,
        focusY: avatarFocusY,
      },
      { minZoom: 1, maxZoom: 3 }
    );

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() || 'jpg';
      const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, avatarFile);

      if (uploadError) {
        setSaving(false);
        setError(`Avatar upload failed: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(path);
      nextAvatarUrl = publicUrlData.publicUrl;

      if (previousAvatarPath && previousAvatarPath !== path) {
        await supabase.storage.from('profile-avatars').remove([previousAvatarPath]);
      }
    }

    const displayName = buildDisplayName(trimmedFirstName, trimmedLastName, profile.email);

    const updates = {
      first_name: trimmedFirstName,
      last_name: trimmedLastName || null,
      display_name: displayName,
      gender: gender || null,
      birthdate: birthdate || null,
      bio: bio.trim() || null,
      avatar_url: nextAvatarUrl,
      avatar_zoom: normalizedAvatarCrop.zoom,
      avatar_focus_x: normalizedAvatarCrop.focusX,
      avatar_focus_y: normalizedAvatarCrop.focusY,
      onboarding_completed:
        markOnboardingComplete || profile.onboarding_completed,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select(
        'id,email,first_name,last_name,display_name,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y,gender,bio,birthdate,onboarding_completed'
      )
      .single();

    if (updateError || !updatedProfile) {
      setSaving(false);
      setError(updateError?.message || 'Could not update profile.');
      return;
    }

    await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        first_name: trimmedFirstName,
        last_name: trimmedLastName || null,
        avatar_url: nextAvatarUrl,
        avatar_zoom: normalizedAvatarCrop.zoom,
        avatar_focus_x: normalizedAvatarCrop.focusX,
        avatar_focus_y: normalizedAvatarCrop.focusY,
      },
    });

    const nextProfile = updatedProfile as SavedProfileRow;
    setAvatarUrl(nextProfile.avatar_url);
    setAvatarPreview(nextProfile.avatar_url);
    setAvatarZoom(nextProfile.avatar_zoom ?? normalizedAvatarCrop.zoom);
    setAvatarFocusX(nextProfile.avatar_focus_x ?? normalizedAvatarCrop.focusX);
    setAvatarFocusY(nextProfile.avatar_focus_y ?? normalizedAvatarCrop.focusY);
    setAvatarFile(null);
    setSuccess('Profile updated.');
    setSaving(false);

    onSaved?.(nextProfile);
    if (!onSaved) {
      router.refresh();
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-stone/35 bg-white/78 p-5 md:p-6"
    >
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-earth tracking-tight">{title}</h2>
        <p className="text-sm text-bark/55 mt-1">{description}</p>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-20 h-20 shrink-0 aspect-square rounded-full overflow-hidden border-2 border-leaf/70 shadow-sm">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Profile"
              className="w-full h-full object-cover"
              style={buildImageCropStyle(
                {
                  zoom: avatarZoom,
                  focusX: avatarFocusX,
                  focusY: avatarFocusY,
                },
                { minZoom: 1, maxZoom: 3 }
              )}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-moss to-leaf text-white flex items-center justify-center text-2xl font-semibold">
              {initials || <Camera className="w-6 h-6" />}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone/45 text-sm text-earth hover:bg-stone/30 transition-colors"
          >
            <Upload className="w-4 h-4 text-moss" />
            Upload photo
          </button>
          <p className="text-xs text-bark/45">PNG or JPG recommended.</p>
          {avatarPreview ? (
            <div className="pt-1 space-y-1.5 min-w-[220px]">
              <label className="text-[11px] text-bark/55 flex items-center gap-2">
                <span className="w-8 shrink-0">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={avatarZoom}
                  onChange={(event) => setAvatarZoom(Number(event.target.value))}
                  className="flex-1 accent-moss"
                />
                <span className="w-10 text-right tabular-nums text-bark/45">
                  {avatarZoom.toFixed(2)}x
                </span>
              </label>
              <label className="text-[11px] text-bark/55 flex items-center gap-2">
                <span className="w-8 shrink-0">X</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={avatarFocusX}
                  onChange={(event) => setAvatarFocusX(Number(event.target.value))}
                  className="flex-1 accent-moss"
                />
                <span className="w-10 text-right tabular-nums text-bark/45">
                  {Math.round(avatarFocusX)}%
                </span>
              </label>
              <label className="text-[11px] text-bark/55 flex items-center gap-2">
                <span className="w-8 shrink-0">Y</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={avatarFocusY}
                  onChange={(event) => setAvatarFocusY(Number(event.target.value))}
                  className="flex-1 accent-moss"
                />
                <span className="w-10 text-right tabular-nums text-bark/45">
                  {Math.round(avatarFocusY)}%
                </span>
              </label>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-bark/55 mb-1">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-bark/55 mb-1">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-xs text-bark/55 mb-1">Gender</label>
          <select
            value={gender}
            onChange={(event) => setGender(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth bg-white"
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-bark/55 mb-1">Birth Date</label>
          <input
            type="date"
            value={birthdate}
            onChange={(event) => setBirthdate(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs text-bark/55 mb-1">About</label>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          placeholder="A short bio about you..."
          className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth resize-none"
        />
      </div>

      {error ? (
        <p className="text-sm text-error mt-3">{error}</p>
      ) : null}
      {success ? (
        <p className="text-sm text-moss mt-3">{success}</p>
      ) : null}

      <div className="mt-5">
        <button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-moss to-leaf text-white text-sm font-medium shadow-md disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}
