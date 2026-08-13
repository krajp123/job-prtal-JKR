import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  Wallet,
  BarChart3,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ArrowRightFromLine,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import adminAxiosInstance from '../api/adminAxiosInstance';

const NAV_LINK_SECTIONS = [
  {
    title: 'Core',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/jobs', label: 'Jobs', icon: Briefcase },
      { to: '/applications', label: 'Applications', icon: ClipboardList },
      { to: '/reopen-requests', label: 'Reopen Requests', icon: RefreshCcw },
    ],
  },
  {
    title: 'Users',
    items: [
      { to: '/recruiters', label: 'Recruiters', icon: Building2 },
      { to: '/candidates', label: 'Candidates', icon: Users },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/wallet-payments', label: 'Account', icon: Wallet },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function SidebarLink({ item, collapsed, onNavigate, badgeCount = 0 }) {
  const Icon = item.icon;
  const showBadge = !collapsed && item.to === '/reopen-requests' && badgeCount > 0;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-colors ${
          isActive
            ? 'bg-[#FFF0E8] text-[#C75560] shadow-sm'
            : 'text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#C75560]'
        }`
      }
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap">
          <span>{item.label}</span>
          {showBadge && (
            <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#C75560] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {badgeCount}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const notificationRef = useRef(null);

  const refreshPendingRequests = async () => {
    try {
      const { data } = await adminAxiosInstance.get('/jobs/reopen-requests');
      const pending = Array.isArray(data) ? data.filter((req) => req.status === 'pending') : [];
      setPendingRequests(pending);
    } catch (err) {
      console.error('Failed to fetch pending reopen requests:', err);
    }
  };

  useEffect(() => {
    refreshPendingRequests();
  }, []);

  useEffect(() => {
    const handleReopenRequestsUpdate = () => {
      refreshPendingRequests();
    };

    window.addEventListener('reopenRequestsUpdated', handleReopenRequestsUpdate);

    return () => {
      window.removeEventListener('reopenRequestsUpdated', handleReopenRequestsUpdate);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (requestId) => {
    navigate('/reopen-requests');
    setNotificationsOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-[#FFFDFB] text-[#1D181A]">
      <header className="sticky top-0 z-30 flex flex-col gap-2.5 border-b border-[#EBC2AE] bg-[#FFFDFB] px-4 py-2.5 md:px-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button className="text-[#80576A] md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={19} />
          </button>
          <div className="rounded-lg border border-[#EBC2AE] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#C75560]">
            Admin workspace
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative hidden sm:block">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C75560]" />
            <input
              type="text"
              placeholder="Search recruiters, candidates, jobs..."
              className="w-64 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] py-2 pl-8 pr-3 text-xs text-[#1D181A] outline-none transition focus:border-[#C75560] focus:ring-2 focus:ring-[#C75560]/15"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-lg border border-[#EBC2AE] bg-white p-1.5 text-[#80576A] transition hover:bg-[#FFF0E8] hover:text-[#C75560]"
              >
                <Bell size={17} />
                {pendingRequests.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C75560] text-[9px] font-semibold text-white">
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-[#EBC2AE] bg-white shadow-lg z-50">
                  <div className="sticky top-0 border-b border-[#EBC2AE] bg-[#FFF9F5] px-4 py-3">
                    <p className="text-sm font-semibold text-[#1D181A]">Notifications</p>
                  </div>
                  {pendingRequests.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-[#80576A]">
                      No pending notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EBC2AE]">
                      {pendingRequests.map((request) => (
                        <button
                          key={request._id}
                          onClick={() => handleNotificationClick(request._id)}
                          className="w-full px-4 py-3 text-left hover:bg-[#FFF0E8] transition"
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#C75560]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#1D181A] truncate">
                                {request.job?.title || 'Job Reopen Request'}
                              </p>
                              <p className="text-xs text-[#80576A] mt-0.5">
                                {request.recruiter?.companyName || 'Recruiter'} requested to reopen
                              </p>
                              {request.message && (
                                <p className="text-xs text-[#6B6259] mt-1 line-clamp-2">
                                  "{request.message}"
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {pendingRequests.length > 0 && (
                    <div className="border-t border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2">
                      <button
                        onClick={() => {
                          navigate('/reopen-requests');
                          setNotificationsOpen(false);
                        }}
                        className="w-full py-2 text-center text-xs font-semibold text-[#C75560] hover:text-[#A0182C] transition"
                      >
                        View All Requests →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-2.5 py-1.5 text-xs text-[#1D181A] transition hover:bg-[#FFF0E8]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7C56B] text-[11px] font-semibold text-[#1D181A]">
                AU
              </div>
              <span className="hidden sm:inline">{admin?.name ? admin.name.split(' ')[0] : 'Admin'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
        <div className="mx-auto flex w-full min-h-0 flex-1 max-w-[1480px] gap-4">
          {/* Desktop sidebar */}
          <aside
            className={`relative hidden shrink-0 flex-col rounded-3xl border border-[#EBC2AE] bg-[#FFFDFB] px-2.5 py-4 shadow-sm md:flex transition-all duration-300 ${
              sidebarCollapsed ? 'w-16' : 'w-60'
            }`}
          >
          {/* Collapse toggle — pinned to the sidebar edge, never competes for row space */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#EBC2AE] bg-white text-[#80576A] shadow-sm transition hover:bg-[#FFF0E8] hover:text-[#C75560]"
          >
            {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>

          <div className={`mb-5 flex shrink-0 items-center px-1 ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C75560] text-[13px] font-bold text-white">
              CR
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="whitespace-nowrap text-[13px] font-semibold text-[#1D181A]">Career Route</p>
                <p className="whitespace-nowrap text-[10px] text-[#80576A]">Admin Console</p>
              </div>
            )}
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {NAV_LINK_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1.5">
                {!sidebarCollapsed && (
                  <span className="block px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#80576A]">
                    {section.title}
                  </span>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarLink
                      key={item.to}
                      item={item}
                      collapsed={sidebarCollapsed}
                      badgeCount={item.to === '/reopen-requests' ? pendingRequests.length : 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : undefined}
            className={`mt-2 flex shrink-0 items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'} rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-[#C75560] transition-colors hover:bg-[#FFF0E8]`}
          >
            <ArrowRightFromLine size={16} className="shrink-0" />
            {!sidebarCollapsed && <span className="overflow-hidden whitespace-nowrap">Logout</span>}
          </button>


          {!sidebarCollapsed && (
            <div className="mt-4 shrink-0 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] p-3 text-[11px] leading-tight shadow-sm">
              <p className="text-[#80576A]">Logged in as</p>
              <p className="mt-0.5 break-words font-semibold text-[#1D181A]">{admin?.name || 'Admin User'}</p>
              <p className="text-[10px] text-[#80576A]">{admin?.role || 'admin'}</p>
            </div>
          )}
        </aside>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <aside className="relative z-50 flex w-64 flex-col bg-[#FFFDFB] px-3 py-5">
              <div className="mb-6 flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C75560] text-[13px] font-bold text-white">
                    CR
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1D181A]">Career Route</p>
                    <p className="text-[10px] text-[#80576A]">Admin Console</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-[#80576A]">
                  <X size={19} />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
                {NAV_LINK_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-1.5">
                    <span className="block px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#80576A]">
                      {section.title}
                    </span>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <SidebarLink
                          key={item.to}
                          item={item}
                          collapsed={false}
                          onNavigate={() => setSidebarOpen(false)}
                          badgeCount={item.to === '/reopen-requests' ? pendingRequests.length : 0}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogout();
                }}
                className="mt-4 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-[#C75560] transition-colors hover:bg-[#FFF0E8]"
              >
                <ArrowRightFromLine size={16} className="shrink-0" />
                <span>Logout</span>
              </button>
            </aside>
          </div>
        )}

          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}