import { useState, useEffect, useRef } from "react";
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
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
} from "lucide-react";
import adminAxiosInstance from "../api/adminAxiosInstance";
import { useAdminAuth } from "../context/AdminAuthContext";

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
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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

function TextField({ label, value, onChange, type = "text", disabled = false, autoComplete }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[#80576A]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
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
  const { admin, updateAdmin } = useAdminAuth();
  const canManageSettings = admin?.role === "superadmin";
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = sessionStorage.getItem("admin-settings-active-tab");
    return TABS.some((tab) => tab.key === savedTab) ? savedTab : "profile";
  });
  const [settings, setSettings] = useState(DUMMY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moderationSaving, setModerationSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditDate, setAuditDate] = useState("");
  const auditScrollPosition = useRef(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "" });
  const [changePasswordEnabled, setChangePasswordEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPlatformName, setIsEditingPlatformName] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(DUMMY_SETTINGS.profile.avatar);
  const [chargeModal, setChargeModal] = useState(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [keyModal, setKeyModal] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [planModal, setPlanModal] = useState(null);
  const [planDraft, setPlanDraft] = useState({ name: "", price: "", credits: "", sortOrder: 0, active: true });
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsResponse, profileResponse, paymentResponse] = await Promise.all([
          adminAxiosInstance.get("/admin/settings"),
          adminAxiosInstance.get("/auth/me"),
          adminAxiosInstance.get("/admin/payment-settings"),
        ]);
        const res = settingsResponse;
        const profile = profileResponse.data;
        const paymentSettings = paymentResponse.data;
        setSettings((current) => ({
          ...current,
          profile: {
            ...current.profile,
            name: profile.name || current.profile.name,
            email: profile.email || current.profile.email,
            phone: profile.phone || current.profile.phone,
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
              razorpayKeyMasked: paymentSettings.settings?.razorpayKeyMasked || current.payments.razorpayKeyMasked,
              plans: paymentSettings.plans || current.payments.plans,
            },
            security: { ...current.security, sessionTimeout: saved.sessionTimeout },
            notifications: { ...current.notifications, ...(saved.notifications || {}) },
            moderation: { ...current.moderation, ...(saved.moderation || {}) },
          }));
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

  useEffect(() => {
    let active = true;
    const fetchAudit = async () => {
      setAuditLoading(true);
      try {
        const { data } = await adminAxiosInstance.get("/admin/security/audit", {
          params: { page: auditPage, pageSize: 10, date: auditDate || undefined },
        });
        if (!active) return;
        setSettings((current) => ({
          ...current,
          security: {
            ...current.security,
            auditLog: data.items || [],
          },
        }));
        setAuditTotal(data.total || 0);
        setAuditTotalPages(data.totalPages || 1);
      } catch (error) {
        if (active) setProfileMessage(error.response?.data?.error || "Unable to load audit records.");
      } finally {
        if (active) {
          setAuditLoading(false);
          if (auditScrollPosition.current !== null) {
            const scrollY = auditScrollPosition.current;
            requestAnimationFrame(() => {
              window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
              auditScrollPosition.current = null;
            });
          }
        }
      }
    };
    fetchAudit();
    return () => { active = false; };
  }, [auditPage, auditDate]);

  const updateField = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  useEffect(() => {
    sessionStorage.setItem("admin-settings-active-tab", activeTab);
  }, [activeTab]);

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

  const updatePaymentSetting = async (field, value) => {
    const previousSettings = settings;
    const nextSettings = {
      ...settings,
      payments: { ...settings.payments, [field]: value },
    };
    setSettings(nextSettings);
    setSaving(true);
    setSettingsMessage("");
    try {
      await adminAxiosInstance.patch("/admin/payment-settings", { [field]: value });
      setSettingsMessage("Payment setting saved.");
    } catch (err) {
      setSettings(previousSettings);
      setSettingsMessage(err.response?.data?.error || "Unable to save payment setting.");
    } finally {
      setSaving(false);
    }
  };

  const updatePlatformSetting = async (field, value) => {
    const previousSettings = settings;
    const nextSettings = { ...settings, platform: { ...settings.platform, [field]: value } };
    setSettings(nextSettings);
    setSaving(true);
    setSettingsMessage("");
    try {
      const { data } = await adminAxiosInstance.put("/admin/settings", nextSettings);
      const saved = data.settings || {};
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
      }));
      setSettingsMessage("Platform setting saved.");
    } catch (error) {
      setSettings(previousSettings);
      setSettingsMessage(error.response?.data?.error || "Unable to save platform setting.");
    } finally {
      setSaving(false);
    }
  };

  const savePlatformName = () => {
    const siteName = settings.platform.siteName.trim();
    if (!siteName) return;
    updatePlatformSetting("siteName", siteName);
    setIsEditingPlatformName(false);
  };

  const updateModerationSetting = async (field, value) => {
    const previousSettings = settings;
    const nextSettings = { ...settings, moderation: { ...settings.moderation, [field]: value } };
    setSettings(nextSettings);
    setModerationSaving(true);
    try {
      const { data } = await adminAxiosInstance.patch("/admin/moderation-settings", { [field]: value });
      setSettings((current) => ({ ...current, moderation: { ...current.moderation, ...data.moderation } }));
      setSettingsMessage("Moderation setting saved.");
    } catch (error) {
      setSettings(previousSettings);
      setSettingsMessage(error.response?.data?.error || "Unable to save moderation setting.");
    } finally {
      setModerationSaving(false);
    }
  };

  const saveProfile = async () => {
    const phone = settings.profile.phone.trim();
    if (phone && !/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(phone)) {
      setProfileMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    const hasCurrentPassword = Boolean(passwordDraft.currentPassword);
    const hasNewPassword = Boolean(passwordDraft.newPassword);
    if (changePasswordEnabled && (!hasCurrentPassword || !hasNewPassword)) {
      setProfileMessage("Enter both current and new passwords, or leave both password fields empty.");
      return;
    }
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const { data } = await adminAxiosInstance.patch("/auth/profile", {
        name: settings.profile.name,
        email: settings.profile.email,
        phone,
      });
      setSettings((current) => ({ ...current, profile: { ...current.profile, name: data.name, email: data.email, phone: data.phone || "" } }));
      updateAdmin({ name: data.name, email: data.email, phone: data.phone || "" });
      if (changePasswordEnabled) {
        await adminAxiosInstance.patch("/auth/password", passwordDraft);
        setPasswordDraft({ currentPassword: "", newPassword: "" });
        setChangePasswordEnabled(false);
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

  const saveSessionTimeout = async () => {
    const sessionTimeout = Number(settings.security.sessionTimeout);
    if (!Number.isInteger(sessionTimeout) || sessionTimeout < 1 || sessionTimeout > 1440) {
      setSettingsMessage("Session timeout must be between 1 and 1440 minutes.");
      return;
    }
    try {
      setSaving(true);
      const { data } = await adminAxiosInstance.patch("/admin/security/session-timeout", { sessionTimeout });
      updateField("security", "sessionTimeout", data.sessionTimeout);
      setSettingsMessage("Session timeout saved.");
    } catch (error) {
      setSettingsMessage(error.response?.data?.error || "Unable to save session timeout.");
    } finally {
      setSaving(false);
    }
  };

  const exportAudit = async () => {
    try {
      const response = await adminAxiosInstance.get("/admin/security/audit/export", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSettingsMessage(error.response?.data?.error || "Unable to export audit records.");
    }
  };

  const changeAuditPage = (nextPage) => {
    auditScrollPosition.current = window.scrollY;
    setAuditPage(nextPage);
  };

  const changeAuditDate = (value) => {
    auditScrollPosition.current = window.scrollY;
    setAuditDate(value);
    setAuditPage(1);
  };

  const removeKeyword = (kw) => {
    updateModerationSetting("flaggedKeywords", settings.moderation.flaggedKeywords.filter((k) => k !== kw));
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keyword = newKeyword.trim().toLowerCase();
    if (settings.moderation.flaggedKeywords.includes(keyword)) return;
    updateModerationSetting("flaggedKeywords", [...settings.moderation.flaggedKeywords, keyword]);
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
    updatePaymentSetting(chargeModal.key, amount);
    closeChargeModal();
  };

  const openKeyModal = () => {
    setKeyDraft("");
    setKeyModal(true);
  };

  const saveRazorpayKey = async () => {
    try {
      setSaving(true);
      setSettingsMessage("");
      const { data } = await adminAxiosInstance.put("/admin/payment-settings/razorpay-key", { razorpayKeyId: keyDraft });
      updateField("payments", "razorpayKeyMasked", data.razorpayKeyMasked);
      setKeyModal(false);
      setSettingsMessage("Razorpay key updated.");
    } catch (error) {
      setSettingsMessage(error.response?.data?.error || "Unable to update Razorpay key.");
    } finally {
      setSaving(false);
    }
  };

  const openPlanModal = (plan = null) => {
    setPlanModal(plan || {});
    setPlanDraft(plan ? { ...plan } : { name: "", price: "", credits: "", sortOrder: settings.payments.plans.length + 1, active: true });
  };

  const savePlan = async () => {
    try {
      setSaving(true);
      setSettingsMessage("");
      const payload = { name: planDraft.name, price: Number(planDraft.price), credits: Number(planDraft.credits), sortOrder: Number(planDraft.sortOrder), active: planDraft.active };
      const request = planModal?._id
        ? adminAxiosInstance.patch(`/admin/payment-plans/${planModal._id}`, payload)
        : adminAxiosInstance.post("/admin/payment-plans", payload);
      const { data } = await request;
      setSettings((current) => ({
        ...current,
        payments: {
          ...current.payments,
          plans: planModal?._id ? current.payments.plans.map((plan) => plan._id === planModal._id ? data.plan : plan) : [...current.payments.plans, data.plan],
        },
      }));
      setPlanModal(null);
      setSettingsMessage("Wallet plan saved.");
    } catch (error) {
      setSettingsMessage(error.response?.data?.error || "Unable to save wallet plan.");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (plan) => {
    if (!window.confirm(`Delete the ${plan.name} wallet plan?`)) return;
    try {
      setSaving(true);
      await adminAxiosInstance.delete(`/admin/payment-plans/${plan._id}`);
      setSettings((current) => ({ ...current, payments: { ...current.payments, plans: current.payments.plans.filter((item) => item._id !== plan._id) } }));
      setSettingsMessage("Wallet plan deleted.");
    } catch (error) {
      setSettingsMessage(error.response?.data?.error || "Unable to delete wallet plan.");
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-[#FFFDFB]" aria-busy="true" aria-live="polite">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#EBC2AE] border-t-[#C75560]" />
          <p className="mt-3 text-xs font-medium text-[#80576A]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[#1D181A]">Settings</h1>
          <p className="mt-0.5 text-xs text-[#80576A]">Configure admin preferences and platform parameters.</p>
        </div>
      </div>
      <p className="min-h-[16px] text-right text-[11px] font-medium text-[#80576A]" aria-live="polite">
        {settingsMessage}
      </p>
      {!canManageSettings && activeTab !== "profile" && (
        <p className="border border-[#EBC2AE] bg-[#FFF4EF] px-3 py-2 text-xs font-medium text-[#80576A]">
          You can view these settings, but only a superadmin can change platform, notification, payment, moderation, or session security settings.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[190px_1fr]">
        {/* Tab rail */}
        <div className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
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
                        onClick={() => {
                          if (!isEditingProfile) {
                            setPasswordDraft({ currentPassword: "", newPassword: "" });
                            setChangePasswordEnabled(false);
                          }
                          setIsEditingProfile((current) => !current);
                        }}
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
                        <p className="text-sm font-semibold text-[#1D181A]">{settings.profile.name || admin?.name || "Profile data unavailable"}</p>
                      </div>
                    </div>
                    {isEditingProfile ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField label="Full name" value={settings.profile.name} onChange={(v) => updateField("profile", "name", v)} />
                        <TextField label="Email" value={settings.profile.email} onChange={(v) => updateField("profile", "email", v)} />
                          <TextField label="Phone" type="tel" value={settings.profile.phone} onChange={(v) => updateField("profile", "phone", v)} />
                        {!changePasswordEnabled ? (
                          <button
                            type="button"
                            onClick={() => setChangePasswordEnabled(true)}
                            className="self-end border border-[#EBC2AE] px-3 py-2 text-left text-[11px] font-semibold text-[#C75560] hover:bg-[#FFF4EF]"
                          >
                            Change password
                          </button>
                        ) : (
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-[#80576A]">New password</span>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="At least 12 characters"
                              value={passwordDraft.newPassword}
                              onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))}
                              className="w-full border border-[#EBC2AE] bg-[#FFF4EF] px-2.5 py-1.5 pr-8 text-xs outline-none transition focus:border-[#C75560] focus:ring-2 focus:ring-[#C75560]/15"
                            />
                            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#80576A]"><Eye size={14} /></button>
                          </div>
                        </label>
                        )}
                        {changePasswordEnabled && (
                        <TextField
                          label="Current password (only when changing password)"
                          type="password"
                          autoComplete="current-password"
                          value={passwordDraft.currentPassword}
                          onChange={(value) => setPasswordDraft((current) => ({ ...current, currentPassword: value }))}
                        />
                        )}
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
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePlatformLogoChange} disabled={!canManageSettings} className="sr-only" />
                        </label>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        {isEditingPlatformName ? (
                          <input
                            autoFocus
                            value={settings.platform.siteName}
                            onChange={(event) => updateField("platform", "siteName", event.target.value)}
                            onBlur={savePlatformName}
                            onKeyDown={(event) => { if (event.key === "Enter") savePlatformName(); }}
                            className="border border-[#EBC2AE] bg-[#FFF4EF] px-2 py-1 text-xs font-semibold text-[#1D181A] outline-none focus:border-[#C75560]"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-[#1D181A]">{settings.platform.siteName}</p>
                        )}
                        <button
                          type="button"
                          disabled={!canManageSettings}
                          onClick={() => setIsEditingPlatformName(true)}
                          title="Edit platform name"
                          className="flex h-6 w-6 items-center justify-center text-[#C75560] hover:bg-[#FFF4EF] disabled:cursor-not-allowed disabled:opacity-40"
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
                        disabled={!canManageSettings}
                        onChange={(v) => updatePlatformSetting("autoApproveJobs", v)}
                      />
                    </SettingRow>
                    <SettingRow title="Require email verification" description="Candidates must verify email before applying.">
                      <Toggle
                        checked={settings.platform.emailVerificationRequired}
                        disabled={!canManageSettings}
                        onChange={(v) => updatePlatformSetting("emailVerificationRequired", v)}
                      />
                    </SettingRow>
                  </Card>
                  <Card title="Maintenance">
                    <SettingRow title="Maintenance mode" description="Take the platform offline for candidates and recruiters.">
                      <Toggle
                        checked={settings.platform.maintenanceMode}
                        disabled={!canManageSettings}
                        onChange={(v) => updatePlatformSetting("maintenanceMode", v)}
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
                      disabled={!canManageSettings}
                        onChange={(v) => updateNotificationSetting("newRecruiterSignup", v)}
                    />
                  </SettingRow>
                  <SettingRow title="Job flagged by users">
                    <Toggle
                      checked={settings.notifications.jobFlagged}
                      disabled={!canManageSettings}
                      onChange={(v) => updateNotificationSetting("jobFlagged", v)}
                    />
                  </SettingRow>
                  <SettingRow title="Payment failed">
                    <Toggle
                      checked={settings.notifications.paymentFailed}
                      disabled={!canManageSettings}
                      onChange={(v) => updateNotificationSetting("paymentFailed", v)}
                    />
                  </SettingRow>
                  <SettingRow title="Recruiter wallet balance low">
                    <Toggle
                      checked={settings.notifications.lowWalletAlert}
                      disabled={!canManageSettings}
                      onChange={(v) => updateNotificationSetting("lowWalletAlert", v)}
                    />
                  </SettingRow>
                  <SettingRow title="SMS/WhatsApp alerts" description="In addition to email.">
                    <Toggle
                      checked={settings.notifications.smsAlerts}
                      disabled={!canManageSettings}
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
                              disabled={!canManageSettings}
                              onClick={() => openChargeModal({ key, label })}
                              className="shrink-0 bg-[#C75560] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[#D9654A] disabled:cursor-not-allowed disabled:opacity-50"
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
                      <button type="button" disabled={!canManageSettings} onClick={openKeyModal} className="border border-[#EBC2AE] px-3 py-1.5 text-xs font-medium hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                        Update key
                      </button>
                    </div>
                  </Card>

                  <Card
                    title="Wallet plans"
                    description="Recruiter top-up / subscription tiers."
                    action={
                      <button type="button" disabled={!canManageSettings} onClick={() => openPlanModal()} className="flex items-center gap-1.5 bg-[#C75560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#D9654A] disabled:cursor-not-allowed disabled:opacity-50">
                        <Plus size={14} /> Add plan
                      </button>
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {settings.payments.plans.map((p) => (
                        <div key={p._id || p.id} className="border border-[#EBC2AE] bg-[#FFFDFB] p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[#1D181A]">{p.name}</p>
                            <div className="flex gap-1">
                              <button type="button" disabled={!canManageSettings} onClick={() => openPlanModal(p)} title="Edit plan" className="text-[#C75560] hover:text-[#A0182C] disabled:cursor-not-allowed disabled:opacity-40"><Pencil size={13} /></button>
                              <button type="button" disabled={!canManageSettings} onClick={() => deletePlan(p)} title="Delete plan" className="text-[#80576A] hover:text-[#C75560] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={13} /></button>
                            </div>
                          </div>
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
                        disabled={!canManageSettings}
                        onChange={(v) => updatePaymentSetting("gstEnabled", v)}
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
                          <button type="button" disabled={!canManageSettings || moderationSaving} onClick={() => removeKeyword(kw)} className="text-[#80576A] hover:text-[#C75560] disabled:cursor-not-allowed disabled:opacity-50">
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
                        type="button"
                        disabled={!canManageSettings || moderationSaving}
                        onClick={addKeyword}
                        className="bg-[#C75560] px-3 py-2 text-xs font-medium text-white hover:bg-[#D9654A] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </Card>

                  <Card title="Auto-suspend threshold" description="Suspend a recruiter after this many user reports.">
                    <input
                      type="number"
                      min="1"
                      value={settings.moderation.autoSuspendThreshold}
                      disabled={!canManageSettings}
                      onChange={(e) => updateModerationSetting("autoSuspendThreshold", Number(e.target.value))}
                      className="w-24 border border-[#EBC2AE] bg-[#FFF4EF] px-3 py-2 text-sm outline-none focus:border-[#C75560] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto"
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
                          onBlur={saveSessionTimeout}
                          disabled={!canManageSettings}
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
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <label className="flex items-center gap-2 border border-[#EBC2AE] bg-[#FFFDFB] px-2.5 py-1.5 text-[11px] text-[#80576A]">
                          <span className="font-semibold">Date</span>
                          <input
                            type="date"
                            value={auditDate}
                            onChange={(event) => changeAuditDate(event.target.value)}
                            className="bg-transparent text-[11px] text-[#1D181A] outline-none"
                            aria-label="Search audit log by date"
                          />
                        </label>
                        {auditDate && (
                          <button type="button" onClick={() => changeAuditDate("")} className="border border-[#EBC2AE] px-2.5 py-1.5 text-[11px] font-semibold text-[#80576A] hover:bg-[#FFF4EF]">
                            Clear date
                          </button>
                        )}
                        <button type="button" onClick={exportAudit} className="flex items-center gap-1.5 border border-[#EBC2AE] px-3 py-1.5 text-xs font-medium hover:bg-[#FFF4EF]">
                          <Download size={13} /> Export
                        </button>
                      </div>
                    }
                  >
                    <div className="[overflow-anchor:none]">
                    <div className={`w-full max-w-full overflow-x-auto border border-[#1D181A] bg-[#FFFDFB] ${auditLoading && settings.security.auditLog.length ? 'opacity-60' : ''}`}>
                      <table className="min-w-[900px] w-full table-fixed border-collapse text-xs sm:text-[11px]">
                        <thead>
                          <tr>
                            {['Date', 'Time', 'Admin', 'Action'].map((label) => (
                              <th key={label} className="border border-[#1D181A] bg-[#FFF4EF] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[#1D181A]">
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {settings.security.auditLog.length ? (
                            settings.security.auditLog.map((log, index) => (
                              <tr key={log._id || `${log.createdAt}-${index}`} className={`transition hover:bg-[#FFF0E8] ${index % 2 === 0 ? 'bg-[#FFFDFB]' : 'bg-[#FFF4EF]/40'}`}>
                                <td className="border border-[#1D181A] px-2 py-2 align-top text-[#5B4A50]">{new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                <td className="border border-[#1D181A] px-2 py-2 align-top text-[#5B4A50]">{new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</td>
                                <td className="border border-[#1D181A] px-2 py-2 align-top font-medium text-[#1D181A]">{log.admin?.name || "Unknown admin"}</td>
                                <td className="border border-[#1D181A] px-2 py-2 align-top font-semibold text-[#C75560]">{log.action}</td>
                              </tr>
                            ))
                          ) : auditLoading ? (
                            <tr><td colSpan={4} className="h-[420px] border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">Loading audit records...</td></tr>
                          ) : (
                            <tr><td colSpan={4} className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">No audit records found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {auditTotal > 0 && (
                      <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 text-xs font-medium text-[#80576A] md:flex-row md:items-center md:justify-between">
                        <div>Showing {settings.security.auditLog.length} of {auditTotal} audit record(s)</div>
                        <div className="flex items-center gap-2">
                          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => changeAuditPage(Math.max(1, auditPage - 1))} disabled={auditLoading || auditPage === 1} className="flex items-center gap-1 border border-[#1D181A] bg-[#FFFDFB] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40">
                            <ChevronLeft className="h-3.5 w-3.5" /> Prev
                          </button>
                          <span className="min-w-[90px] text-center text-[#1D181A]">Page {auditPage} / {auditTotalPages}</span>
                          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => changeAuditPage(Math.min(auditTotalPages, auditPage + 1))} disabled={auditLoading || auditPage >= auditTotalPages} className="flex items-center gap-1 border border-[#1D181A] bg-[#FFFDFB] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40">
                            Next <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  </Card>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {keyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D181A]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="key-modal-title">
          <div className="w-full max-w-sm border border-[#EBC2AE] bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="key-modal-title" className="text-sm font-semibold text-[#1D181A]">Update Razorpay key ID</h2>
                <p className="mt-1 text-[11px] text-[#80576A]">Only the public key ID is stored. The secret stays server-side.</p>
              </div>
              <button type="button" onClick={() => setKeyModal(false)} aria-label="Close" className="text-sm font-semibold text-[#80576A] hover:text-[#C75560]">X</button>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#80576A]">Razorpay key ID</span>
              <input autoFocus value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="rzp_live_..." className="w-full border border-[#EBC2AE] bg-[#FFF4EF] px-2.5 py-2 text-xs text-[#1D181A] outline-none focus:border-[#C75560]" />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setKeyModal(false)} className="border border-[#EBC2AE] px-3 py-1.5 text-xs font-semibold text-[#80576A] hover:bg-[#FFF4EF]">Cancel</button>
              <button type="button" onClick={saveRazorpayKey} disabled={!keyDraft.trim() || saving} className="bg-[#C75560] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D9654A] disabled:opacity-50">Save key</button>
            </div>
          </div>
        </div>
      )}

      {planModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D181A]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="plan-modal-title">
          <div className="w-full max-w-sm border border-[#EBC2AE] bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 id="plan-modal-title" className="text-sm font-semibold text-[#1D181A]">{planModal?._id ? "Edit wallet plan" : "Add wallet plan"}</h2>
              <button type="button" onClick={() => setPlanModal(null)} aria-label="Close" className="text-sm font-semibold text-[#80576A] hover:text-[#C75560]">X</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextField label="Plan name" value={planDraft.name} onChange={(value) => setPlanDraft((current) => ({ ...current, name: value }))} />
              <TextField label="Price (₹)" type="number" value={planDraft.price} onChange={(value) => setPlanDraft((current) => ({ ...current, price: value }))} />
              <TextField label="Credits" type="number" value={planDraft.credits} onChange={(value) => setPlanDraft((current) => ({ ...current, credits: value }))} />
              <TextField label="Display order" type="number" value={planDraft.sortOrder} onChange={(value) => setPlanDraft((current) => ({ ...current, sortOrder: value }))} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPlanModal(null)} className="border border-[#EBC2AE] px-3 py-1.5 text-xs font-semibold text-[#80576A] hover:bg-[#FFF4EF]">Cancel</button>
              <button type="button" onClick={savePlan} disabled={!planDraft.name.trim() || Number(planDraft.price) < 0 || Number(planDraft.credits) < 1 || saving} className="bg-[#C75560] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D9654A] disabled:opacity-50">Save plan</button>
            </div>
          </div>
        </div>
      )}

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
              <button type="button" onClick={updateCharge} disabled={!canManageSettings || chargeAmount === "" || Number(chargeAmount) < 0} className="bg-[#C75560] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D9654A] disabled:cursor-not-allowed disabled:opacity-50">Increase charges</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}