import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCw,
  LogOut,
  ExternalLink,
  Camera,
  Layers,
  History,
  Settings,
  Shield,
  Search,
  Filter,
  Check,
  ChevronRight,
  Menu,
  X,
  FileCode,
  Terminal,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import confetti from 'canvas-confetti';

import { TestRun, TestResultItem, ApiHealthStatus } from '../types';
import {
  getCurrentSession,
  signOutUser,
  fetchUserTestRuns,
  saveLocalTestRun,
  isSupabaseConfigured,
} from '../lib/supabase';
import {
  validateTargetUrl,
  checkBackendHealth,
  createTestRun,
  getTestRuns,
  getTestRunDetails,
} from '../lib/api';

export function DashboardPage() {
  const navigate = useNavigate();

  // Authentication & User State
  const [user, setUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);
  const [authLoading, setAuthLoading] = useState(true);

  // Data State
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Test Run Form State
  const [targetUrl, setTargetUrl] = useState('');
  const [objective, setObjective] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Active / Polling Runs
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);

  // Detail Modal / Drawer
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // UI Navigation Sidebar State
  const [currentTab, setCurrentTab] = useState<'overview' | 'new-run' | 'history' | 'settings'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Backend Health
  const [healthStatus, setHealthStatus] = useState<ApiHealthStatus | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Initial Auth Check
  useEffect(() => {
    getCurrentSession().then(({ session, user }) => {
      if (!session && !user) {
        navigate('/login');
        return;
      }
      setUser(user);
      setAuthToken(session?.access_token);
      setAuthLoading(false);
    });
  }, [navigate]);

  // 2. Initial Backend Health & Runs Load
  useEffect(() => {
    if (!user) return;

    checkBackendHealth().then((health) => {
      setHealthStatus(health);
    });

    loadRuns();
  }, [user, authToken]);

  // Load runs from backend or fallback
  const loadRuns = async () => {
    setLoadingRuns(true);
    try {
      // First try fetching from API backend
      const fetchedRuns = await getTestRuns(authToken);
      setRuns(fetchedRuns);
    } catch (apiErr) {
      console.warn('Backend API runs fetch note, trying direct Supabase query:', apiErr);
      try {
        const supabaseRuns = await fetchUserTestRuns();
        setRuns(supabaseRuns);
      } catch (sbErr) {
        console.error('Failed to load runs:', sbErr);
      }
    } finally {
      setLoadingRuns(false);
      setRefreshing(false);
    }
  };

  // Periodic polling for active test runs
  useEffect(() => {
    if (!activeRunId) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getTestRunDetails(activeRunId, authToken);
        if (updated) {
          setRuns((prev) => {
            const idx = prev.findIndex((r) => r.id === updated.id);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = updated;
              return clone;
            }
            return [updated, ...prev];
          });

          // Check if terminal state reached
          if (['passed', 'failed', 'error', 'cancelled'].includes(updated.status)) {
            setActiveRunId(null);
            clearInterval(interval);
            if (updated.status === 'passed') {
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
              showToast(`Test Run #${updated.id.slice(0, 8)} passed all verification checks!`, 'success');
            } else {
              showToast(`Test Run #${updated.id.slice(0, 8)} finished with status: ${updated.status}`, 'info');
            }
          }
        }
      } catch (pollErr) {
        console.error('Polling error:', pollErr);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeRunId, authToken]);

  // Handle URL Submission
  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    const validation = validateTargetUrl(targetUrl);
    if (!validation.isValid) {
      setUrlError(validation.error || 'Invalid target URL');
      return;
    }

    const cleanUrl = validation.cleanUrl!;
    setSubmitting(true);

    try {
      const response = await createTestRun(
        {
          target_url: cleanUrl,
          objective: objective.trim() || undefined,
        },
        authToken
      );

      showToast(`Test execution queued for ${cleanUrl}`, 'info');
      setActiveRunId(response.run_id);
      setTargetUrl('');
      setObjective('');
      setCurrentTab('overview');

      // Refresh list to show newly queued run
      await loadRuns();
    } catch (err: any) {
      setUrlError(err.message || 'Failed to start test execution.');
      showToast(err.message || 'Execution error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = async (run: TestRun) => {
    setSelectedRun(run);
    setShowDetailModal(true);
    setDetailLoading(true);

    try {
      const detailed = await getTestRunDetails(run.id, authToken);
      if (detailed) {
        setSelectedRun(detailed);
      }
    } catch (err) {
      console.warn('Could not refresh full result items:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    navigate('/login');
  };

  // Calculate Computed Summary Statistics
  const stats = useMemo(() => {
    const total = runs.length;
    const passed = runs.filter((r) => r.status === 'passed').length;
    const failed = runs.filter((r) => r.status === 'failed' || r.status === 'error').length;
    const running = runs.filter((r) => r.status === 'running' || r.status === 'queued').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { total, passed, failed, running, passRate };
  }, [runs]);

  // Filtered recent runs list
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesSearch =
        run.target_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (run.page_title && run.page_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || run.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [runs, searchQuery, statusFilter]);

  // Chart data: Group outcomes by date
  const chartData = useMemo(() => {
    if (runs.length === 0) return [];

    const map: Record<string, { date: string; passed: number; failed: number }> = {};
    // Take up to 10 latest runs in chronological order
    const sorted = [...runs].reverse().slice(-10);

    sorted.forEach((run) => {
      const d = new Date(run.created_at);
      const label = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      if (!map[label]) {
        map[label] = { date: label, passed: 0, failed: 0 };
      }
      if (run.status === 'passed') {
        map[label].passed += 1;
      } else if (run.status === 'failed' || run.status === 'error') {
        map[label].failed += 1;
      }
    });

    return Object.values(map);
  }, [runs]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center p-6 text-sm text-[#64746A]">
        <div className="flex items-center gap-3">
          <RotateCw className="w-5 h-5 animate-spin text-[#18583D]" />
          <span>Loading workspace session...</span>
        </div>
      </div>
    );
  }

  const userDisplayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tester';
  const userInitials = (userDisplayName[0] || 'T').toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs flex items-center gap-2.5 transition-all ${
            toast.type === 'success'
              ? 'bg-[#EAF5EE] border-[#61B487] text-[#18583D]'
              : toast.type === 'error'
              ? 'bg-[#FFF5F5] border-[#F8D7DA] text-[#D64545]'
              : 'bg-white border-[#DDE8E0] text-[#15251D]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#18583D]" />
          ) : toast.type === 'error' ? (
            <XCircle className="w-4 h-4 text-[#D64545]" />
          ) : (
            <Info className="w-4 h-4 text-[#18583D]" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0D3D29] text-white flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Sidebar Header Brand */}
          <div className="h-18 px-6 flex items-center justify-between border-b border-[#18583D]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#18583D] border border-[#61B487]/40 flex items-center justify-center font-bold text-sm text-[#EAF5EE]">
                TP
              </div>
              <span className="font-bold text-base tracking-tight text-white">TestPilot AI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-[#A4D1B8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            <button
              onClick={() => {
                setCurrentTab('overview');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'overview'
                  ? 'bg-[#18583D] text-white shadow-xs'
                  : 'text-[#A4D1B8] hover:bg-[#18583D]/50 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => {
                setCurrentTab('new-run');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'new-run'
                  ? 'bg-[#18583D] text-white shadow-xs'
                  : 'text-[#A4D1B8] hover:bg-[#18583D]/50 hover:text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>New Test Run</span>
            </button>

            <button
              onClick={() => {
                setCurrentTab('history');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'history'
                  ? 'bg-[#18583D] text-white shadow-xs'
                  : 'text-[#A4D1B8] hover:bg-[#18583D]/50 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Test History</span>
            </button>

            <button
              onClick={() => {
                setCurrentTab('settings');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-[#18583D] text-white shadow-xs'
                  : 'text-[#A4D1B8] hover:bg-[#18583D]/50 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings & Integrations</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Account & Logout */}
        <div className="p-4 border-t border-[#18583D]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#092418]">
            <div className="w-8 h-8 rounded-full bg-[#18583D] text-[#EAF5EE] font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{userDisplayName}</div>
              <div className="text-[10px] text-[#A4D1B8] truncate">{user?.email}</div>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#D64545] hover:bg-[#D64545]/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-18 px-6 bg-white border-b border-[#DDE8E0] flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-[#64746A] hover:text-[#15251D]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#15251D]">
                {currentTab === 'overview'
                  ? 'Testing Overview'
                  : currentTab === 'new-run'
                  ? 'Launch Test Run'
                  : currentTab === 'history'
                  ? 'Execution History'
                  : 'Workspace Configuration'}
              </h1>
              <p className="text-[11px] text-[#64746A]">
                Welcome back, <span className="font-semibold text-[#15251D]">{userDisplayName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                loadRuns();
              }}
              title="Refresh run data"
              className="p-2 text-[#64746A] hover:text-[#18583D] border border-[#DDE8E0] rounded-lg hover:bg-[#F7FAF8] transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Backend Automation Status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#EAF5EE] text-[#18583D] border border-[#DDE8E0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#18583D]" />
              <span>Chromium Automation Active</span>
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY */}
        <main className="p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* SECTION A: SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#DDE8E0] shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#64746A]">
                <span>Total Test Runs</span>
                <Layers className="w-4 h-4 text-[#18583D]" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#15251D] font-mono tabular-nums">
                {stats.total}
              </div>
              <div className="mt-1 text-[11px] text-[#64746A]">Stored in database</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#DDE8E0] shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#64746A]">
                <span>Passed Runs</span>
                <CheckCircle2 className="w-4 h-4 text-[#18583D]" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#18583D] font-mono tabular-nums">
                {stats.passed}
              </div>
              <div className="mt-1 text-[11px] text-[#18583D]">
                {stats.passRate}% verification rate
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#DDE8E0] shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#64746A]">
                <span>Failed Runs</span>
                <XCircle className="w-4 h-4 text-[#D64545]" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#D64545] font-mono tabular-nums">
                {stats.failed}
              </div>
              <div className="mt-1 text-[11px] text-[#D64545]">Detected discrepancies</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#DDE8E0] shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#64746A]">
                <span>Running Tests</span>
                <Clock className="w-4 h-4 text-[#D99525]" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#D99525] font-mono tabular-nums">
                {stats.running}
              </div>
              <div className="mt-1 text-[11px] text-[#D99525]">Active Playwright sessions</div>
            </div>
          </div>

          {/* ACTIVE RUNNING BANNER (If a test is currently executing) */}
          {activeRunId && (
            <div className="p-5 rounded-2xl bg-[#EAF5EE] border border-[#61B487]/50 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#18583D] text-white flex items-center justify-center shrink-0">
                  <RotateCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#18583D]">
                    Active Test Execution in Progress
                  </div>
                  <div className="text-xs text-[#64746A] mt-0.5">
                    Target Run ID: <span className="font-mono text-[#15251D] font-medium">{activeRunId}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#18583D] font-mono bg-white px-3 py-1.5 rounded-lg border border-[#DDE8E0]">
                <span>Chromium Engine Executing Checks...</span>
              </div>
            </div>
          )}

          {/* SECTION B: NEW TEST RUN FORM CARD */}
          {(currentTab === 'overview' || currentTab === 'new-run') && (
            <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#DDE8E0] shadow-sm">
              <div className="max-w-2xl mb-6">
                <h2 className="text-lg font-bold text-[#15251D]">Launch New Autonomous Test Run</h2>
                <p className="text-xs text-[#64746A] mt-1">
                  Provide an HTTP or HTTPS target web application. TestPilot AI will spin up a Playwright
                  Chromium session, verify navigation and DOM health, capture screenshot evidence, and log results.
                </p>
              </div>

              {urlError && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#FFF5F5] border border-[#F8D7DA] text-xs text-[#D64545] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{urlError}</span>
                </div>
              )}

              <form onSubmit={handleStartTest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#15251D] mb-1.5">
                    Website URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      required
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 px-4 py-3 text-sm bg-[#F7FAF8] border border-[#DDE8E0] rounded-xl text-[#15251D] placeholder:text-[#64746A]/50 focus:outline-none focus:border-[#18583D] focus:ring-1 focus:ring-[#18583D] transition-all font-mono"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 text-sm font-semibold text-white bg-[#18583D] rounded-xl hover:bg-[#0D3D29] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Spawning Browser...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Start Test</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#15251D] mb-1.5">
                    Test Objective <span className="font-normal text-[#64746A]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Check whether the homepage and main navigation load correctly."
                    className="w-full px-4 py-2.5 text-xs bg-[#F7FAF8] border border-[#DDE8E0] rounded-xl text-[#15251D] placeholder:text-[#64746A]/50 focus:outline-none focus:border-[#18583D] focus:ring-1 focus:ring-[#18583D] transition-all"
                  />
                </div>

                {/* Quick Presets for Convenient Testing */}
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#64746A] text-[11px]">Authorized Dev Targets:</span>
                  <button
                    type="button"
                    onClick={() => setTargetUrl('http://localhost:3000')}
                    className="px-2.5 py-1 rounded-md bg-[#EAF5EE] border border-[#61B487]/40 text-[#18583D] hover:bg-[#d5ebdc] transition-colors font-mono text-[11px] cursor-pointer"
                  >
                    http://localhost:3000
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetUrl('http://127.0.0.1:8000/api/health')}
                    className="px-2.5 py-1 rounded-md bg-[#EAF5EE] border border-[#61B487]/40 text-[#18583D] hover:bg-[#d5ebdc] transition-colors font-mono text-[11px] cursor-pointer"
                  >
                    http://127.0.0.1:8000
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetUrl('https://example.com')}
                    className="px-2.5 py-1 rounded-md bg-[#F7FAF8] border border-[#DDE8E0] text-[#18583D] hover:bg-[#EAF5EE] transition-colors font-mono text-[11px] cursor-pointer"
                  >
                    https://example.com
                  </button>
                  <span className="text-[10px] text-[#64746A] ml-auto">
                    Configure additional domains via <code className="bg-[#F7FAF8] px-1 py-0.5 rounded font-mono">ALLOWED_TEST_DOMAINS</code>
                  </span>
                </div>
              </form>
            </div>
          )}

          {/* SECTION E: BASIC ACTIVITY VISUALIZATION */}
          {(currentTab === 'overview' || currentTab === 'history') && chartData.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-[#DDE8E0] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#15251D]">Test Execution Activity</h3>
                  <p className="text-xs text-[#64746A]">
                    Deterministic outcomes recorded over recent test runs
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[#18583D]" />
                    <span className="text-[#64746A]">Passed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[#D64545]" />
                    <span className="text-[#64746A]">Failed</span>
                  </div>
                </div>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64746A' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64746A' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #DDE8E0',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="passed" fill="#18583D" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" fill="#D64545" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SECTION C: RECENT TEST RUNS TABLE */}
          {(currentTab === 'overview' || currentTab === 'history') && (
            <div className="rounded-3xl bg-white border border-[#DDE8E0] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#DDE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#15251D]">Recent Test Runs</h3>
                  <p className="text-xs text-[#64746A]">
                    Detailed verification records and browser execution history
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64746A]" />
                    <input
                      type="text"
                      placeholder="Filter by URL or Run ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-[#F7FAF8] border border-[#DDE8E0] rounded-lg text-[#15251D] focus:outline-none focus:border-[#18583D]"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-[#F7FAF8] border border-[#DDE8E0] rounded-lg text-[#64746A] focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>

              {loadingRuns ? (
                <div className="p-12 text-center text-xs text-[#64746A]">
                  <RotateCw className="w-6 h-6 animate-spin text-[#18583D] mx-auto mb-3" />
                  <span>Loading recent test runs...</span>
                </div>
              ) : filteredRuns.length === 0 ? (
                /* SECTION C: HELPFUL EMPTY STATE */
                <div className="p-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#15251D]">No test runs found</h4>
                  <p className="text-xs text-[#64746A] max-w-sm mx-auto mt-1 mb-5">
                    {runs.length === 0
                      ? 'Submit your first website target above to execute a real Playwright browser test.'
                      : 'No test runs match your search query or filter.'}
                  </p>
                  {runs.length === 0 && (
                    <button
                      onClick={() => setTargetUrl('https://example.com')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#18583D] rounded-lg hover:bg-[#0D3D29] cursor-pointer"
                    >
                      Try with https://example.com
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#DDE8E0] bg-[#F7FAF8] text-[#64746A]">
                        <th className="py-3 px-6">Run ID</th>
                        <th className="py-3 px-6">Target Website</th>
                        <th className="py-3 px-6">Date & Time</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6">Checks Passed</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDE8E0]">
                      {filteredRuns.map((run) => (
                        <tr key={run.id} className="hover:bg-[#F7FAF8]/70 transition-colors">
                          <td className="py-3.5 px-6 font-mono text-[#64746A]">
                            #{run.id.slice(0, 8)}
                          </td>
                          <td className="py-3.5 px-6 font-medium text-[#15251D]">
                            <div className="truncate max-w-xs" title={run.target_url}>
                              {run.target_url}
                            </div>
                            {run.page_title && (
                              <div className="text-[11px] text-[#64746A] truncate max-w-xs font-normal">
                                {run.page_title}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-[#64746A] whitespace-nowrap">
                            {new Date(run.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                run.status === 'passed'
                                  ? 'bg-[#EAF5EE] text-[#18583D]'
                                  : run.status === 'failed'
                                  ? 'bg-[#FFF5F5] text-[#D64545]'
                                  : run.status === 'running'
                                  ? 'bg-[#FEF8EC] text-[#D99525]'
                                  : 'bg-neutral-100 text-[#64746A]'
                              }`}
                            >
                              {run.status === 'passed' && <CheckCircle2 className="w-3 h-3" />}
                              {run.status === 'failed' && <XCircle className="w-3 h-3" />}
                              {run.status === 'running' && <RotateCw className="w-3 h-3 animate-spin" />}
                              <span>{run.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono tabular-nums text-[#15251D]">
                            {run.passed_checks} / {run.total_checks}
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleOpenDetails(run)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#18583D] hover:bg-[#EAF5EE] transition-colors cursor-pointer"
                            >
                              View Details →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS & SETUP GUIDE */}
          {currentTab === 'settings' && (
            <div className="space-y-6">
              <div className="p-8 rounded-3xl bg-white border border-[#DDE8E0] shadow-sm">
                <h3 className="text-base font-bold text-[#15251D] mb-2">Integration & Backend Status</h3>
                <p className="text-xs text-[#64746A] mb-6">
                  Review the active configuration for Playwright headless browser automation, Supabase PostgreSQL, and security rules.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#15251D]">Browser Automation</span>
                      <span className="text-xs font-bold text-[#18583D]">Playwright Chromium</span>
                    </div>
                    <div className="text-[11px] text-[#64746A] mt-2">
                      Isolated headless browser sessions with automatic resource cleanup and timeouts.
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#15251D]">Database & Auth</span>
                      <span className="text-xs font-bold text-[#18583D]">
                        {isSupabaseConfigured ? 'Supabase Connected' : 'Local Workspace Dev Mode'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64746A] mt-2">
                      Row-Level Security (RLS) policies guarantee user data isolation.
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#DDE8E0]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#18583D] mb-2">
                    Supabase Migration Script
                  </h4>
                  <p className="text-xs text-[#64746A] mb-3">
                    The schema and RLS policies are available in <code className="bg-[#EAF5EE] px-1 py-0.5 rounded font-mono">supabase/setup.sql</code>.
                    Run it directly in your Supabase SQL editor to create the profiles, test_runs, and test_results tables.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SECTION D: DETAILED TEST RESULT MODAL / DRAWER */}
      {showDetailModal && selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#DDE8E0] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#DDE8E0] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-[#64746A]">
                    Run #{selectedRun.id.slice(0, 8)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedRun.status === 'passed'
                        ? 'bg-[#EAF5EE] text-[#18583D]'
                        : selectedRun.status === 'failed'
                        ? 'bg-[#FFF5F5] text-[#D64545]'
                        : selectedRun.status === 'running'
                        ? 'bg-[#FEF8EC] text-[#D99525]'
                        : 'bg-neutral-100 text-[#64746A]'
                    }`}
                  >
                    {selectedRun.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#15251D] mt-1 break-all">
                  {selectedRun.target_url}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-[#64746A] hover:text-[#15251D] rounded-lg hover:bg-[#F7FAF8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Target & Execution Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0]">
                <div>
                  <span className="text-[#64746A]">HTTP Status</span>
                  <div className="font-mono font-bold text-[#15251D] mt-0.5">
                    {selectedRun.http_status ? `HTTP ${selectedRun.http_status}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-[#64746A]">Checks Passed</span>
                  <div className="font-mono font-bold text-[#15251D] mt-0.5">
                    {selectedRun.passed_checks} / {selectedRun.total_checks}
                  </div>
                </div>
                <div>
                  <span className="text-[#64746A]">Started</span>
                  <div className="font-mono text-[#15251D] mt-0.5">
                    {selectedRun.started_at ? new Date(selectedRun.started_at).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-[#64746A]">Completed</span>
                  <div className="font-mono text-[#15251D] mt-0.5">
                    {selectedRun.completed_at ? new Date(selectedRun.completed_at).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Resolved Page Title */}
              {selectedRun.page_title && (
                <div>
                  <span className="font-semibold text-[#15251D]">Page Document Title:</span>
                  <div className="mt-1 p-2.5 rounded-lg bg-[#F7FAF8] border border-[#DDE8E0] text-[#15251D] font-mono">
                    {selectedRun.page_title}
                  </div>
                </div>
              )}

              {/* Error Message if run failed */}
              {selectedRun.error_message && (
                <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#F8D7DA] text-[#D64545]">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Run Failure Detail</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed">{selectedRun.error_message}</p>
                </div>
              )}

              {/* Test Case Breakdown */}
              <div>
                <h4 className="font-bold text-[#15251D] text-sm mb-3">Verification Checks</h4>
                {selectedRun.results && selectedRun.results.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRun.results.map((check) => (
                      <div
                        key={check.id}
                        className={`p-3.5 rounded-xl border ${
                          check.status === 'passed'
                            ? 'bg-[#F7FAF8] border-[#DDE8E0]'
                            : 'bg-[#FFF5F5] border-[#F8D7DA]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#15251D]">{check.test_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              check.status === 'passed'
                                ? 'bg-[#EAF5EE] text-[#18583D]'
                                : 'bg-[#D64545] text-white'
                            }`}
                          >
                            {check.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[11px]">
                          <div>
                            <span className="text-[#64746A]">Expected:</span>
                            <div className="text-[#15251D]">{check.expected_result}</div>
                          </div>
                          <div>
                            <span className="text-[#64746A]">Observed:</span>
                            <div className="text-[#15251D]">{check.actual_result}</div>
                          </div>
                        </div>

                        {check.reproduction_steps && check.reproduction_steps.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-[#DDE8E0]/70 text-[11px]">
                            <span className="font-semibold text-[#64746A]">Reproduction Steps:</span>
                            <ol className="list-decimal list-inside mt-1 text-[#15251D] space-y-0.5">
                              {check.reproduction_steps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0] text-[#64746A] text-center">
                    No individual checks logged for this run.
                  </div>
                )}
              </div>

              {/* Evidence Screenshot */}
              {selectedRun.screenshot_path && (
                <div>
                  <h4 className="font-bold text-[#15251D] text-sm mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#18583D]" />
                    <span>Captured Browser Evidence</span>
                  </h4>
                  <div className="rounded-xl border border-[#DDE8E0] overflow-hidden bg-neutral-900">
                    <img
                      src={selectedRun.screenshot_path}
                      alt={`Evidence screenshot for ${selectedRun.target_url}`}
                      className="w-full h-auto max-h-96 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#DDE8E0] bg-[#F7FAF8] flex items-center justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#18583D] rounded-lg hover:bg-[#0D3D29] cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#DDE8E0]">
            <h3 className="text-base font-bold text-[#15251D]">Confirm Sign Out</h3>
            <p className="text-xs text-[#64746A] mt-2 mb-6">
              Are you sure you want to end your current session? You will be redirected to the login page.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-[#64746A] hover:text-[#15251D]"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#D64545] rounded-lg hover:bg-[#b03030] cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
