import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  IndianRupee,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Loader2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Star,
  EyeOff,
  Building2,
  Clock,
  GraduationCap,
  Undo2,
  X,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import {
  FONT_DISPLAY,
  FONT_BODY,
  MAROON,
  MAROON_DARK,
  ACCENT,
  BG,
} from "../../theme";
import CandidateNavbar from "../../components/CandidateNavbar";

const EXPERIENCE_LEVELS = ["Fresher", "1-3 years", "3-5 years", "5+ years"];

const ROLE_SUGGESTIONS = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "UI/UX Designer",
  "Product Manager",
  "DevOps Engineer",
  "QA Engineer",
  "Mobile App Developer",
];

const INDUSTRY_OPTIONS = [
  "Information Technology",
  "Finance & Banking",
  "Healthcare",
  "E-commerce",
  "Education",
  "Manufacturing",
  "Consulting",
  "Media & Entertainment",
];

const SALARY_OPTIONS = [
  { label: "Any salary", value: "" },
  { label: "₹3 - 6 LPA", value: "3-6" },
  { label: "₹6 - 10 LPA", value: "6-10" },
  { label: "₹10 - 15 LPA", value: "10-15" },
  { label: "₹15 - 25 LPA", value: "15-25" },
  { label: "₹25 LPA+", value: "25+" },
];

const DATE_POSTED_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "Last 24 hours", value: "1" },
  { label: "Last 3 days", value: "3" },
  { label: "Last week", value: "7" },
  { label: "Last month", value: "30" },
];

// Debounce hook — delays firing the search until the user pauses typing.
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

// Ticks every 60s so "posted X ago" labels keep advancing without a refresh.
function useClockTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);
}

function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const then = new Date(dateInput).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function CompanyLogo({ name, logoUrl, className = "" }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`h-12 w-12 shrink-0 rounded-[12px] border border-stone-200 object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-bold text-white ${className}`}
      style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
    >
      {getInitials(name)}
    </div>
  );
}

function CompanyRating({ rating }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5 text-[11.5px] font-semibold text-stone-600">
      <Star size={11} fill={ACCENT} color={ACCENT} />
      {rating.toFixed ? rating.toFixed(1) : rating}
    </span>
  );
}

