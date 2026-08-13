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
  Star,
  Building2,
  Clock,
  GraduationCap,
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

export default function RecommendedJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [profile, setProfile] = useState(null);

  // Fetch recommended jobs based on candidate profile
  useEffect(() => {
    async function loadRecommendedJobs() {
      try {
        setLoading(true);
        // First, get candidate profile
        const profileRes = await axiosInstance.get("/candidate/me/profile");
        setProfile(profileRes.data);

        // Then, get recommended jobs
        const jobsRes = await axiosInstance.get("/jobs/recommended");
        setJobs(jobsRes.data || []);

        // Get saved jobs
        const savedRes = await axiosInstance.get("/candidate/saved-jobs");
        setSavedJobs(new Set(savedRes.data?.map((job) => job._id) || []));
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load recommended jobs"
        );
      } finally {
        setLoading(false);
      }
    }

    loadRecommendedJobs();
  }, []);

  async function toggleSaveJob(jobId) {
    try {
      if (savedJobs.has(jobId)) {
        // Unsave
        await axiosInstance.delete(`/candidate/saved-jobs/${jobId}`);
        setSavedJobs((prev) => {
          const updated = new Set(prev);
          updated.delete(jobId);
          return updated;
        });
      } else {
        // Save
        await axiosInstance.post(`/candidate/saved-jobs/${jobId}`);
        setSavedJobs((prev) => new Set(prev).add(jobId));
      }
    } catch (err) {
      console.error("Failed to toggle save job:", err);
    }
  }

  function goToJobDetail(jobId) {
    navigate(`/candidate/jobs/${jobId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: BG }}>
        <CandidateNavbar profile={profile} />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin" size={32} color={MAROON} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <CandidateNavbar profile={profile} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={24} color={MAROON} />
            <h1
              className="text-3xl font-bold"
              style={{ color: MAROON, fontFamily: FONT_DISPLAY }}
            >
              Recommended For You
            </h1>
          </div>
          <p className="text-gray-600">
            Jobs tailored to your profile and preferences
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Briefcase size={48} className="mx-auto mb-4 text-gray-400" />
            <h2
              className="mb-2 text-xl font-bold"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              No recommended jobs yet
            </h2>
            <p className="text-gray-600">
              Complete your profile to get personalized job recommendations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex gap-4">
                  {job.postedBy?.companyLogoUrl && (
                    <img
                      src={job.postedBy.companyLogoUrl}
                      alt={job.postedBy.companyName}
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3
                          className="cursor-pointer text-lg font-bold hover:underline"
                          style={{ color: MAROON, fontFamily: FONT_DISPLAY }}
                          onClick={() => goToJobDetail(job._id)}
                        >
                          {job.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {job.postedBy?.companyName}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleSaveJob(job._id)}
                        className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100"
                      >
                        {savedJobs.has(job._id) ? (
                          <BookmarkCheck
                            size={20}
                            color={MAROON}
                            fill={MAROON}
                          />
                        ) : (
                          <Bookmark size={20} color={MAROON} />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          {job.location}
                        </div>
                      )}
                      {job.salary && (
                        <div className="flex items-center gap-1">
                          <IndianRupee size={16} />
                          {job.salary}
                        </div>
                      )}
                      {job.experienceLevel && (
                        <div className="flex items-center gap-1">
                          <Briefcase size={16} />
                          {job.experienceLevel}
                        </div>
                      )}
                    </div>

                    {job.skillsRequired && job.skillsRequired.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.skillsRequired.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium"
                            style={{ color: MAROON }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {job.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                        {job.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => goToJobDetail(job._id)}
                  className="mt-4 w-full rounded-lg px-4 py-2 font-semibold transition-colors"
                  style={{
                    backgroundColor: MAROON,
                    color: "white",
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = MAROON_DARK)}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = MAROON)}
                >
                  View Details
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
