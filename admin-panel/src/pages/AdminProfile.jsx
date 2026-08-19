import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, KeyRound, Mail, Pencil, ShieldCheck, Trash2, User, X, XCircle } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';
import { useAdminAuth } from '../context/AdminAuthContext';

const initialProfile = { name: '', email: '', role: '', isActive: true, lastLoginAt: null, createdAt: null };
const initialPassword = { currentPassword: '', newPassword: '', confirmPassword: '' };

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available';
}

function StatusMessage({ message, tone }) {
  if (!message) return null;
  const isError = tone === 'error';
  return (
    <div className={`flex items-start gap-2 border px-3 py-2.5 text-sm ${isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role={isError ? 'alert' : 'status'}>
      {isError ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

function Field({ label, icon: Icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#374151]">{label}</span>
      <span className="relative block">
        <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          {...props}
          className="w-full border border-[#EBC2AE] bg-[#FFF9F5] py-2.5 pl-9 pr-3 text-sm text-[#1D181A] outline-none transition focus:border-[#C75560] focus:ring-2 focus:ring-[#C75560]/15 disabled:cursor-not-allowed disabled:bg-[#F7F8FA] disabled:text-[#80576A]"
        />
      </span>
    </label>
  );
}

function CropDialog({ source, onCancel, onComplete }) {
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const cropSize = 280;

  function handleImageLoad() {
    const image = imageRef.current;
    const scale = Math.max(cropSize / image.naturalWidth, cropSize / image.naturalHeight);
    setImageSize({ width: image.naturalWidth * scale, height: image.naturalHeight * scale, scale });
    setPosition({ x: (cropSize - image.naturalWidth * scale) / 2, y: (cropSize - image.naturalHeight * scale) / 2 });
  }

  function moveImage(event) {
    if (!dragRef.current) return;
    const next = { x: event.clientX - dragRef.current.startX + dragRef.current.x, y: event.clientY - dragRef.current.startY + dragRef.current.y };
    setPosition(next);
  }

  function stopDragging() {
    dragRef.current = null;
    window.removeEventListener('pointermove', moveImage);
    window.removeEventListener('pointerup', stopDragging);
  }

  function startDragging(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, x: position.x, y: position.y };
    window.addEventListener('pointermove', moveImage);
    window.addEventListener('pointerup', stopDragging);
  }

  function finishCrop() {
    const image = imageRef.current;
    if (!imageSize) return;
    const scaledWidth = imageSize.width * zoom;
    const scaledHeight = imageSize.height * zoom;
    const displayedX = (cropSize - scaledWidth) / 2 + (position.x - (cropSize - imageSize.width) / 2) * zoom;
    const displayedY = (cropSize - scaledHeight) / 2 + (position.y - (cropSize - imageSize.height) / 2) * zoom;
    const sourceSize = cropSize / (imageSize.scale * zoom);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    canvas.getContext('2d').drawImage(image, -displayedX / (imageSize.scale * zoom), -displayedY / (imageSize.scale * zoom), sourceSize, sourceSize, 0, 0, 512, 512);
    canvas.toBlob((blob) => onComplete(blob), 'image/jpeg', 0.88);
  }

  useEffect(() => () => stopDragging(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-label="Crop profile picture">
      <div className="w-full max-w-md border border-[#EBC2AE] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-[#1D181A]">Crop profile picture</h2><p className="mt-1 text-xs text-[#80576A]">Drag to reposition and use the slider to resize.</p></div><button type="button" onClick={onCancel} aria-label="Close crop dialog" className="text-[#80576A] hover:text-[#C75560]"><X size={18} /></button></div>
        <div className="mx-auto h-[280px] w-[280px] touch-none overflow-hidden bg-[#241A2E]" onPointerDown={startDragging}>
          <img ref={imageRef} src={source} alt="Crop preview" onLoad={handleImageLoad} draggable="false" className="pointer-events-none max-w-none select-none" style={imageSize ? { width: imageSize.width * zoom, height: imageSize.height * zoom, transform: `translate(${(cropSize - imageSize.width * zoom) / 2 + (position.x - (cropSize - imageSize.width) / 2) * zoom}px, ${(cropSize - imageSize.height * zoom) / 2 + (position.y - (cropSize - imageSize.height) / 2) * zoom}px)` } : undefined} />
        </div>
        <label className="mt-4 block text-xs font-semibold text-[#374151]">Resize<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-[#C75560]" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="border border-[#EBC2AE] px-3 py-2 text-sm font-semibold text-[#80576A]">Cancel</button><button type="button" onClick={finishCrop} disabled={!imageSize} className="bg-[#C75560] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Use photo</button></div>
      </div>
    </div>
  );
}

export default function AdminProfile() {
  const { admin, updateAdmin } = useAdminAuth();
  const [profile, setProfile] = useState(initialProfile);
  const [profileBeforeEdit, setProfileBeforeEdit] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState({ message: '', tone: '' });
  const [passwordStatus, setPasswordStatus] = useState({ message: '', tone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [password, setPassword] = useState(initialPassword);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [cropSource, setCropSource] = useState('');
  const [pictureSaving, setPictureSaving] = useState(false);
  const [pictureMenuOpen, setPictureMenuOpen] = useState(false);

  useEffect(() => {
    adminAxiosInstance.get('/auth/me')
      .then(({ data }) => {
        setProfile({
          name: data.name || '',
          email: data.email || '',
          role: data.role || '',
          isActive: data.isActive,
          lastLoginAt: data.lastLoginAt,
          createdAt: data.createdAt,
        });
        setProfileBeforeEdit(null);
        setProfilePictureUrl(data.profilePictureUrl || '');
      })
      .catch(() => setProfileStatus({ message: 'Unable to load your profile details.', tone: 'error' }));
  }, []);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileStatus({ message: '', tone: '' });
    setProfileSaving(true);
    try {
      const { data } = await adminAxiosInstance.patch('/auth/profile', { name: profile.name, email: profile.email });
      setProfile((current) => ({ ...current, name: data.name, email: data.email }));
      updateAdmin({ name: data.name, email: data.email });
      setProfileBeforeEdit(null);
      setIsEditingProfile(false);
      setProfileStatus({ message: 'Profile details updated successfully.', tone: 'success' });
    } catch (error) {
      setProfileStatus({ message: error.response?.data?.error || 'Unable to update profile details.', tone: 'error' });
    } finally {
      setProfileSaving(false);
    }
  }

  function startEditingProfile() {
    setProfileBeforeEdit(profile);
    setProfileStatus({ message: '', tone: '' });
    setIsEditingProfile(true);
  }

  function cancelEditingProfile() {
    if (profileBeforeEdit) setProfile(profileBeforeEdit);
    setProfileBeforeEdit(null);
    setProfileStatus({ message: '', tone: '' });
    setIsEditingProfile(false);
  }

  function chooseProfilePicture(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileStatus({ message: 'Choose a JPG, PNG, or WEBP image up to 5 MB.', tone: 'error' });
      return;
    }
    setCropSource(URL.createObjectURL(file));
  }

  async function saveProfilePicture(blob) {
    setCropSource('');
    setPictureSaving(true);
    const formData = new FormData();
    formData.append('profilePicture', blob, 'admin-profile.jpg');
    try {
      const { data } = await adminAxiosInstance.post('/auth/profile-picture', formData);
      setProfilePictureUrl(data.profilePictureUrl);
      updateAdmin({ profilePictureUrl: data.profilePictureUrl });
      setProfileStatus({ message: 'Profile picture updated successfully.', tone: 'success' });
    } catch (error) {
      setProfileStatus({ message: error.response?.data?.error || 'Unable to upload profile picture.', tone: 'error' });
    } finally {
      setPictureSaving(false);
    }
  }

  async function removeProfilePicture() {
    setPictureMenuOpen(false);
    setPictureSaving(true);
    try {
      await adminAxiosInstance.delete('/auth/profile-picture');
      setProfilePictureUrl('');
      updateAdmin({ profilePictureUrl: '' });
      setProfileStatus({ message: 'Profile picture removed successfully.', tone: 'success' });
    } catch (error) {
      setProfileStatus({ message: error.response?.data?.error || 'Unable to remove profile picture.', tone: 'error' });
    } finally {
      setPictureSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordStatus({ message: '', tone: '' });
    if (password.newPassword !== password.confirmPassword) {
      setPasswordStatus({ message: 'New passwords do not match.', tone: 'error' });
      return;
    }
    setPasswordSaving(true);
    try {
      const { data } = await adminAxiosInstance.patch('/auth/password', {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword(initialPassword);
      setPasswordStatus({ message: data.message || 'Password updated successfully.', tone: 'success' });
    } catch (error) {
      setPasswordStatus({ message: error.response?.data?.error || 'Unable to update password.', tone: 'error' });
    } finally {
      setPasswordSaving(false);
    }
  }

  const displayName = profile.name || admin?.name || 'Admin User';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AU';

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C75560]">Account</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1D181A]">Admin profile</h1>
        <p className="mt-1 text-sm text-[#80576A]">Manage your account details and sign-in security.</p>
      </div>

      <section className="flex flex-col gap-4 border border-[#EBC2AE] bg-[#FFF9F5] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full bg-[#C75560] text-lg font-bold text-white">{profilePictureUrl ? <img src={profilePictureUrl} alt="Admin profile" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center">{initials}</span>}</div>
            <button type="button" onClick={() => setPictureMenuOpen((current) => !current)} disabled={pictureSaving} aria-label="Manage profile picture" className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#FFF9F5] bg-[#C75560] text-white shadow-sm hover:bg-[#A0182C] disabled:opacity-60"><Camera size={12} /></button>
            {pictureMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-36 border border-[#EBC2AE] bg-white p-1.5 shadow-lg">
                <label className="flex cursor-pointer items-center gap-2 px-2 py-2 text-xs font-semibold text-[#80576A] hover:bg-[#FFF0E8]"><Camera size={14} /> Update photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setPictureMenuOpen(false); chooseProfilePicture(event); }} disabled={pictureSaving} className="sr-only" /></label>
                {profilePictureUrl && <button type="button" onClick={removeProfilePicture} className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 size={14} /> Remove photo</button>}
              </div>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-[#1D181A]">{displayName}</p>
            <p className="text-sm text-[#80576A]">{profile.email || 'Loading email...'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 border border-[#EBC2AE] bg-white px-2.5 py-1.5 text-[#80576A]"><ShieldCheck size={14} /> {profile.role || admin?.role || 'admin'}</span>
          <span className={`border px-2.5 py-1.5 ${profile.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{profile.isActive ? 'Active account' : 'Inactive account'}</span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="border border-[#EBC2AE] bg-white p-4 sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF0E8] text-[#C75560]"><User size={17} /></div>
            <div><h2 className="font-semibold text-[#1D181A]">Personal details</h2><p className="mt-0.5 text-xs text-[#80576A]">These details are used for your admin account.</p></div>
            </div>
            {!isEditingProfile && <button type="button" onClick={startEditingProfile} aria-label="Edit personal details" title="Edit personal details" className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#EBC2AE] text-[#C75560] transition hover:bg-[#FFF0E8]"><Pencil size={16} /></button>}
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Field label="Full name" icon={User} value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} autoComplete="name" required disabled={!isEditingProfile} />
            <Field label="Email address" icon={Mail} type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} autoComplete="email" required disabled={!isEditingProfile} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div><span className="mb-1.5 block text-xs font-semibold text-[#374151]">Role</span><p className="border border-[#EBC2AE] bg-[#F7F8FA] px-3 py-2.5 text-sm capitalize text-[#80576A]">{profile.role || 'Loading...'}</p></div>
              <div><span className="mb-1.5 block text-xs font-semibold text-[#374151]">Account created</span><p className="border border-[#EBC2AE] bg-[#F7F8FA] px-3 py-2.5 text-sm text-[#80576A]">{formatDate(profile.createdAt)}</p></div>
            </div>
            <StatusMessage {...profileStatus} />
            {isEditingProfile && <div className="flex gap-2"><button type="submit" disabled={profileSaving} className="border-2 border-[#C75560] px-4 py-2.5 text-sm font-bold text-[#C75560] transition hover:bg-[#C75560] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{profileSaving ? 'Saving...' : 'Save profile'}</button><button type="button" onClick={cancelEditingProfile} disabled={profileSaving} className="border border-[#EBC2AE] px-4 py-2.5 text-sm font-semibold text-[#80576A] transition hover:bg-[#FFF0E8] disabled:cursor-not-allowed disabled:opacity-60">Cancel</button></div>}
          </form>
        </section>

        <section className="border border-[#EBC2AE] bg-white p-4 sm:p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF0E8] text-[#C75560]"><KeyRound size={17} /></div>
            <div><h2 className="font-semibold text-[#1D181A]">Change password</h2><p className="mt-0.5 text-xs text-[#80576A]">Use at least 12 characters, one uppercase letter and one number.</p></div>
          </div>
          <form onSubmit={handlePasswordSubmit} autoComplete="off" className="space-y-4">
            <Field label="Current password" icon={KeyRound} type="password" value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} autoComplete="off" required />
            <Field label="New password" icon={KeyRound} type="password" value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} autoComplete="new-password" minLength={12} required />
            <Field label="Confirm new password" icon={KeyRound} type="password" value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} autoComplete="new-password" minLength={12} required />
            <StatusMessage {...passwordStatus} />
            <button type="submit" disabled={passwordSaving} className="border-2 border-[#5B3A52] px-4 py-2.5 text-sm font-bold text-[#5B3A52] transition hover:bg-[#5B3A52] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{passwordSaving ? 'Updating...' : 'Update password'}</button>
          </form>
        </section>
      </div>

      {cropSource && <CropDialog source={cropSource} onCancel={() => { URL.revokeObjectURL(cropSource); setCropSource(''); }} onComplete={(blob) => { URL.revokeObjectURL(cropSource); saveProfilePicture(blob); }} />}
    </div>
  );
}
