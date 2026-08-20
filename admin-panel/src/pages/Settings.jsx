import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Sliders,
  Bell,
  Wallet,
  Flag,
  Lock,
  Camera,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Save,
  RefreshCcw,
  Download,
  AlertTriangle,
  Clock,
} from "lucide-react";
import adminAxiosInstance from "../api/adminAxiosInstance";

/* ---------------------------------------------
   Dummy fallback data (used if API call fails)
--------------------------------------------- */
const DUMMY_SETTINGS = {
  profile: {
    name: "",
    email: "",
    phone: "",
    avatar: null,
    twoFactor: false,
    sessions: [],
  },
  platform: {
    siteName: "HireLoop",
    logo: null,
    autoApproveJobs: false,
    maintenanceMode: false,
    emailVerificationRequired: true,
  },
  notifications: {
    newRecruiterSignup: true,
    jobFlagged: true,
    paymentFailed: true,
    lowWalletAlert: true,
    smsAlerts: false,
  },
  payments: {
    razorpayKeyMasked: "rzp_live_••••••••Xk92",
    candidateRegistrationFee: 9,
    recruiterRegistrationFee: 110,
    resumeDownloadCharge: 9,
    plans: [
      { id: 1, name: "Starter", price: 999, credits: 10 },
      { id: 2, name: "Growth", price: 2999, credits: 40 },
      { id: 3, name: "Enterprise", price: 7999, credits: 120 },
    ],
    gstEnabled: true,
  },
  moderation: {
    flaggedKeywords: ["work from home guaranteed", "no interview needed", "pay to apply"],
    autoSuspendThreshold: 5,
  },
  security: {
    sessionTimeout: null,
    ipWhitelist: [],
    auditLog: [],
  },
};

const TABS = [
  { key: "profile", label: "Profile & Account", icon: User },
  { key: "platform", label: "Platform Config", icon: Sliders },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "payments", label: "Payment & Finance", icon: Wallet },
  { key: "moderation", label: "Content Moderation", icon: Flag },
  { key: "security", label: "Security & Audit", icon: Lock },
];