// Multi-select dropdown for "Preferred job role" — click to open, click again
// (or click outside) to close, checkboxes allow picking more than one role.
function RoleMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleRole(r) {
    onChange(
      selected.includes(r) ? selected.filter((x) => x !== r) : [...selected, r],
    );
  }

  const label =
    selected.length === 0
      ? "Any role"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} roles selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-[10px] border border-stone-200 py-2.5 pl-9 pr-3 text-left text-[13px] outline-none focus:border-[#8B1E2F]/40"
      >
        <span className={selected.length ? "text-stone-800" : "text-stone-400"}>
          {label}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <Briefcase
        size={14}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-[10px] border border-stone-200 bg-white p-1.5 shadow-lg"
          >
            {ROLE_SUGGESTIONS.map((r) => {
              const checked = selected.includes(r);
              return (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] text-stone-700 hover:bg-stone-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(r)}
                    className="h-3.5 w-3.5 rounded accent-[#8B1E2F]"
                  />
                  {r}
                </label>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[16px] border border-stone-200/70 bg-white p-5">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-[12px] bg-stone-200" />
        <div className="flex-1">
          <div className="mb-2 h-4 w-1/3 rounded bg-stone-200" />
          <div className="mb-2 h-3 w-1/4 rounded bg-stone-100" />
          <div className="h-3 w-full rounded bg-stone-100" />
        </div>
      </div>
    </div>
  );
}

export default function JobSearch() {
  useClockTick();
  const navigate = useNavigate();

  // Filters
  const [keyword, setKeyword] = useState("");
  const [roles, setRoles] = useState([]); // array — multi-select
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [industry, setIndustry] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [applyingIds, setApplyingIds] = useState(new Set());
  const [appliedIds, setAppliedIds] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // { message, onUndo? }

  const debouncedKeyword = useDebouncedValue(keyword, 400);
  const debouncedLocation = useDebouncedValue(location, 400);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // TODO(backend): job.controller.js `list` currently matches `skill` against
      // skillsRequired only. Extend with $or on title/description/role, and add
      // salaryRange / industry / datePosted / role query params server-side to
      // fully wire up these new filters.
      const { data } = await axiosInstance.get("/jobs", {
        params: {
          skill: debouncedKeyword || undefined,
          role: roles.length ? roles.join(",") : undefined,
          location: debouncedLocation || undefined,
          experienceLevel: experienceLevel || undefined,
          salaryRange: salaryRange || undefined,
          industry: industry || undefined,
          datePosted: datePosted || undefined,
        },
      });
      // Sort jobs by createdAt in descending order (most recent first)
      const sortedJobs = (data || []).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      setJobs(sortedJobs);
    } catch (err) {
      setError(
        err.response?.data?.error || "Could not load jobs. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    debouncedKeyword,
    roles,
    debouncedLocation,
    experienceLevel,
    salaryRange,
    industry,
    datePosted,
  ]);

  async function loadSavedJobIds() {
    try {
      const { data } = await axiosInstance.get("/candidate/me/saved-jobs");
      setSavedIds(new Set((data || []).map((j) => j._id)));
    } catch {
      // Non-fatal — saved state just won't be pre-highlighted.
    }
  }

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadSavedJobIds();
  }, []);

  function showToast(message, onUndo) {
    setToast({ message, onUndo });
    setTimeout(() => setToast(null), onUndo ? 3500 : 2200);
  }

  async function toggleSave(jobId) {
    const isSaved = savedIds.has(jobId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(jobId) : next.add(jobId);
      return next;
    });

    try {
      if (isSaved) {
        await axiosInstance.delete(`/candidate/me/saved-jobs/${jobId}`);
      } else {
        await axiosInstance.post(`/candidate/me/saved-jobs/${jobId}`);
        showToast("Saved to your bookmarks");
      }
    } catch (err) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        isSaved ? next.add(jobId) : next.delete(jobId);
        return next;
      });
      showToast(err.response?.data?.error || "Could not update saved jobs");
    }
  }

  function hideJob(jobId) {
    setHiddenIds((prev) => new Set(prev).add(jobId));
    showToast("Job hidden", () =>
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      }),
    );
  }

  async function apply(jobId) {
    setApplyingIds((prev) => new Set(prev).add(jobId));

    try {
      await axiosInstance.post("/applications", { jobId });
      setAppliedIds((prev) => new Set(prev).add(jobId));
      showToast("Application submitted!");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to apply");
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }

  const hasActiveFilters =
    keyword ||
    roles.length > 0 ||
    location ||
    experienceLevel ||
    salaryRange ||
    industry ||
    datePosted;

  function clearAllFilters() {
    setKeyword("");
    setRoles([]);
    setLocation("");
    setExperienceLevel("");
    setSalaryRange("");
    setIndustry("");
    setDatePosted("");
  }

  const filterChips = useMemo(() => {
    const chips = [];
    if (keyword)
      chips.push({
        key: "keyword",
        label: `"${keyword}"`,
        clear: () => setKeyword(""),
      });
    roles.forEach((r) =>
      chips.push({
        key: `role-${r}`,
        label: r,
        clear: () => setRoles((prev) => prev.filter((x) => x !== r)),
      }),
    );
    if (location)
      chips.push({
        key: "location",
        label: location,
        clear: () => setLocation(""),
      });
    if (experienceLevel)
      chips.push({
        key: "exp",
        label: experienceLevel,
        clear: () => setExperienceLevel(""),
      });
    if (salaryRange) {
      const opt = SALARY_OPTIONS.find((o) => o.value === salaryRange);
      chips.push({
        key: "salary",
        label: opt?.label || salaryRange,
        clear: () => setSalaryRange(""),
      });
    }
    if (industry)
      chips.push({
        key: "industry",
        label: industry,
        clear: () => setIndustry(""),
      });
    if (datePosted) {
      const opt = DATE_POSTED_OPTIONS.find((o) => o.value === datePosted);
      chips.push({
        key: "date",
        label: opt?.label || datePosted,
        clear: () => setDatePosted(""),
      });
    }
    return chips;
  }, [
    keyword,
    roles,
    location,
    experienceLevel,
    salaryRange,
    industry,
    datePosted,
  ]);

  const visibleJobs = jobs.filter((j) => !hiddenIds.has(j._id));

  return (
    <div
      className="portal-theme min-h-[100dvh] w-full"
      style={{ background: "#FFF7F2", fontFamily: FONT_BODY }}
    >
      <CandidateNavbar />

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="text-[22px] font-bold text-stone-900"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              Find your next role
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#6B6259]">
              {loading
                ? "Loading jobs…"
                : `${visibleJobs.length} Job${visibleJobs.length === 1 ? "" : "s"} Found`}
            </p>
          </div>
          <button
            onClick={() => setMobileFiltersOpen((s) => !s)}
            className="flex items-center gap-1.5 rounded-[12px] border border-stone-200 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-[#6B6259] lg:hidden"
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>

        {filterChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.clear}
                className="flex items-center gap-1 rounded-full bg-[#8B1E2F0F] px-3 py-1 text-[11.5px] font-medium text-[#8B1E2F]"
              >
                {chip.label}
                <span className="text-[13px] leading-none">×</span>
              </button>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-[11.5px] font-semibold text-stone-400 hover:text-stone-600"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── LEFT: job list ───────────────────────────────────────────── */}
          <div className="order-2 lg:order-1">
            <div className="pr-0 lg:pr-2">
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <JobCardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-stone-200/70 bg-white py-16 text-center">
                <AlertTriangle size={26} color={ACCENT} />
                <p className="text-[13.5px] font-medium text-stone-800">
                  {error}
                </p>
                <button
                  onClick={loadJobs}
                  className="mt-1 flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})`,
                  }}
                >
                  <RefreshCw size={13} />
                  Try again
                </button>
              </div>
            ) : visibleJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-stone-200/70 bg-white py-16 text-center">
                <Briefcase size={26} className="text-stone-300" />
                <p className="text-[13.5px] font-medium text-stone-800">
                  {hasActiveFilters
                    ? "No jobs match your filters."
                    : "No open jobs right now."}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-[12.5px] font-semibold"
                    style={{ color: MAROON }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {visibleJobs.map((job, i) => {
                    const isSaved = savedIds.has(job._id);
                    const isApplying = applyingIds.has(job._id);
                    const isApplied = appliedIds.has(job._id);
                    return (
                      <motion.div
                        key={job._id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(i * 0.03, 0.3),
                        }}
                        onClick={() => navigate(`/candidate/jobs/${job._id}`)}
                        className="relative cursor-pointer rounded-[14px] border border-stone-200/70 bg-white p-5 transition-shadow hover:shadow-[0_10px_26px_-18px_rgba(139,30,47,0.35)]"
                      >
                        {job.featured && (
                          <span
                            className="absolute left-5 top-5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
                            style={{
                              background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})`,
                            }}
                          >
                            Featured
                          </span>
                        )}
                        <CompanyLogo
                          name={job.postedBy?.companyName}
                          logoUrl={job.postedBy?.companyLogoUrl}
                          className="absolute right-5 top-5"
                        />

                        <div className="min-w-0">
                          {" "}
                          <p
                            className="text-[18px] font-bold leading-snug text-stone-900"
                            style={{ fontFamily: FONT_DISPLAY }}
                          >
                            {job.title}
                          </p>
                          <p className="mt-1 text-[14.5px] font-semibold text-stone-700">
                            {job.postedBy?.companyName || "Company"}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-[#6B6259]">
                            Posted by {job.postedBy?.companyName || "Company"}
                            <CompanyRating
                              rating={job.postedBy?.companyRating}
                            />
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center text-[14px] text-stone-600">
                            {job.experienceLevel && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Briefcase
                                    size={14}
                                    className="text-stone-400"
                                  />
                                  {job.experienceLevel}
                                </span>
                                <span className="mx-3 text-stone-300">|</span>
                              </>
                            )}

                            {job.salary && (
                              <>
                                <span className="flex items-center gap-1">
                                  <IndianRupee
                                    size={14}
                                    className="text-stone-400"
                                  />
                                  {job.salary}
                                </span>
                                <span className="mx-3 text-stone-300">|</span>
                              </>
                            )}

                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={14} className="text-stone-400" />
                                {job.location}
                              </span>
                            )}
                          </div>
                          {job.description && (
                            <p className="mt-2 line-clamp-1 text-[14px] text-stone-500">
                              {job.description}
                            </p>
                          )}
                          {Array.isArray(job.skillsRequired) &&
                            job.skillsRequired.length > 0 && (
                              <p className="mt-2 line-clamp-1 text-[13px] text-stone-400">
                                {job.skillsRequired.slice(0, 6).join(" • ")}
                              </p>
                            )}
                          <div className="mt-3 flex items-center justify-between">
                            <p className="flex items-center gap-1 text-[12.5px] text-stone-400">
                              <Clock size={13} />
                              {formatRelativeTime(job.createdAt)}
                            </p>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  hideJob(job._id);
                                }}
                                aria-label="Hide job"
                                className="rounded-[10px] p-2 text-stone-300 transition-colors hover:bg-stone-50 hover:text-stone-500"
                              >
                                <EyeOff size={18} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSave(job._id);
                                }}
                                aria-label={isSaved ? "Unsave job" : "Save job"}
                                className="rounded-[10px] p-2 transition-colors hover:bg-stone-50"
                              >
                                {isSaved ? (
                                  <BookmarkCheck size={18} color={MAROON} />
                                ) : (
                                  <Bookmark
                                    size={18}
                                    className="text-stone-300"
                                  />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
          </div>

          {/* ── RIGHT: filter panel ──────────────────────────────────────── */}
          <aside
            className={`order-1 lg:order-2 ${mobileFiltersOpen ? "block" : "hidden lg:block"}`}
          >
            <div className="sticky top-6 rounded-[18px] border border-stone-200/70 bg-white p-5">
              <p
                className="text-[14px] font-bold text-stone-900"
                style={{ fontFamily: FONT_DISPLAY }}
              >
                Add preferences to get matching jobs
              </p>
              {/* <p className="mt-0.5 text-[11.5px] text-[#6B6259]">
                                Fine-tune your search to see the most relevant openings first.
                            </p> */}

              <div className="mt-4 flex flex-col gap-3">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Search by title, skill…"
                    className="w-full rounded-[10px] border border-stone-200 py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#8B1E2F]/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-stone-500">
                    Preferred job role
                  </label>
                  <RoleMultiSelect selected={roles} onChange={setRoles} />
                </div>

                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-stone-500">
                    Preferred work location
                  </label>
                  <div className="relative">
                    <MapPin
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Bangalore, Remote"
                      className="w-full rounded-[10px] border border-stone-200 py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-stone-500">
                    Preferred salary
                  </label>
                  <select
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2.5 text-[13px] text-stone-700 outline-none focus:border-[#8B1E2F]/40"
                  >
                    {SALARY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-stone-500">
                    Experience level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2.5 text-[13px] text-stone-700 outline-none focus:border-[#8B1E2F]/40"
                  >
                    <option value="">Any experience level</option>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-stone-500">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2.5 text-[13px] text-stone-700 outline-none focus:border-[#8B1E2F]/40"
                  >
                    <option value="">Any industry</option>
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-stone-500">
                    Date posted
                  </label>
                  <select
                    value={datePosted}
                    onChange={(e) => setDatePosted(e.target.value)}
                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2.5 text-[13px] text-stone-700 outline-none focus:border-[#8B1E2F]/40"
                  >
                    {DATE_POSTED_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-1 flex items-center justify-center gap-1.5 rounded-[10px] border border-stone-200 py-2.5 text-[12.5px] font-semibold text-stone-500 transition-colors hover:border-[#8B1E2F]/30 hover:text-[#8B1E2F]"
                  >
                    <X size={13} />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-[12px] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg"
            style={{ background: MAROON_DARK }}
          >
            {toast.message}
            {toast.onUndo && (
              <button
                onClick={() => {
                  toast.onUndo();
                  setToast(null);
                }}
                className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold hover:bg-white/25"
              >
                <Undo2 size={12} />
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}