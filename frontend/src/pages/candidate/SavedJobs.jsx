import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin,
  IndianRupee,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Loader2,
  Trash2,
  Clock,
  ArrowUpDown,
  X,
  AlertCircle,
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

// ---------- small helpers (kept local, no new files) ----------

function timeAgo(dateString) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
}

function formatSalary(job) {
  if (!job) return null;
  if (job.salary) return job.salary;
  if (job.salaryMin && job.salaryMax) {
    return `₹${job.salaryMin} - ₹${job.salaryMax} LPA`;
  }
  return null;
}

const SORT_OPTIONS = [
  { key: "recent", label: "Recently saved" },
  { key: "title", label: "Job title (A–Z)" },
  { key: "company", label: "Company (A–Z)" },
];

// ---------- skeleton loader ----------

function SavedJobSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex gap-4">
        <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/5 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
          <div className="flex gap-2 pt-1">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SavedJobs() {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [sortKey, setSortKey] = useState("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [undoJob, setUndoJob] = useState(null);

  useEffect(() => {
    async function loadSavedJobs() {
      try {
        setLoading(true);
        const profileRes = await axiosInstance.get("/candidate/me/profile");
        setProfile(profileRes.data);

        const savedRes = await axiosInstance.get("/candidate/me/saved-jobs");
        setSavedJobs(savedRes.data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load saved jobs");
      } finally {
        setLoading(false);
      }
    }

    loadSavedJobs();
  }, []);

  // auto-dismiss the undo toast
  useEffect(() => {
    if (!undoJob) return;
    const t = setTimeout(() => setUndoJob(null), 5000);
    return () => clearTimeout(t);
  }, [undoJob]);

  async function removeSavedJob(job) {
    setRemovingId(job._id);
    try {
      await axiosInstance.delete(`/candidate/me/saved-jobs/${job._id}`);
      setSavedJobs((prev) => prev.filter((j) => j._id !== job._id));
      setUndoJob(job);
    } catch (err) {
      console.error("Failed to remove saved job:", err);
    } finally {
      setRemovingId(null);
    }
  }

  async function undoRemove() {
    if (!undoJob) return;
    const job = undoJob;
    setUndoJob(null);
    try {
      await axiosInstance.post(`/candidate/me/saved-jobs/${job._id}`);
      setSavedJobs((prev) => [job, ...prev]);
    } catch (err) {
      console.error("Failed to restore saved job:", err);
    }
  }

  function goToJobDetail(jobId) {
    navigate(`/candidate/jobs/${jobId}`);
  }

  const sortedJobs = useMemo(() => {
    const arr = [...savedJobs];
    if (sortKey === "title") {
      arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortKey === "company") {
      arr.sort((a, b) =>
        (a.postedBy?.companyName || "").localeCompare(
          b.postedBy?.companyName || ""
        )
      );
    } else {
      arr.sort(
        (a, b) =>
          new Date(b.savedAt || b.createdAt || 0) -
          new Date(a.savedAt || a.createdAt || 0)
      );
    }
    return arr;
  }, [savedJobs, sortKey]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <CandidateNavbar profile={profile} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---------- header ---------- */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${MAROON}14` }}
              >
                <BookmarkCheck size={19} color={MAROON} />
              </span>
              <h1
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                style={{ color: MAROON, fontFamily: FONT_DISPLAY }}
              >
                Saved Jobs
              </h1>
            </div>
            <p
              className="text-sm text-gray-500"
              style={{ fontFamily: FONT_BODY }}
            >
              {loading
                ? "Loading your saved roles…"
                : `${savedJobs.length} role${
                    savedJobs.length !== 1 ? "s" : ""
                  } shortlisted for later`}
            </p>
          </div>

          {!loading && savedJobs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300"
              >
                <ArrowUpDown size={15} />
                {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
              </button>
              {sortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSortOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortKey(opt.key);
                          setSortOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                        style={{
                          color: sortKey === opt.key ? MAROON : "#374151",
                          fontWeight: sortKey === opt.key ? 600 : 400,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ---------- loading ---------- */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SavedJobSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ---------- empty state ---------- */}
        {!loading && savedJobs.length === 0 && (
          <div
            className="rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center"
          >
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${MAROON}0F` }}
            >
              <Bookmark size={26} color={MAROON} />
            </div>
            <h2
              className="mb-1.5 text-lg font-bold text-gray-900"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              No Jobs saved yet!
            </h2>
            <p className="mx-auto mb-6 max-w-sm text-sm text-gray-500">
              Save the jobs as you browse and they'll show up here...
            </p>
            <button
              onClick={() => navigate("/candidate/jobs")}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
              style={{ backgroundColor: MAROON }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = MAROON_DARK)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = MAROON)
              }
            >
              Browse Jobs
            </button>
          </div>
        )}

        {/* ---------- job cards ---------- */}
        {!loading && sortedJobs.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {sortedJobs.map((job) => {
                const salary = formatSalary(job);
                const logo = job.postedBy?.companyLogoUrl;
                const company = job.postedBy?.companyName || "Company";

                return (
                  <motion.div
                    key={job._id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* folded-corner bookmark ribbon signature */}
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-16 w-16 rotate-45"
                      style={{ backgroundColor: `${MAROON}` , opacity: 0.06 }}
                    />
                    <Bookmark
                      size={14}
                      className="absolute left-5 top-5 opacity-70"
                      color={MAROON}
                      fill={MAROON}
                    />

                    <div className="flex flex-row-reverse gap-4">
                      {/* logo / initials avatar */}
                      {logo ? (
                        <img
                          src={logo}
                          alt={company}
                          className="h-14 w-14 flex-shrink-0 rounded-xl border border-gray-100 object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
                          style={{ backgroundColor: MAROON }}
                        >
                          {initials(company)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 pl-1">
                        <h3
                          className="cursor-pointer text-[17px] font-bold leading-snug text-gray-900 transition-colors hover:underline"
                          style={{ fontFamily: FONT_DISPLAY }}
                          onClick={() => goToJobDetail(job._id)}
                        >
                          {job.title}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-gray-600">
                          {company}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-500">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {job.location}
                            </span>
                          )}
                          {salary && (
                            <span className="flex items-center gap-1">
                              <IndianRupee size={14} />
                              {salary}
                            </span>
                          )}
                          {job.experienceLevel && (
                            <span className="flex items-center gap-1">
                              <Briefcase size={14} />
                              {job.experienceLevel}
                            </span>
                          )}
                          {(job.savedAt || job.createdAt) && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Clock size={14} />
                              Saved {timeAgo(job.savedAt || job.createdAt)}
                            </span>
                          )}
                        </div>

                        {job.skillsRequired?.length > 0 && (
                          <div className="mt-3.5 flex flex-wrap gap-1.5">
                            {job.skillsRequired.slice(0, 5).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-md px-2.5 py-1 text-xs font-medium"
                                style={{
                                  backgroundColor: `${MAROON}0D`,
                                  color: MAROON_DARK,
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skillsRequired.length > 5 && (
                              <span className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
                                +{job.skillsRequired.length - 5} more
                              </span>
                            )}
                          </div>
                        )}

                        {job.description && (
                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
                            {job.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* actions */}
                    <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
                      <button
                        onClick={() => goToJobDetail(job._id)}
                        className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-colors sm:flex-initial sm:px-8"
                        style={{ backgroundColor: MAROON }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = MAROON_DARK)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = MAROON)
                        }
                      >
                        View details
                      </button>
                      <button
                        onClick={() => removeSavedJob(job)}
                        disabled={removingId === job._id}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {removingId === job._id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        Remove
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ---------- undo toast ---------- */}
      <AnimatePresence>
        {undoJob && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-xl"
          >
            <span>
              Removed <span className="font-semibold">{undoJob.title}</span>
            </span>
            <button
              onClick={undoRemove}
              className="font-semibold underline decoration-2 underline-offset-2"
              style={{ color: ACCENT }}
            >
              Undo
            </button>
            <button
              onClick={() => setUndoJob(null)}
              className="text-gray-400 hover:text-white"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}