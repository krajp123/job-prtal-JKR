import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import CareerWorkspacePanel from '../components/CareerWorkspacePanel';
import VideoModal from '../components/VideoModal';
import { useAuth } from '../context/AuthContext';
import { CandidateWorkspaceProvider } from '../context/CandidateWorkspaceContext';

// Completion weights for profile sections (total = 100)
const COMPLETION_WEIGHTS = { 
    photo: 6, 
    headline: 5,
    about: 6,
    contact: 5,
    skills: 11, 
    experience: 18, 
    education: 11, 
    certifications: 5,
    languages: 4,
    projects: 2,
    portfolio: 1,
    resume: 14, 
    social: 11,
    preferences: 1 
};

// Calculate profile completeness using same logic as Profile page
function getCompletion(profile) {
    const p = profile?.profile || {};
    const social = profile?.socialLinks || {};
    const items = [
        { key: 'photo', done: !!p.profilePictureUrl },
        { key: 'headline', done: !!p.headline },
        { key: 'about', done: !!p.about },
        { key: 'contact', done: !!(p.location || p.phone) },
        { key: 'skills', done: (p.skills || []).length > 0 },
        { key: 'experience', done: (p.experience || []).length > 0 },
        { key: 'education', done: (p.education || []).length > 0 },
        { key: 'certifications', done: (p.certifications || []).length > 0 },
        { key: 'languages', done: (p.languages || []).length > 0 },
        { key: 'projects', done: (p.projects || []).length > 0 },
        { key: 'portfolio', done: (p.portfolio || []).length > 0 },
        { key: 'resume', done: !!p.resumeUrl },
        { key: 'social', done: !!(social.github || social.linkedin || social.website) },
        { key: 'preferences', done: !!p.workPreferences },
    ];
    const rawPercent = items.reduce((sum, i) => sum + (i.done ? COMPLETION_WEIGHTS[i.key] : 0), 0);
    const percent = Math.min(rawPercent, 100);
    const missing = items
        .filter((i) => !i.done)
        .map((i) => ({
            key: i.key,
            label: {
                photo: 'Add profile photo',
                headline: 'Add professional headline',
                about: 'Write your bio',
                contact: 'Add contact info',
                skills: 'Add key skills',
                experience: 'Add experience details',
                education: 'Add education details',
                certifications: 'Add certifications',
                languages: 'Add languages',
                projects: 'Add projects',
                portfolio: 'Add portfolio',
                resume: 'Upload your resume',
                social: 'Add social / portfolio links',
                preferences: 'Set work preferences',
            }[i.key],
        }));
    return { percent, missing };
}

export default function CandidateWorkspaceRoute() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [videoOpen, setVideoOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch profile on mount and when refreshKey changes
    useEffect(() => {
        axiosInstance.get('/candidate/me/profile').then(({ data }) => setProfile(data)).catch((error) => {
            if (error.response?.status === 401) logout({ redirect: true });
        });
    }, [refreshKey, logout]);

    // Listen for profile update events to refresh the profile
    useEffect(() => {
        const handleProfileUpdate = () => {
            setRefreshKey(prev => prev + 1);
        };

        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, []);

    const { percent: completeness, missing: missingItems } = getCompletion(profile);
    const toggleWorkspace = () => setWorkspaceOpen((open) => !open);

    return <CandidateWorkspaceProvider value={{ workspaceOpen }}><>
        <div className="portal-theme mx-auto max-w-7xl px-5 py-5 lg:px-8 lg:py-8">
            <div className={`grid items-start gap-6 transition-all duration-300 lg:gap-7 ${workspaceOpen ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[64px_minmax(0,1fr)]'}`}>
                <div className="lg:hidden"><CareerWorkspacePanel profile={profile} user={user} completeness={completeness} missingItems={missingItems} expanded={workspaceOpen} onToggle={toggleWorkspace} onOpenVideo={() => setVideoOpen(true)} /></div>
                <aside className="hidden lg:sticky lg:top-24 lg:block"><CareerWorkspacePanel profile={profile} user={user} completeness={completeness} missingItems={missingItems} expanded={workspaceOpen} onToggle={toggleWorkspace} onOpenVideo={() => setVideoOpen(true)} compact /></aside>
                <main className="min-w-0"><Outlet /></main>
            </div>
        </div>
        <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </>;</CandidateWorkspaceProvider>;
}