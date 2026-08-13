import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import CareerWorkspacePanel from '../components/CareerWorkspacePanel';
import VideoModal from '../components/VideoModal';
import { useAuth } from '../context/AuthContext';
import { CandidateWorkspaceProvider } from '../context/CandidateWorkspaceContext';

export default function CandidateWorkspaceRoute() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [videoOpen, setVideoOpen] = useState(false);

    useEffect(() => {
        axiosInstance.get('/candidate/me/profile').then(({ data }) => setProfile(data)).catch((error) => {
            if (error.response?.status === 401) logout({ redirect: true });
        });
    }, []);

    const completeness = Math.min(100, Math.max(0, Math.round(profile?.profileCompleteness ?? 20)));
    const missingItems = [
        { key: 'resume', label: 'Upload your resume', done: Boolean(profile?.profile?.resumeUrl) },
        { key: 'skills', label: 'Add your key skills', done: Boolean(profile?.profile?.skills?.length) },
        { key: 'photo', label: 'Add a profile photo', done: Boolean(profile?.profile?.profilePictureUrl) },
    ].filter((item) => !item.done);
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