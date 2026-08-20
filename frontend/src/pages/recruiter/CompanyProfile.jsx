import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import { FONT_DISPLAY } from '../../theme';
import {
  Building2,
  Save,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Mail,
  FileText,
  Landmark,
  ShieldCheck,
  CalendarClock,
  Calendar,
  MapPin,
  Edit2,
  X,
} from 'lucide-react';

function InfoInput({ value, onChange, placeholder }) {
  const inputRef = useRef(null);

  return (
    <input
      ref={inputRef}
      value={value ?? ''}
      onChange={(e) => {
        onChange(e.target.value);
        requestAnimationFrame(() => {
          const node = inputRef.current;
          if (!node) return;
          node.focus();
          const end = node.value.length;
          node.setSelectionRange(end, end);
        });
      }}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      className="w-full min-w-0 border-b border-dashed border-slate-300 bg-transparent pb-0.5 text-sm font-medium text-slate-900 outline-none focus:border-[#C75560]"
    />
  );
}

export default function RecruiterCompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyGst, setCompanyGst] = useState('');
  const [companyCin, setCompanyCin] = useState('');
  const [companyDetails, setCompanyDetails] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await axiosInstance.get('/recruiter/me/profile');
        setProfile(data);
        resetFields(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  function resetFields(data) {
    setCompanyName(data?.companyName || '');
    setCompanyWebsite(data?.companyWebsite || '');
    setCompanyEmail(data?.companyEmail || '');
    setCompanyGst(data?.companyGst || '');
    setCompanyCin(data?.companyCin || '');
    setCompanyDetails(data?.companyDetails || '');
    setCompanyLogoUrl(data?.companyLogoUrl || '');
    setIndustry(data?.industry || '');
    setCompanySize(data?.companySize || '');
    setCompanyType(data?.companyType || '');
    setLocation(data?.location || '');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      const payload = {
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim(),
        companyEmail: companyEmail.trim(),
        companyGst: companyGst.trim(),
        companyCin: companyCin.trim(),
        companyDetails: companyDetails.trim(),
        companyLogoUrl: companyLogoUrl.trim(),
        industry: industry.trim(),
        companySize: companySize.trim(),
        companyType: companyType.trim(),
        location: location.trim(),
      };
      const { data } = await axiosInstance.put('/recruiter/me/profile', payload);
      setProfile(data);
      resetFields(data);
      setEditMode(false);
      setStatusMessage('Company profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(''), 2500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  function handleCancel() {
    if (profile) {
      resetFields(profile);
    }
    setError('');
    setStatusMessage('');
    setEditMode(false);
  }

  const isSuspended = profile?.accountStatus === 'suspended';
  const registeredLabel = profile?.registeredAt ? new Date(profile.registeredAt).toLocaleDateString() : '—';
  const renewalLabel = profile?.renewalDueDate ? new Date(profile.renewalDueDate).toLocaleDateString() : '—';
  const lastUpdated = profile?.updatedAt || profile?.modifiedAt || profile?.registeredAt;
  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const completionPercentage = Math.min(
    100,
    Math.round(
      ([companyName, companyWebsite, companyEmail, companyDetails, companyGst, companyCin, companyLogoUrl, industry, companySize, companyType, location].filter(Boolean).length / 11) * 100
    )
  );

  return (
    <div className="min-h-screen bg-[#FFF8F2] text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
      <RecruiterNavbar />

      {statusMessage && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-white px-6 py-4 text-sm font-semibold text-emerald-800 shadow-xl shadow-emerald-900/10 animate-in fade-in zoom-in-95 duration-200">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> {statusMessage}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C75560]">Recruiter workspace</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1D181A]">Company profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              Keep your company branding, registration details, and public summary up to date. Candidates see this on every job listing.
            </p>
          </div>
          
        </div>

        {/* ---------------------------- UNIFIED PROFILE CARD ---------------------------- */}
        <section className="rounded-3xl border border-[#F3E4DC] bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-8">
          {editMode && (
            <div className="mb-4 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                aria-label="Cancel"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <X size={13} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 rounded-full bg-[#C75560] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#B44852] disabled:opacity-60"
              >
                <Save size={12} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
            {/* Avatar / logo */}
            <div className="relative mx-auto shrink-0 sm:mx-0">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#C75560]/60 bg-[#FFF1EB]">
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt="Company logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 size={40} className="text-[#C75560]/70" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                aria-label="Change company logo"
                className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#C75560] shadow-sm transition hover:bg-[#FFF1EB]"
              >
                <Camera size={16} />
              </button>
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-[#C75560] shadow-sm">
                {completionPercentage}%
              </span>
              {editMode && (
                <input
                  value={companyLogoUrl}
                  onChange={(e) => setCompanyLogoUrl(e.target.value)}
                  placeholder="Logo URL"
                  className="mt-6 w-32 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[11px] text-[#1D181A] outline-none focus:border-[#C75560] focus:bg-white"
                />
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {editMode ? (
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company name"
                    className="min-w-0 flex-1 border-b border-dashed border-slate-300 bg-transparent pb-1 text-2xl font-bold tracking-tight text-[#1D181A] outline-none focus:border-[#C75560] sm:text-3xl"
                  />
                ) : (
                  <>
                    <h2 className="text-2xl font-bold tracking-tight text-[#1D181A] sm:text-3xl">{companyName || 'Company name'}</h2>
                    <button
                      type="button"
                      onClick={() => setEditMode(true)}
                      aria-label="Edit company name"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1EB] text-[#C75560] transition hover:bg-[#F7D9D0]"
                    >
                      <Edit2 size={13} />
                    </button>
                  </>
                )}
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                Profile last updated - <span className="font-semibold text-slate-800">{updatedLabel}</span>
              </p>

              <div className="my-5 border-t border-slate-100" />

              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <Globe size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={companyWebsite} onChange={setCompanyWebsite} placeholder="https://acmetalent.com" />
                  ) : (
                    <span className={companyWebsite ? 'font-medium text-slate-900' : 'text-slate-400'}>
                      {companyWebsite || 'No website added yet'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Mail size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={companyEmail} onChange={setCompanyEmail} placeholder="hiring@acmetalent.com" />
                  ) : (
                    <>
                      <span className={companyEmail ? 'font-medium text-slate-900' : 'text-slate-400'}>
                        {companyEmail || 'No email on file'}
                      </span>
                      {companyEmail && <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <FileText size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={companyGst} onChange={setCompanyGst} placeholder="GST number" />
                  ) : (
                    <span className={companyGst ? 'font-medium text-slate-900' : 'text-slate-400'}>{companyGst || 'GST not provided'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Landmark size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={companyCin} onChange={setCompanyCin} placeholder="CIN" />
                  ) : (
                    <span className={companyCin ? 'font-medium text-slate-900' : 'text-slate-400'}>{companyCin || 'CIN not provided'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={industry} onChange={setIndustry} placeholder="Industry" />
                  ) : (
                    <span className={industry ? 'font-medium text-slate-900' : 'text-slate-400'}>{industry || 'Industry not provided'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Landmark size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={companySize} onChange={setCompanySize} placeholder="Company size" />
                  ) : (
                    <span className={companySize ? 'font-medium text-slate-900' : 'text-slate-400'}>{companySize || 'Size not provided'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <ShieldCheck size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={companyType} onChange={setCompanyType} placeholder="Company type" />
                  ) : (
                    <span className={companyType ? 'font-medium text-slate-900' : 'text-slate-400'}>{companyType || 'Type not provided'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <MapPin size={16} className="shrink-0 text-slate-400" />
                  {editMode ? (
                    <InfoInput value={location} onChange={setLocation} placeholder="Location" />
                  ) : (
                    <span className={location ? 'font-medium text-slate-900' : 'text-slate-400'}>{location || 'Location not provided'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <ShieldCheck size={16} className="shrink-0 text-slate-400" />
                  <span className={`font-semibold ${isSuspended ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isSuspended ? 'Suspended' : 'Active'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar size={16} className="shrink-0 text-slate-400" />
                  <span className="text-slate-700">Registered {registeredLabel}</span>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <CalendarClock size={16} className="shrink-0 text-[#C75560]" />
                  <span className="font-semibold text-[#C75560]">Renewal due {renewalLabel}</span>
                </div>
              </div>

              <div className="my-5 border-t border-slate-100" />

              {editMode ? (
                <div>
                  <textarea
                    value={companyDetails}
                    onChange={(e) => setCompanyDetails(e.target.value)}
                    placeholder="Write a short summary that candidates will see when browsing your jobs."
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-[#1D181A] outline-none transition focus:border-[#C75560] focus:bg-white"
                  />
                  <p className="mt-2 text-right text-xs text-slate-400">{companyDetails.length} characters</p>
                </div>
              ) : (
                <p className="text-sm leading-7 text-slate-700">
                  {companyDetails || <span className="text-slate-400">No description added yet. Click edit to share your company story.</span>}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---------------------------- SUCCESS CHECKLIST ---------------------------- */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/30">
          <p className="text-sm font-semibold text-[#1D181A]">Success checklist</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${companyDetails ? 'text-[#10B981]' : 'text-slate-300'}`} />
              <p>Complete your company description so candidates understand your business.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${companyLogoUrl ? 'text-[#10B981]' : 'text-slate-300'}`} />
              <p>Upload a branded logo and maintain consistent messaging across listings.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${companyGst && companyCin ? 'text-[#10B981]' : 'text-slate-300'}`} />
              <p>Add your GST and CIN so candidates can verify your registration.</p>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
              <p>Review your renewal date and keep your hiring team contact details current.</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle size={16} className="shrink-0" /> {error}
          </div>
        )}
      </main>
    </div>
  );
}