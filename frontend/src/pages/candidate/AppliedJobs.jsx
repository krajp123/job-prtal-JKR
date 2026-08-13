import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  IndianRupee,
  Briefcase,
  Loader2,
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  MessageSquare,
  CheckCheck,
  X,
  TrendingUp,
  Send,
  Star,
  CalendarCheck,
  Award,
  Ban,
  Route,
  Milestone,
  ChevronRight,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import {
  FONT_DISPLAY,
  FONT_BODY,
  MAROON,
  MAROON_DARK,
  ACCENT,
  BG,
  DUSTY_ROSE,
  LIGHT_BORDER,
  IVORY,
  SOFT_CORAL,
  AMBER,
  AMBER_DARK,
} from "../../theme";
import CandidateNavbar from "../../components/CandidateNavbar";

// ---------------------------------------------------------------------------
// Status vocabulary. `step` places a status on the horizontal route below;
// -1 (rejected) is a terminal state rendered outside the route entirely.
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  applied: {
    label: "Application Sent",
    color: MAROON,
    bgColor: SOFT_CORAL,
    step: 0,
  },
  viewed: {
    label: "Application Viewed",
    color: "#3B72E0",
    bgColor: "#E8F0FE",
    step: 1,
  },
  shortlisted: {
    label: "Shortlisted",
    color: "#1E7E34",
    bgColor: "#E7F5EA",
    step: 2,
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "#3B72E0",
    bgColor: "#E8F0FE",
    step: 3,
  },
  offered: {
    label: "Offer Extended",
    color: "#7C3AED",
    bgColor: "#F4E9FF",
    step: 4,
  },
  accepted: {
    label: "Accepted",
    color: "#0F8A5F",
    bgColor: "#E1F6EC",
    step: 5,
  },
  rejected: {
    label: "Not Selected",
    color: "#B3261E",
    bgColor: "#FFF0EE",
    step: -1,
  },
};

// The road itself — six mile-markers a candidate travels through.
const STAGE_FLOW = [
  { key: "applied", label: "Applied", dateKey: "appliedAt", icon: Send },
  { key: "viewed", label: "Viewed", dateKey: "viewedAt", icon: Eye },
  {
    key: "shortlisted",
    label: "Shortlisted",
    dateKey: "shortlistedAt",
    icon: Star,
  },
  {
    key: "interview_scheduled",
    label: "Interview",
    dateKey: "interviewScheduledAt",
    icon: CalendarCheck,
  },
  { key: "offered", label: "Offer", dateKey: "offeredAt", icon: Award },
  {
    key: "accepted",
    label: "Accepted",
    dateKey: "acceptedAt",
    icon: CheckCheck,
  },
];

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "In Progress" },
  { key: "interviews", label: "Interviews" },
  { key: "offers", label: "Offers" },
  { key: "rejected", label: "Not Selected" },
];

function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status] || {
      label: status || "Applied",
      color: DUSTY_ROSE,
      bgColor: "#F3F4F6",
      step: 0,
    }
  );
}

