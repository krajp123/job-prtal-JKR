import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import axiosInstance from "../api/axiosInstance";
import {
  ChevronDown,
  LogOut,
  Settings,
  User,
  HelpCircle,
  Mail,
  Check,
  X,
} from "lucide-react";

export default function RecruiterProfileMenu({ recruiterProfile: initialProfile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);
  // Initialize with initialProfile if provided, otherwise null
  const [recruiterProfile, setRecruiterProfile] = useState(initialProfile || null);
  // Only show loading if we don't have initial data
  const [profileLoading, setProfileLoading] = useState(!initialProfile);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Sync initialProfile to state when it changes
  useEffect(() => {
    if (initialProfile) {
      setRecruiterProfile(initialProfile);
      setProfileLoading(false);
    }
  }, [initialProfile]);

  // Fetch recruiter profile on component mount - always fetch fresh data
  useEffect(() => {
    let mounted = true;
    
    async function fetchProfile() {
      try {
        const { data } = await axiosInstance.get("/recruiter/me/profile");
        if (mounted) {
          setRecruiterProfile(data);
          setProfileLoading(false);
        }
      } catch (err) {
        console.error("Error fetching recruiter profile:", err);
        if (mounted) {
          setProfileLoading(false);
          // If fetch failed and no initialProfile, keep current state
          if (!initialProfile && !recruiterProfile) {
            // Show Avatar as fallback
          }
        }
      }
    }
    
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch invites on mount and when menu opens so count/badge is always accurate
  useEffect(() => {
    let mounted = true;
    async function fetchInvites() {
      try {
        const { data } = await axiosInstance.get("/recruiter/me/invites");
        if (!mounted) return;
        setInvites(data.invites || []);
        setInviteCount((data.invites || []).length || 0);
      } catch (err) {
        // ignore
      }
    }
    fetchInvites();
    return () => {
      mounted = false;
    };
  }, [open]);

  const displayName = user?.name || "Recruiter";
  const companyLogoUrl = recruiterProfile?.companyLogoUrl;

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/");
  };

  return (
    <div className="relative overflow-visible" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open profile menu"
        className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
      >
        {!profileLoading && companyLogoUrl ? (
          <img
            src={companyLogoUrl}
            alt="Company logo"
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <Avatar name={displayName} size={32} ring />
        )}
        {inviteCount > 0 && (
          <span className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/4 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[11px] font-semibold text-white">
            {inviteCount}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-[9999] mt-2 min-w-[12rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </p>
            <p className="text-xs text-slate-500">Recruiter account</p>
          </div>
          <div className="space-y-1 px-2 py-2">
            <Link
              to="/recruiter/company-profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <User size={16} />
              Company profile
            </Link>
            <Link
              to="/recruiter/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Settings size={16} />
              Settings
            </Link>
            <Link
              to="/recruiter/help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <HelpCircle size={16} />
              Help center
            </Link>
            <Link
              to="/recruiter/invites"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Mail size={16} />
              Invites
              {inviteCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {inviteCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
