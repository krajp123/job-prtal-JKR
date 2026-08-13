import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    ArrowRight,
    FileText,
    IndianRupee,
    Loader2,
    Mail,
    MapPin,
    UploadCloud,
    X,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import CandidateNavbar from "../../components/CandidateNavbar";
import { BG, FONT_BODY, MAROON } from "../../theme";

function JobCard({ job }) {
    return (
        <Link
            to={`/candidate/jobs/${job._id}`}
            className="group block rounded-[18px] border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#8B1E2F]/30 hover:shadow-[0_16px_30px_-22px_rgba(139,30,47,0.35)]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[15px] font-bold text-stone-900">{job.title}</p>
                    <p className="mt-1 text-[12px] text-[#6B6259]">
                        {job.postedBy?.companyName || "Company"}
                    </p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8B1E2F] bg-[#8B1E2F1E]">
                    Match {job.matchScore}
                </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#6B6259]">
                {job.location && (
                    <span className="flex items-center gap-1">
                        <MapPin size={11.5} />
                        {job.location}
                    </span>
                )}
                {job.salary && (
                    <span className="flex items-center gap-1">
                        <IndianRupee size={11.5} />
                        {job.salary}
                    </span>
                )}
            </div>

            {job.matchedKeywords?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {job.matchedKeywords.map((keyword) => (
                        <span
                            key={keyword}
                            className="rounded-full bg-stone-100 px-2.5 py-1 text-[10.5px] font-semibold text-stone-600"
                        >
                            {keyword}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 text-[12px] font-semibold text-[#8B1E2F]">
                Open job
                <ArrowRight size={14} />
            </div>
        </Link>
    );
}

export default function ResumeMatch() {
    const fileInputRef = useRef(null);
    const [selectedFileName, setSelectedFileName] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactStatus, setContactStatus] = useState("");
    const [contactError, setContactError] = useState("");

    function triggerFilePicker() {
        fileInputRef.current?.click();
    }

    async function analyzeResume(file) {
        if (!file) {
            setError("Please select a PDF resume to continue.");
            return;
        }

        setLoading(true);
        setError("");
        setContactStatus("");
        setContactError("");
        setAnalysis(null);

        const formData = new FormData();
        formData.append("resume", file);

        try {
            const { data } = await axiosInstance.post(
                "/jobs/analyze-resume",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                },
            );
            setAnalysis(data);
            setSelectedFileName(file.name);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to process the resume at the moment. Please try again later.",
            );
        } finally {
            setLoading(false);
        }
    }

    function handleFileChange(event) {
        const file = event.target.files?.[0] || null;
        if (!file) {
            return;
        }
        if (file.type !== "application/pdf") {
            setError("Please upload a PDF resume.");
            return;
        }
        analyzeResume(file);
    }

    async function handleContactSubmit(event) {
        event.preventDefault();
        setContactStatus("");
        setContactError("");

        if (!contactEmail.trim()) {
            setContactError("Enter your email address so we can contact you.");
            return;
        }

        try {
            const { data } = await axiosInstance.post("/jobs/resume-contact", {
                email: contactEmail.trim(),
            });
            setContactStatus(
                data.message ||
                "Thank you. We will contact you when a suitable opportunity is available.",
            );
            setContactEmail("");
        } catch (err) {
            setContactError(
                err.response?.data?.error ||
                "Could not submit your request. Please try again.",
            );
        }
    }

    return (
        <div
            className="portal-theme min-h-[100dvh] w-full overflow-x-hidden"
            style={{ background: '#FFF7F2', fontFamily: FONT_BODY }}
        >
            <CandidateNavbar />

            <main className="mx-auto max-w-5xl px-6 py-10">
                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    {/* Left Sidebar */}
                    <div className="rounded-[22px] border border-stone-200 bg-white p-6 shadow-sm h-fit">
                        <div className="flex flex-col gap-3">
                            {selectedFileName && (
                                <div className="rounded-[14px] border border-stone-200 bg-[#FCFBF9] px-4 py-3 text-[13px] text-[#6B6259]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-[#8B1E2F]" />
                                            <span className="truncate">{selectedFileName}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedFileName("");
                                                setAnalysis(null);
                                                setError("");
                                                setContactStatus("");
                                                setContactError("");
                                            }}
                                            className="rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                                            aria-label="Clear selected file"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            {loading && (
                                <div className="mt-2 flex items-center gap-2 text-[13px] text-[#6B6259]">
                                    <Loader2 size={16} className="animate-spin text-[#8B1E2F]" />
                                    <span>Analyzing resume...</span>
                                </div>
                            )}

                            {error && (
                                <div className="mt-3 rounded-[14px] bg-[#FDE8E8] px-4 py-3 text-[13px] font-medium text-[#B23B3B]">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 rounded-[18px] border border-stone-200 bg-[#FCFBF9] p-4 text-[13px] text-[#6B6259]">
                                <p className="font-semibold text-stone-900">How it works</p>
                                <div className="mt-3 space-y-2 text-[13px] text-[#6B6259]">
                                    <p>1. Upload your resume as a PDF.</p>
                                    <p>
                                        2. We extract core keywords and compare them against active
                                        recruiter job listings.
                                    </p>
                                    <p>3. High-confidence matches appear immediately.</p>
                                    <p>
                                        4. If there is no suitable role, provide your email and we
                                        will notify you when one becomes available.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-6">
                        {/* Header */}
                        <div className="rounded-[22px] border border-stone-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[12px] uppercase tracking-[0.22em] text-[#8B1E2F]">
                                        Resume Match
                                    </p>
                                    <h1 className="mt-2 text-3xl font-bold text-stone-900">
                                        Resume matching for active opportunities
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-[14px] text-[#6B6259]">
                                        Upload your resume and our system will extract core keywords,
                                        assess your profile, and surface the most relevant recruiter job
                                        listings.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Resume Uploader */}
                        <div className="rounded-[22px] border border-stone-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[13px] font-semibold text-stone-900">
                                        Resume uploader
                                    </p>
                                    <p className="mt-1 text-[13px] text-[#6B6259]">
                                        Select a PDF resume and our matching engine will analyze it
                                        instantly. Upload resume.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={triggerFilePicker}
                                className="mt-4 inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#8B1E2F] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#7b1825]"
                            >
                                <UploadCloud size={16} />
                                {selectedFileName ? "Upload another resume" : "Upload resume"}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}