function matchesFilterTab(app, tab) {
  const config = getStatusConfig(app.status);
  if (tab === "all") return true;
  if (tab === "rejected") return app.status === "rejected";
  if (tab === "interviews") return config.step === 3;
  if (tab === "offers") return config.step >= 4 && app.status !== "rejected";
  if (tab === "active") return app.status !== "rejected" && config.step < 4;
  return true;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function AppliedJobs() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [filterTab, setFilterTab] = useState("all");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    async function loadAppliedJobs() {
      try {
        setLoading(true);
        const profileRes = await axiosInstance.get("/candidate/me/profile");
        setProfile(profileRes.data);

        const appsRes = await axiosInstance.get("/applications/mine");
        const apps = appsRes.data || [];
        setApplications(apps);
        if (apps.length > 0) {
          setSelectedApp(apps[0]);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load applications");
      } finally {
        setLoading(false);
      }
    }

    loadAppliedJobs();
  }, []);

  async function withdrawApplication() {
    if (!selectedApp) return;
    if (
      selectedApp.status === 'rejected' ||
      getStatusConfig(selectedApp.status).step >= 2
    )
      return;
    if (!window.confirm("Are you sure you want to withdraw this application?"))
      return;

    const jobId = selectedApp.job?._id || selectedApp.job;
    if (!jobId) {
      setError("Unable to determine the job associated with this application.");
      return;
    }

    setWithdrawing(true);
    setError("");
    try {
      await axiosInstance.delete(`/applications/job/${jobId}`);
      const remaining = applications.filter(
        (app) => app._id !== selectedApp._id,
      );
      setApplications(remaining);
      setSelectedApp(remaining[0] || null);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to withdraw the application.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

  const stats = useMemo(() => {
    const total = applications.length;
    const updates = applications.filter(
      (app) =>
        app.updatedAt &&
        new Date(app.updatedAt) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ).length;
    const inProgress = applications.filter(
      (app) =>
        app.status !== "rejected" && getStatusConfig(app.status).step < 4,
    ).length;
    return { total, updates, inProgress };
  }, [applications]);

  const tabCounts = useMemo(() => {
    const counts = {};
    FILTER_TABS.forEach((tab) => {
      counts[tab.key] = applications.filter((app) =>
        matchesFilterTab(app, tab.key),
      ).length;
    });
    return counts;
  }, [applications]);

  const filteredApplications = useMemo(
    () => applications.filter((app) => matchesFilterTab(app, filterTab)),
    [applications, filterTab],
  );

  const withdrawDisabled =
    selectedApp &&
    (selectedApp.status === 'rejected' || getStatusConfig(selectedApp.status).step >= 2);

  useEffect(() => {
    if (
      selectedApp &&
      !filteredApplications.some((app) => app._id === selectedApp._id)
    ) {
      setSelectedApp(filteredApplications[0] || null);
    }
  }, [filteredApplications, selectedApp]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: BG }}>
        <CandidateNavbar profile={profile} />
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Loader2 className="animate-spin" size={30} color={MAROON} />
          <p className="text-[13px] font-medium" style={{ color: DUSTY_ROSE }}>
            Mapping your route...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BG, fontFamily: FONT_BODY }}
    >
      <CandidateNavbar profile={profile} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className="relative mb-7 overflow-hidden rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: LIGHT_BORDER,
            background: `linear-gradient(135deg, ${IVORY} 0%, ${SOFT_CORAL} 100%)`,
          }}
        >
          {/* Dotted route line, purely decorative */}
          <svg
            className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.18]"
            viewBox="0 0 400 160"
            preserveAspectRatio="none"
          >
            <path
              d="M -20 140 Q 100 20 200 90 T 420 40"
              fill="none"
              stroke={MAROON}
              strokeWidth="3"
              strokeDasharray="1 14"
              strokeLinecap="round"
            />
          </svg>

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <div
                className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em]"
                style={{ backgroundColor: "#FFFFFFA6", color: MAROON }}
              >
                <Route size={12} /> Your route
              </div>
              <h1
                className="text-[26px] font-bold leading-tight sm:text-3xl"
                style={{ color: MAROON_DARK, fontFamily: FONT_DISPLAY }}
              >
                Job application status
              </h1>
              <p
                className="mt-1.5 max-w-md text-[13.5px] leading-6"
                style={{ color: DUSTY_ROSE }}
              >
                Not getting views on your CV?{" "}
                <span
                  style={{ color: MAROON }}
                  className="font-semibold cursor-pointer hover:underline"
                >
                  Highlight your application
                </span>{" "}
                to get a recruiter's attention.
              </p>
            </div>

            <div className="flex gap-6 sm:gap-8">
              <StatTile
                value={stats.total}
                label="Total applies"
                color={MAROON_DARK}
              />
              <StatTile
                value={stats.inProgress}
                label="In progress"
                color={AMBER_DARK}
              />
              <StatTile
                value={stats.updates}
                label="Updates (7d)"
                color="#1E7E34"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ borderColor: LIGHT_BORDER, backgroundColor: IVORY }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: SOFT_CORAL }}
            >
              <Milestone size={26} style={{ color: MAROON }} />
            </div>
            <h2
              className="mb-2 text-xl font-bold"
              style={{ fontFamily: FONT_DISPLAY, color: MAROON_DARK }}
            >
              Your route starts here
            </h2>
            <p className="mb-5 text-[13.5px]" style={{ color: DUSTY_ROSE }}>
              Apply to jobs and track every step of your application, from sent
              to hired, right here.
            </p>
            <button
              onClick={() => navigate("/candidate/jobs")}
              className="inline-flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: MAROON }}
            >
              Browse jobs <ChevronRight size={15} />
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="lg:col-span-1">
              <div className="mb-4 flex flex-wrap gap-2">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key)}
                    className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors"
                    style={
                      filterTab === tab.key
                        ? { backgroundColor: MAROON, color: "#fff" }
                        : {
                            border: `1px solid ${LIGHT_BORDER}`,
                            backgroundColor: IVORY,
                            color: DUSTY_ROSE,
                          }
                    }
                  >
                    {tab.label}{" "}
                    <span className="opacity-75">
                      ({tabCounts[tab.key] ?? 0})
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {filteredApplications.length === 0 ? (
                  <div
                    className="rounded-xl border px-4 py-8 text-center text-[12.5px]"
                    style={{
                      borderColor: LIGHT_BORDER,
                      backgroundColor: IVORY,
                      color: DUSTY_ROSE,
                    }}
                  >
                    No applications in this view.
                  </div>
                ) : (
                  filteredApplications.map((app, index) => {
                    const job = app.job || {};
                    const isSelected = selectedApp?._id === app._id;
                    const config = getStatusConfig(app.status);

                    return (
                      <motion.div
                        key={app._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        onClick={() => setSelectedApp(app)}
                        className="cursor-pointer rounded-xl border p-3.5 transition-all"
                        style={
                          isSelected
                            ? {
                                borderColor: MAROON,
                                backgroundColor: SOFT_CORAL,
                                boxShadow:
                                  "0 8px 20px -14px rgba(29,24,26,0.35)",
                              }
                            : {
                                borderColor: LIGHT_BORDER,
                                backgroundColor: IVORY,
                              }
                        }
                      >
                        <div className="flex items-start gap-3">
                          {job.postedBy?.companyLogoUrl ? (
                            <img
                              src={job.postedBy.companyLogoUrl}
                              alt={job.postedBy.companyName}
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                              style={{
                                backgroundColor: "#FFEDE3",
                                color: AMBER_DARK,
                              }}
                            >
                              {initials(job.postedBy?.companyName)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3
                              className="truncate text-[13.5px] font-bold"
                              style={{
                                color: isSelected ? MAROON : MAROON_DARK,
                                fontFamily: FONT_DISPLAY,
                              }}
                            >
                              {job.title}
                            </h3>
                            <p
                              className="mt-0.5 truncate text-[12px]"
                              style={{ color: DUSTY_ROSE }}
                            >
                              {job.postedBy?.companyName}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: DUSTY_ROSE }}
                          >
                            Applied {formatShortDate(app.appliedAt)}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: config.color }}
                            />
                            {config.label}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {selectedApp ? (
                  <motion.div
                    key={selectedApp._id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border p-6"
                    style={{
                      borderColor: LIGHT_BORDER,
                      backgroundColor: IVORY,
                    }}
                  >
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2
                          className="text-xl font-bold"
                          style={{
                            color: MAROON_DARK,
                            fontFamily: FONT_DISPLAY,
                          }}
                        >
                          {selectedApp.job?.title}
                        </h2>
                        <div
                          className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]"
                          style={{ color: DUSTY_ROSE }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={13} />{" "}
                            {selectedApp.job?.postedBy?.companyName}
                          </span>
                          {selectedApp.job?.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={13} /> {selectedApp.job.location}
                            </span>
                          )}
                          {selectedApp.job?.salary && (
                            <span className="inline-flex items-center gap-1">
                              <IndianRupee size={13} /> {selectedApp.job.salary}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-[11.5px] font-bold"
                          style={{
                            backgroundColor: getStatusConfig(selectedApp.status)
                              .bgColor,
                            color: getStatusConfig(selectedApp.status).color,
                          }}
                        >
                          {getStatusConfig(selectedApp.status).label}
                        </span>
                        <button
                          type="button"
                          onClick={withdrawApplication}
                          disabled={withdrawing || withdrawDisabled}
                          title={
                            withdrawDisabled
                              ? "Cannot withdraw after the recruiter has shortlisted you."
                              : undefined
                          }
                          className="inline-flex items-center rounded-full border border-[#EBC2AE] bg-white px-4 py-2 text-[13px] font-semibold text-[#54263F] transition hover:border-[#C75560] hover:text-[#C75560] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {withdrawing ? "Withdrawing…" : "Withdraw"}
                        </button>
                      </div>
                    </div>

                    {/* Horizontal route timeline — the signature element */}
                    <div className="mb-8">
                      <h3
                        className="mb-4 flex items-center gap-1.5 text-[13px] font-bold"
                        style={{ color: MAROON_DARK }}
                      >
                        <Milestone size={15} style={{ color: MAROON }} /> Your
                        route on this application
                      </h3>
                      <RouteTimeline application={selectedApp} />
                    </div>

                    {/* Activity stats */}
                    <div className="mb-8 grid grid-cols-2 gap-3">
                      <StatCard
                        icon={<Eye size={16} />}
                        value={selectedApp.viewsCount || 0}
                        label="Total applications"
                      />
                      <StatCard
                        icon={<CheckCircle2 size={16} />}
                        value={selectedApp.applicationsViewed || 0}
                        label="Viewed by recruiter"
                      />
                    </div>

                    {/* Matching criteria */}
                    <div>
                      <h3
                        className="mb-1 flex items-center gap-1.5 text-[13px] font-bold"
                        style={{ color: MAROON_DARK }}
                      >
                        <Sparkles size={14} style={{ color: MAROON }} /> What
                        may work for you?
                      </h3>
                      <p
                        className="mb-3 text-[11.5px]"
                        style={{ color: DUSTY_ROSE }}
                      >
                        Following criteria suggests how well you match with the
                        job.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <MatchingCriteria
                          icon={<CheckCheck size={15} />}
                          label="Early Applicant"
                          matched={true}
                        />
                        <MatchingCriteria
                          icon={<TrendingUp size={15} />}
                          label="Keyskills"
                          matched={selectedApp.matchedSkills?.length > 0}
                        />
                        <MatchingCriteria
                          icon={<MapPin size={15} />}
                          label="Location"
                          matched={true}
                        />
                        <MatchingCriteria
                          icon={<Briefcase size={15} />}
                          label="Work Experience"
                          matched={true}
                        />
                        <MatchingCriteria
                          icon={<Building2 size={15} />}
                          label="Industry"
                          matched={false}
                        />
                        <MatchingCriteria
                          icon={<Star size={15} />}
                          label="Department"
                          matched={false}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    {/* <div className="mt-8 flex flex-wrap gap-2 border-t pt-6" style={{ borderColor: LIGHT_BORDER }}>
                      <ActionButton icon={<FileText size={15} />} label="Prep for interview" />
                      <ActionButton icon={<MessageSquare size={15} />} label="Mock interview" />
                      <ActionButton icon={<HelpCircle size={15} />} label="Q&A" />
                    </div> */}
                  </motion.div>
                ) : (
                  <div
                    className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border p-10 text-center"
                    style={{
                      borderColor: LIGHT_BORDER,
                      backgroundColor: IVORY,
                    }}
                  >
                    <Route size={26} style={{ color: AMBER_DARK }} />
                    <p
                      className="mt-3 text-[13px]"
                      style={{ color: DUSTY_ROSE }}
                    >
                      Select an application to see its route.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({ value, label, color }) {
  return (
    <div className="text-right sm:text-left">
      <div
        className="text-2xl font-bold sm:text-3xl"
        style={{ color, fontFamily: FONT_DISPLAY }}
      >
        {value.toString().padStart(2, "0")}
      </div>
      <p
        className="mt-0.5 text-[11.5px] font-medium"
        style={{ color: DUSTY_ROSE }}
      >
        {label}
      </p>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: LIGHT_BORDER, backgroundColor: SOFT_CORAL }}
    >
      <div className="flex items-center gap-1.5" style={{ color: MAROON }}>
        {icon}
        <span
          className="text-2xl font-bold"
          style={{ fontFamily: FONT_DISPLAY }}
        >
          {value}
        </span>
      </div>
      <p className="mt-1 text-[11.5px]" style={{ color: DUSTY_ROSE }}>
        {label}
      </p>
    </div>
  );
}

function ActionButton({ icon, label }) {
  return (
    <button
      className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-[12.5px] font-semibold transition-colors hover:-translate-y-0.5"
      style={{
        borderColor: LIGHT_BORDER,
        color: MAROON_DARK,
        backgroundColor: IVORY,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function MatchingCriteria({ icon, label, matched }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
      style={{
        borderColor: LIGHT_BORDER,
        backgroundColor: matched ? "#F4FBF6" : "#FAFAFA",
      }}
    >
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: matched ? "#E7F5EA" : "#F3F4F6",
          color: matched ? "#1E7E34" : "#9CA3AF",
        }}
      >
        {matched ? <CheckCheck size={13} /> : <X size={13} />}
      </div>
      <span
        className="text-[12.5px]"
        style={{
          color: matched ? MAROON_DARK : "#9CA3AF",
          textDecoration: matched ? "none" : "line-through",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RouteTimeline — a horizontal "road" of mile-markers instead of the classic
// vertical stepper. Rejected applications are shown as a closed road rather
// than folded into the progress line, since we can't know at which stage the
// door closed.
// ---------------------------------------------------------------------------
function RouteTimeline({ application }) {
  const isRejected = application.status === "rejected";
  const config = getStatusConfig(application.status);
  const currentStep = isRejected ? -1 : config.step;
  const progressPct =
    currentStep <= 0 ? 0 : (currentStep / (STAGE_FLOW.length - 1)) * 100;

  if (isRejected) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "#E9B6AF", backgroundColor: "#FFF0EE" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <Ban size={18} style={{ color: "#B3261E" }} />
          </div>
          <div>
            <p className="text-[13.5px] font-bold" style={{ color: "#B3261E" }}>
              Not Selected
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "#B3261E" }}>
              Your application submitted on {formatDate(application.appliedAt)}{" "}
              for the <strong>{application.job.title}</strong> role did not
              progress to the next stage. Thank you for your interest, and we
              encourage you to apply for future openings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Scrolls on narrow screens; the road never wraps */}
      <div className="overflow-x-auto pb-1">
        <div className="relative min-w-[560px] px-2 pt-2">
          {/* Base road */}
          <div
            className="absolute left-2 right-2 top-6 h-1 rounded-full"
            style={{ backgroundColor: "#EDE3DE" }}
          />
          {/* Traveled distance */}
          <motion.div
            className="absolute left-2 top-6 h-1 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${AMBER} 0%, ${MAROON} 100%)`,
            }}
            initial={{ width: 0 }}
            animate={{
              width: `calc(${progressPct}% - ${progressPct > 0 ? 16 : 0}px)`,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          <div className="relative flex justify-between">
            {STAGE_FLOW.map((stage, index) => {
              const reached = index <= currentStep;
              const isCurrent = index === currentStep;
              const StageIcon = stage.icon;
              const dateValue = application[stage.dateKey];

              return (
                <div
                  key={stage.key}
                  className="flex w-[92px] flex-col items-center text-center"
                >
                  <div className="relative">
                    {isCurrent && (
                      <motion.span
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: MAROON, opacity: 0.35 }}
                        animate={{ scale: [1, 1.6], opacity: [0.35, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                    )}
                    <div
                      className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors"
                      style={
                        reached
                          ? {
                              borderColor: MAROON,
                              backgroundColor: MAROON,
                              color: "#fff",
                            }
                          : {
                              borderColor: "#DDD0D4",
                              backgroundColor: IVORY,
                              color: "#B9AAB0",
                            }
                      }
                    >
                      <StageIcon size={14} />
                    </div>
                  </div>
                  <p
                    className="mt-2 text-[11.5px] font-semibold"
                    style={{ color: reached ? MAROON_DARK : "#B9A2AC" }}
                  >
                    {stage.label}
                  </p>
                  <p
                    className="mt-0.5 text-[10px]"
                    style={{ color: DUSTY_ROSE }}
                  >
                    {dateValue
                      ? formatShortDate(dateValue)
                      : reached
                        ? "Done"
                        : "Pending"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