/* ---------------------------------------------
   Reusable bits
--------------------------------------------- */
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#C75560]" : "bg-slate-200"
      }`}
    >
      <motion.span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#FFFDFB] px-3 py-2.5">
      <div>
        <p className="text-xs font-medium text-[#1D181A]">{title}</p>
        {description && <p className="mt-0.5 text-[11px] text-[#80576A]">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Card({ title, description, action, children }) {
  return (
    <div className="border border-[#EBC2AE] bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-semibold text-[#1D181A]">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-[#80576A]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3 space-y-2.5">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[#80576A]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-[#EBC2AE] bg-[#FFF4EF] px-2.5 py-1.5 text-xs text-[#1D181A] outline-none transition focus:border-[#C75560] focus:ring-2 focus:ring-[#C75560]/15 disabled:cursor-not-allowed disabled:bg-[#F7F8FA] disabled:text-[#80576A]"
      />
    </label>
  );
}

function ProfileDetail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#80576A]">{label}</p>
      <p className="mt-1 text-xs font-medium text-[#1D181A]">{value || "Not provided"}</p>
    </div>
  );
}

/* ---------------------------------------------
   Main component
--------------------------------------------- */
export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [settings, setSettings] = useState(DUMMY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [auditLoading, setAuditLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPlatformName, setIsEditingPlatformName] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(DUMMY_SETTINGS.profile.avatar);
  const [chargeModal, setChargeModal] = useState(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsResponse, profileResponse] = await Promise.all([
          adminAxiosInstance.get("/admin/settings"),
          adminAxiosInstance.get("/auth/me"),
        ]);
        const res = settingsResponse;
        const profile = profileResponse.data;
        setSettings((current) => ({
          ...current,
          profile: {
            ...current.profile,
            name: profile.name || current.profile.name,
            email: profile.email || current.profile.email,
            twoFactor: Boolean(profile.twoFactorEnabled),
          },
        }));
        setProfilePhoto(profile.profilePictureUrl || null);
        const saved = res.data?.settings;
        if (saved) {
          setSettings((current) => ({
            ...current,
            platform: {
              ...current.platform,
              siteName: saved.siteName,
              logo: saved.logo,
              autoApproveJobs: saved.autoApproveJobs,
              maintenanceMode: saved.maintenanceMode,
              emailVerificationRequired: saved.emailVerificationRequired,
            },
            payments: {
              ...current.payments,
              candidateRegistrationFee: saved.candidateRegistrationFee,
              recruiterRegistrationFee: saved.recruiterRegistrationFee,
              resumeDownloadCharge: saved.resumeDownloadCharge,
              gstEnabled: saved.gstEnabled !== false,
              gstRate: saved.gstRate || 18,
            },
            security: { ...current.security, sessionTimeout: saved.sessionTimeout },
            notifications: { ...current.notifications, ...(saved.notifications || {}) },
          }));
        }
        try {
          const { data } = await adminAxiosInstance.get("/admin/security/audit");
          setSettings((current) => ({
            ...current,
            security: {
              ...current.security,
              auditLog: (data.items || []).map((entry) => ({
                action: entry.action,
                by: entry.admin?.name || "Unknown admin",
                time: new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
              })),
            },
          }));
        } catch (error) {
          setProfileMessage(error.response?.data?.error || "Unable to load audit records.");
        } finally {
          setAuditLoading(false);
        }
        try {
          const { data } = await adminAxiosInstance.get("/auth/sessions");
          setSettings((current) => ({
            ...current,
            profile: { ...current.profile, sessions: data.sessions || [] },
          }));
        } catch (error) {
          setProfileMessage(error.response?.data?.error || "Unable to load active sessions.");
        } finally {
          setSessionsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load settings, using fallback:", err);
        setSettings(DUMMY_SETTINGS);
        setProfileMessage("Unable to load profile data.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateField = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSettingsMessage("");
    try {
      await adminAxiosInstance.put("/admin/settings", settings);
      setSettingsMessage("Settings saved successfully.");
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSettingsMessage(err.response?.data?.error || "Unable to save settings.");
    } finally {
      setTimeout(() => setSaving(false), 600);
    }
  };

  const updateNotificationSetting = async (field, value) => {
    const previousSettings = settings;
    const nextSettings = {
      ...settings,
      notifications: { ...settings.notifications, [field]: value },
    };
    setSettings(nextSettings);
    setSaving(true);
    setSettingsMessage("");
    try {
      await adminAxiosInstance.put("/admin/settings", nextSettings);
      setSettingsMessage("Notification setting saved.");
    } catch (err) {
      setSettings(previousSettings);
      setSettingsMessage(err.response?.data?.error || "Unable to save notification setting.");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const { data } = await adminAxiosInstance.patch("/auth/profile", {
        name: settings.profile.name,
        email: settings.profile.email,
      });
      setSettings((current) => ({ ...current, profile: { ...current.profile, name: data.name, email: data.email } }));
      if (passwordDraft.currentPassword || passwordDraft.newPassword) {
        await adminAxiosInstance.patch("/auth/password", passwordDraft);
        setPasswordDraft({ currentPassword: "", newPassword: "" });
      }
      setIsEditingProfile(false);
      setProfileMessage("Profile details saved successfully.");
    } catch (error) {
      setProfileMessage(error.response?.data?.error || "Unable to save profile details.");
    } finally {
      setProfileSaving(false);
    }
  };

  const updateTwoFactor = async (enabled) => {
    const previous = settings.profile.twoFactor;
    updateField("profile", "twoFactor", enabled);
    try {
      await adminAxiosInstance.patch("/auth/two-factor", { enabled });
    } catch (error) {
      updateField("profile", "twoFactor", previous);
      setProfileMessage(error.response?.data?.error || "Unable to update two-factor authentication.");
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await adminAxiosInstance.delete(`/auth/sessions/${sessionId}`);
      setSettings((current) => ({
        ...current,
        profile: { ...current.profile, sessions: current.profile.sessions.filter((session) => session.id !== sessionId) },
      }));
    } catch (error) {
      setProfileMessage(error.response?.data?.error || "Unable to revoke session.");
    }
  };

  const removeKeyword = (kw) => {
    updateField(
      "moderation",
      "flaggedKeywords",
      settings.moderation.flaggedKeywords.filter((k) => k !== kw)
    );
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    updateField("moderation", "flaggedKeywords", [...settings.moderation.flaggedKeywords, newKeyword.trim()]);
    setNewKeyword("");
  };

  const handlePlatformLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    const formData = new FormData();
    formData.append("logo", file);
    setSaving(true);
    adminAxiosInstance.post("/admin/settings/logo", formData)
      .then(({ data }) => updateField("platform", "logo", data.logo))
      .catch((error) => setProfileMessage(error.response?.data?.error || "Unable to upload platform logo."))
      .finally(() => setSaving(false));
  };

  const openChargeModal = (charge) => {
    setChargeModal(charge);
    setChargeAmount(String(settings.payments[charge.key] ?? ""));
  };

  const closeChargeModal = () => {
    setChargeModal(null);
    setChargeAmount("");
  };

  const updateCharge = () => {
    const amount = Number(chargeAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    updateField("payments", chargeModal.key, amount);
    closeChargeModal();
  };

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileMessage("Choose a JPG, PNG, or WEBP image up to 5 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("profilePicture", file);
    setProfileSaving(true);
    adminAxiosInstance.post("/auth/profile-picture", formData)
      .then(({ data }) => {
        setProfilePhoto(data.profilePictureUrl);
        setProfileMessage("Profile picture updated successfully.");
      })
      .catch((error) => setProfileMessage(error.response?.data?.error || "Unable to upload profile picture."))
      .finally(() => setProfileSaving(false));
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[#1D181A]">Settings</h1>
          <p className="mt-0.5 text-xs text-[#80576A]">Configure admin preferences and platform parameters.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-[#C75560] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#D9654A] disabled:opacity-60"
        >
          {saving ? <RefreshCcw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      {settingsMessage && <p className="text-right text-[11px] font-medium text-[#80576A]">{settingsMessage}</p>}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[190px_1fr]">
        {/* Tab rail */}
        <div className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex shrink-0 items-center gap-2 px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  isActive ? "text-white" : "text-[#80576A] hover:bg-[#FFF4EF]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-tab-pill"
                    className="absolute inset-0 bg-[#C75560]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              {/* ---------------- PROFILE ---------------- */}
              {activeTab === "profile" && (
                <>
                  <Card
                    title="Account details"
                    description="Manage your admin profile information."
                    action={
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile((current) => !current)}
                        className="flex items-center gap-1.5 border border-[#EBC2AE] px-2.5 py-1.5 text-[11px] font-semibold text-[#C75560] hover:bg-[#FFF4EF]"
                      >
                        <Pencil size={13} /> {isEditingProfile ? "Editing" : "Edit"}
                      </button>
                    }
                  >
                    <div className="flex items-center gap-3 pb-3">
                      <div className="relative h-14 w-14 shrink-0">
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#FFF4EF] text-base font-semibold text-[#C75560] ring-1 ring-[#EBC2AE]">
                          {profilePhoto ? <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" /> : settings.profile.name ? settings.profile.name.split(" ").map((n) => n[0]).join("") : "—"}
                        </div>
                        <label className="absolute bottom-0 right-0 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#C75560] text-white shadow-sm transition hover:bg-[#A0182C]" title="Change profile photo">
                          <Camera size={12} />
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfilePhotoChange} className="sr-only" />
                        </label>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1D181A]">{settings.profile.name || "Profile data unavailable"}</p>
                      </div>
                    </div>
                    {isEditingProfile ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField label="Full name" value={settings.profile.name} onChange={(v) => updateField("profile", "name", v)} />
                        <TextField label="Email" value={settings.profile.email} onChange={(v) => updateField("profile", "email", v)} />
                        <TextField label="Phone" value={settings.profile.phone} onChange={(v) => updateField("profile", "phone", v)} />
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-[#80576A]">New password</span>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="At least 12 characters"
                              value={passwordDraft.newPassword}
                              onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))}
                              className="w-full border border-[#EBC2AE] bg-[#FFF4EF] px-2.5 py-1.5 pr-8 text-xs outline-none transition focus:border-[#C75560] focus:ring-2 focus:ring-[#C75560]/15"
                            />
                            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#80576A]"><Eye size={14} /></button>
                          </div>
                        </label>
                        <TextField
                          label="Current password (only when changing password)"
                          type="password"
                          value={passwordDraft.currentPassword}
                          onChange={(value) => setPasswordDraft((current) => ({ ...current, currentPassword: value }))}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-3 border-t border-[#EBC2AE]/60 pt-3 sm:grid-cols-2">
                        <ProfileDetail label="Full name" value={settings.profile.name} />
                        <ProfileDetail label="Email" value={settings.profile.email} />
                        <ProfileDetail label="Phone" value={settings.profile.phone} />
                        <ProfileDetail label="Password" value="••••••••" />
                      </div>
                    )}
                    {profileMessage && <p className="text-[11px] font-medium text-[#80576A]">{profileMessage}</p>}
                    {isEditingProfile && (
                      <div className="flex justify-end border-t border-[#EBC2AE]/60 pt-3">
                        <button type="button" onClick={saveProfile} disabled={profileSaving} className="bg-[#C75560] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#D9654A] disabled:opacity-60">
                          {profileSaving ? "Saving..." : "Save details"}
                        </button>
                      </div>
                    )}
                  </Card>

                  <Card title="Security">
                    <SettingRow title="Two-factor authentication" description="Require an OTP on every login.">
                      <Toggle checked={settings.profile.twoFactor} onChange={updateTwoFactor} />
                    </SettingRow>
                  </Card>

                  <Card title="Active sessions" description="Devices currently signed into your admin account.">
                    {sessionsLoading ? (
                      <p className="py-3 text-xs text-[#80576A]">Loading active sessions...</p>
                    ) : settings.profile.sessions.length ? (
                      <div className="divide-y divide-[#EBC2AE]/60">
                        {settings.profile.sessions.map((s, i) => (
                          <div key={i} className="flex items-center justify-between py-2 text-xs">
                            <div>
                              <p className="font-medium text-[#1D181A]">
                                {s.device} {s.current && <span className="ml-1 bg-[#F7C56B]/40 px-1.5 py-0.5 text-[9px] font-semibold text-[#1D181A]">This device</span>}
                              </p>
                              <p className="text-[11px] text-[#80576A]">{s.location} · {new Date(s.lastActive).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                            </div>
                            {!s.current && <button type="button" onClick={() => revokeSession(s.id)} className="text-[11px] font-medium text-[#C75560] hover:underline">Revoke</button>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-3 text-xs text-[#80576A]">No active session data available.</p>
                    )}
                  </Card>
                </>
              )}

              {/* ---------------- PLATFORM ---------------- */}
              {activeTab === "platform" && (
                <>
                  <Card title="General">
                    <div className="flex items-center gap-3 border-b border-[#EBC2AE]/60 pb-3">
                      <div className="relative h-14 w-14 shrink-0">
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#FFF4EF] text-base font-semibold text-[#C75560] ring-1 ring-[#EBC2AE]">
                          {settings.platform.logo ? (
                            <img src={settings.platform.logo} alt="Platform logo" className="h-full w-full object-cover" />
                          ) : (
                            settings.platform.siteName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#C75560] text-white shadow-sm transition hover:bg-[#A0182C]" title="Upload platform logo">
                          <Camera size={12} />
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePlatformLogoChange} className="sr-only" />
                        </label>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        {isEditingPlatformName ? (
                          <input
                            autoFocus
                            value={settings.platform.siteName}
                            onChange={(event) => updateField("platform", "siteName", event.target.value)}
                            onBlur={() => setIsEditingPlatformName(false)}
                            onKeyDown={(event) => { if (event.key === "Enter") setIsEditingPlatformName(false); }}
                            className="border border-[#EBC2AE] bg-[#FFF4EF] px-2 py-1 text-xs font-semibold text-[#1D181A] outline-none focus:border-[#C75560]"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-[#1D181A]">{settings.platform.siteName}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsEditingPlatformName(true)}
                          title="Edit platform name"
                          className="flex h-6 w-6 items-center justify-center text-[#C75560] hover:bg-[#FFF4EF]"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>
                  </Card>
                  <Card title="Job posting">
                    <SettingRow title="Auto-approve job postings" description="Skip manual review before jobs go live.">
                      <Toggle
                        checked={settings.platform.autoApproveJobs}
                        onChange={(v) => updateField("platform", "autoApproveJobs", v)}
                      />
                    </SettingRow>
                    <SettingRow title="Require email verification" description="Candidates must verify email before applying.">
                      <Toggle
                        checked={settings.platform.emailVerificationRequired}
                        onChange={(v) => updateField("platform", "emailVerificationRequired", v)}
                      />
                    </SettingRow>
                  </Card>
                  <Card title="Maintenance">
                    <SettingRow title="Maintenance mode" description="Take the platform offline for candidates and recruiters.">
                      <Toggle
                        checked={settings.platform.maintenanceMode}
                        onChange={(v) => updateField("platform", "maintenanceMode", v)}
                      />
                    </SettingRow>
                    {settings.platform.maintenanceMode && (
                      <div className="flex items-start gap-2 bg-[#F7C56B]/20 px-3 py-2.5 text-xs text-[#80576A]">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        Platform will show a maintenance page to all non-admin users once saved.
                      </div>
                    )}
                  </Card>
                </>
              )}

              {/* ---------------- NOTIFICATIONS ---------------- */}
              {activeTab === "notifications" && (
                <Card title="Alerts" description="Choose what triggers an admin notification.">
                  <SettingRow title="New recruiter signup">
                    <Toggle
                      checked={settings.notifications.newRecruiterSignup}
                        onChange={(v) => updateNotificationSetting("newRecruiterSignup", v)}
                    />
                  </SettingRow>
                  <SettingRow title="Job flagged by users">
                    <Toggle
                      checked={settings.notifications.jobFlagged}
                      onChange={(v) => updateNotificationSetting("jobFlagged", v)}
                    />
                  </SettingRow>
                  <SettingRow title="Payment failed">
                    <Toggle
                      checked={settings.notifications.paymentFailed}
                      onChange={(v) => updateNotificationSetting("paymentFailed", v)}
                    />
                  </SettingRow>
                  <SettingRow title="Recruiter wallet balance low">
                    <Toggle
                      checked={settings.notifications.lowWalletAlert}
                      onChange={(v) => updateNotificationSetting("lowWalletAlert", v)}
                    />
                  </SettingRow>
                  <SettingRow title="SMS/WhatsApp alerts" description="In addition to email.">
                    <Toggle
                      checked={settings.notifications.smsAlerts}
                      onChange={(v) => updateNotificationSetting("smsAlerts", v)}
                    />
                  </SettingRow>
                </Card>
              )}

              {/* ---------------- PAYMENTS ---------------- */}
              {activeTab === "payments" && (
                <>
                  <Card title="Registration & resume charges" description="Set the amount users pay for registration and resume downloads.">
                    <div className="grid gap-2.5 lg:grid-cols-3">
                      {[
                        { key: "candidateRegistrationFee", label: "Candidate registration", description: "Fee charged when a candidate signs up.", icon: User },
                        { key: "recruiterRegistrationFee", label: "Recruiter registration", description: "Fee charged when a recruiter joins.", icon: Wallet },
                        { key: "resumeDownloadCharge", label: "Resume download", description: "Fee charged per resume unlock.", icon: Download },
                      ].map(({ key, label, description, icon: Icon }) => (
                        <div key={key} className="border border-[#EBC2AE] bg-[#FFFDFB] p-3">
                          <div className="flex items-start gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#FFF0E8] text-[#C75560]">
                              <Icon size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#1D181A]">{label}</p>
                              <p className="mt-0.5 min-h-[28px] text-[10px] leading-relaxed text-[#80576A]">{description}</p>
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between gap-2 bg-white px-2.5 py-1.5">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#80576A]">Current charge</p>
                              <p className="mt-0.5 text-sm font-bold text-[#1D181A]">₹{Number(settings.payments[key] || 0).toLocaleString("en-IN")}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openChargeModal({ key, label })}
                              className="shrink-0 bg-[#C75560] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[#D9654A]"
                            >
                              Increase charge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Razorpay configuration">
                    <div className="flex items-center justify-between bg-[#FFF4EF] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#1D181A]">API key</p>
                        <p className="font-mono text-xs text-[#80576A]">{settings.payments.razorpayKeyMasked}</p>
                      </div>
                      <button className="border border-[#EBC2AE] px-3 py-1.5 text-xs font-medium hover:bg-white">
                        Update key
                      </button>
                    </div>
                  </Card>

                  <Card
                    title="Wallet plans"
                    description="Recruiter top-up / subscription tiers."
                    action={
                      <button className="flex items-center gap-1.5 bg-[#C75560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#D9654A]">
                        <Plus size={14} /> Add plan
                      </button>
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {settings.payments.plans.map((p) => (
                        <div key={p.id} className="border border-[#EBC2AE] bg-[#FFFDFB] p-4">
                          <p className="text-sm font-semibold text-[#1D181A]">{p.name}</p>
                          <p className="mt-1 text-lg font-semibold text-[#C75560]">₹{p.price}</p>
                          <p className="text-xs text-[#80576A]">{p.credits} credits</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Invoicing">
                    <SettingRow title="Include GST on invoices">
                      <Toggle
                        checked={settings.payments.gstEnabled}
                        onChange={(v) => updateField("payments", "gstEnabled", v)}
                      />
                    </SettingRow>
                  </Card>
                </>
              )}

              {/* ---------------- MODERATION ---------------- */}
              {activeTab === "moderation" && (
                <>
                  <Card title="Auto-flag keywords" description="Job postings containing these phrases are flagged for review.">
                    <div className="flex flex-wrap gap-2">
                      {settings.moderation.flaggedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="flex items-center gap-1.5 bg-[#FFF4EF] px-3 py-1 text-xs text-[#1D181A] ring-1 ring-[#EBC2AE]"
                        >
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="text-[#80576A] hover:text-[#C75560]">
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Add a keyword or phrase"
                        className="flex-1 border border-[#EBC2AE] bg-[#FFF4EF] px-3 py-2 text-sm outline-none focus:border-[#C75560]"
                      />
                      <button
                        onClick={addKeyword}
                        className="bg-[#C75560] px-3 py-2 text-xs font-medium text-white hover:bg-[#D9654A]"
                      >
                        Add
                      </button>
                    </div>
                  </Card>

                  <Card title="Auto-suspend threshold" description="Suspend a recruiter after this many user reports.">
                    <input
                      type="number"
                      value={settings.moderation.autoSuspendThreshold}
                      onChange={(e) => updateField("moderation", "autoSuspendThreshold", e.target.value)}
                      className="w-24 border border-[#EBC2AE] bg-[#FFF4EF] px-3 py-2 text-sm outline-none focus:border-[#C75560]"
                    />
                  </Card>
                </>
              )}

              {/* ---------------- SECURITY ---------------- */}
              {activeTab === "security" && (
                <>
                  <Card title="Session security" description="Control how long an inactive admin session remains signed in.">
                    <SettingRow title="Automatic sign-out" description="Admins are signed out after this period of inactivity.">
                      <div className="flex h-9 w-[152px] shrink-0 items-center border border-[#EBC2AE] bg-white transition focus-within:border-[#C75560] focus-within:ring-2 focus-within:ring-[#C75560]/15">
                        <Clock size={14} className="ml-2.5 shrink-0 text-[#C75560]" />
                        <input
                          type="number"
                          min="1"
                          value={settings.security.sessionTimeout}
                          placeholder={auditLoading ? "Loading" : "Not set"}
                          aria-label="Session timeout in minutes"
                          onChange={(e) => updateField("security", "sessionTimeout", e.target.value)}
                          className="w-full bg-transparent px-2 text-sm font-semibold text-[#1D181A] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="pr-2.5 text-[10px] font-semibold text-[#80576A]">min</span>
                      </div>
                    </SettingRow>
                  </Card>

                  <Card
                    title="Audit log"
                    description="Recent admin actions."
                    action={
                      <button className="flex items-center gap-1.5 border border-[#EBC2AE] px-3 py-1.5 text-xs font-medium hover:bg-[#FFF4EF]">
                        <Download size={13} /> Export
                      </button>
                    }
                  >
                    <div className="divide-y divide-[#EBC2AE]/60">
                      {auditLoading ? (
                        <p className="py-3 text-xs text-[#80576A]">Loading audit records...</p>
                      ) : settings.security.auditLog.length ? (
                        settings.security.auditLog.map((log, i) => (
                          <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                            <div>
                              <p className="text-[#1D181A]">{log.action}</p>
                              <p className="text-xs text-[#80576A]">by {log.by}</p>
                            </div>
                            <span className="text-xs text-[#80576A]">{log.time}</span>
                          </div>
                        ))
                      ) : (
                        <p className="py-3 text-xs text-[#80576A]">No audit records found.</p>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {chargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D181A]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="charge-modal-title">
          <div className="w-full max-w-sm border border-[#EBC2AE] bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="charge-modal-title" className="text-sm font-semibold text-[#1D181A]">Increase {chargeModal.label} Amount</h2>
                <p className="mt-1 text-[11px] text-[#80576A]">Enter the new amount in rupees.</p>
              </div>
              <button type="button" onClick={closeChargeModal} aria-label="Close" className="text-sm font-semibold text-[#80576A] hover:text-[#C75560]">X</button>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#80576A]">New amount (₹)</span>
              <span className="flex items-center border border-[#EBC2AE] bg-[#FFF4EF] focus-within:border-[#C75560] focus-within:ring-2 focus-within:ring-[#C75560]/15">
                <span className="px-2.5 text-sm font-semibold text-[#80576A]">₹</span>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="1"
                  value={chargeAmount}
                  onChange={(event) => setChargeAmount(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") updateCharge(); }}
                  className="w-full bg-transparent px-1 py-2 text-sm font-semibold text-[#1D181A] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </span>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeChargeModal} className="border border-[#EBC2AE] px-3 py-1.5 text-xs font-semibold text-[#80576A] hover:bg-[#FFF4EF]">Cancel</button>
              <button type="button" onClick={updateCharge} disabled={chargeAmount === "" || Number(chargeAmount) < 0} className="bg-[#C75560] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D9654A] disabled:cursor-not-allowed disabled:opacity-50">Increase charges</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}