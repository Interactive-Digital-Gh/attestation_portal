import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CircleHelp, CircleUser, ChevronDown, Files, Receipt, ListChecks, LogOut, Menu, X, User } from 'lucide-react';
import ApplicationDetailsModal from './components/ApplicationDetailsModal';
import AdinkraBand from './components/AdinkraBand';
import LogoCrest from '../../assets/images/Logo_crest.png';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';

// `match` segments keep a tab highlighted on its sub-flows (e.g. Applications during a new application).
const NAV_ITEMS = [
  { path: '/dashboard/applications', label: 'Applications', icon: Files, match: ['/applications', '/new-application'] },
  { path: '/dashboard/invoices', label: 'Invoices', icon: Receipt, match: ['/invoices'] },
  { path: '/dashboard/track-status', label: 'Track status', icon: ListChecks, match: ['/track-status'] },
];

const fetchUserApplications = (userId) =>
  supabase.from('applications').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });

const HEADER_GRADIENT = 'linear-gradient(90deg, #0B1A30 0%, #0C2A52 55%, #0E3F7F 100%)';

/** Applicant portal shell: navy header, flag stripe, content, footer and Adinkra band. */
const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const applyApplications = useCallback(({ data, error }) => {
    if (error) console.error('Error fetching applications:', error);
    else setApplications(data || []);
    setIsLoading(false);
  }, []);

  // Initial load (and reload when the signed-in user changes).
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    fetchUserApplications(user.id).then((result) => {
      if (active) applyApplications(result);
    });
    return () => {
      active = false;
    };
  }, [user, applyApplications]);

  // Manual refresh exposed to child routes (e.g. after a submission).
  const fetchApplications = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    fetchUserApplications(user.id).then(applyApplications);
  }, [user, applyApplications]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const isActive = (item) => item.match.some((segment) => location.pathname.includes(segment));
  const displayName = profile?.full_name?.split(' ').slice(0, 2).join(' ') || 'My Account';
  const mobileName = profile?.full_name || 'My Account';

  return (
    <div className="min-h-screen flex flex-col font-inter text-neutral-800 bg-white">
      {/* Header */}
      <header className="relative z-30" style={{ background: HEADER_GRADIENT }}>
        <div className="max-w-[1728px] mx-auto px-5 lg:px-11 h-[72px] lg:h-[115px] flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 lg:gap-[17px] min-w-0">
            <img src={LogoCrest} alt="Ghana coat of arms" className="h-11 lg:h-[66px] w-auto shrink-0" />
            <div className="flex flex-col gap-[3px] leading-[1.18] min-w-0">
              <h1 className="text-white font-medium text-sm lg:text-base truncate">Ministry of Foreign Affairs</h1>
              <p className="text-brand-gold-500 text-[11px] lg:text-sm truncate">
                Republic of Ghana
                <span className="inline-block w-3 lg:w-4" aria-hidden="true" />
                Document Attestation Portal
              </p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex h-full items-stretch gap-10 xl:gap-20" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const { path, label, icon: Icon } = item;
              const active = isActive(item);
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => navigate(path)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative h-full flex items-center gap-2 text-lg xl:text-xl font-medium transition-colors ${
                    active ? 'text-brand-navy-50' : 'text-brand-navy-200 hover:text-brand-navy-50'
                  }`}
                >
                  {active && <span className="absolute top-0 left-0 right-0 h-[1.5px] bg-brand-gold-600" aria-hidden="true" />}
                  <Icon className="size-6" strokeWidth={1.5} />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Right: help + profile + hamburger */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <a
              href="mailto:support@mfa.gov.gh"
              className="hidden xl:flex items-center gap-2 text-brand-navy-50 text-sm font-medium hover:text-white transition-colors"
            >
              <CircleHelp className="size-6" strokeWidth={1.5} />
              Help
            </a>

            <div
              className="hidden lg:block relative"
              onMouseEnter={() => setIsProfileOpen(true)}
              onMouseLeave={() => setIsProfileOpen(false)}
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                className="flex items-center gap-[10px] h-[54px] pl-[18px] pr-3 rounded-full border-[1.5px] border-brand-navy-50 text-white hover:bg-white/10 transition-colors"
              >
                <CircleUser className="size-6 text-brand-navy-50" strokeWidth={1.5} />
                <span className="text-base font-medium leading-[1.18] max-w-[160px] truncate">{displayName}</span>
                <ChevronDown
                  className={`size-6 text-brand-navy-50 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`}
                  strokeWidth={1.5}
                />
              </button>
              {isProfileOpen && (
                <div
                  role="menu"
                  className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-lg shadow-xl border border-neutral-100 py-1.5 animate-fade-in-up z-50"
                >
                  <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                    <p className="text-[11px] text-neutral-400 font-medium">Logged in as</p>
                    <p className="text-xs font-bold text-neutral-800 truncate">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-2 text-left text-xs text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    My Profile
                  </button>
                  <div className="h-px bg-neutral-100 my-1" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left text-xs text-red-600 font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Ghana flag stripe */}
        <div className="h-1 w-full flex" aria-hidden="true">
          <div className="bg-brand-red-500 rounded-full" style={{ width: '47%' }} />
          <div className="bg-brand-gold-600 rounded-full -ml-1" style={{ width: '28%' }} />
          <div className="bg-brand-green-600 rounded-full -ml-1 flex-1" />
        </div>

        {/* Mobile drawer */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden absolute top-full left-0 w-full animate-slide-down shadow-2xl overflow-hidden flex flex-col rounded-b-[20px]"
            style={{ background: HEADER_GRADIENT }}
          >
            <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <CircleUser className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">{mobileName}</p>
                <p className="text-white/50 text-xs mt-0.5 truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="flex flex-col px-4 pt-3 pb-2 gap-1" aria-label="Primary">
              {NAV_ITEMS.map((item) => {
                const { path, label, icon: Icon } = item;
                const active = isActive(item);
                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => {
                      navigate(path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-left transition-all duration-200 border-l-[3px] ${
                      active
                        ? 'bg-white/15 border-brand-gold-500 text-brand-gold-500 font-semibold'
                        : 'border-transparent text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand-gold-500' : 'text-white/50'}`} strokeWidth={1.5} />
                    <span className="text-[15px]">{label}</span>
                  </button>
                );
              })}
              <a
                href="mailto:support@mfa.gov.gh"
                className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-left border-l-[3px] border-transparent text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <CircleHelp className="w-5 h-5 shrink-0 text-white/50" strokeWidth={1.5} />
                <span className="text-[15px]">Help</span>
              </a>
            </nav>

            <div className="px-4 pb-5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-white/50 hover:text-red-400 transition-colors text-sm rounded-xl hover:bg-white/5 w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {isMobileMenuOpen && <div className="fixed inset-0 z-20 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* Page body */}
      <div className="relative flex-1 flex flex-col bg-[#fcfcfd] overflow-hidden">
        <main className="relative z-10 flex-1 w-full max-w-[1728px] mx-auto px-5 md:px-8 lg:px-12 xl:px-16 2xl:px-[109px] pt-8 lg:pt-[63px] pb-16">
          <Outlet context={{ applications, isLoading, fetchApplications, setSelectedApplication }} />
        </main>

        <footer className="relative z-10 pt-16 pb-7 flex flex-col items-center gap-[5px] text-neutral-400 text-xs">
          <p>attestation.mfa.gov.gh</p>
          <p>© 2026 Ministry of Foreign Affairs, Ghana</p>
        </footer>

        <AdinkraBand />
      </div>

      {selectedApplication && (
        <ApplicationDetailsModal application={selectedApplication} onClose={() => setSelectedApplication(null)} />
      )}
    </div>
  );
};

export default Dashboard;
