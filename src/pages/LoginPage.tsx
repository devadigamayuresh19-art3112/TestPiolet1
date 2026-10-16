import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signInWithEmail, resetUserPassword, isSupabaseConfigured } from '../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { user, session, error } = await signInWithEmail(email, password);
      if (error) {
        setErrorMessage(error.message);
      } else if (user || session) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      const { error } = await resetUserPassword(resetEmail);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setResetSent(true);
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-12 bg-[#F7FAF8]">
      {/* LEFT BRAND PANEL (Desktop) */}
      <div className="hidden md:flex md:col-span-5 bg-[#0D3D29] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#18583D]/60 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link to="/home" className="inline-flex items-center gap-2 text-xs font-semibold text-[#A4D1B8] hover:text-white transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#18583D] border border-[#61B487]/40 flex items-center justify-center font-bold text-sm text-[#EAF5EE]">
              TP
            </div>
            <span className="font-extrabold text-lg tracking-tight">TestPilot AI</span>
          </div>

          <h2 className="text-3xl font-extrabold leading-tight tracking-tight mt-6">
            Welcome Back,<br />Tester.
          </h2>
          <p className="mt-3 text-sm text-[#DDE8E0]/80 leading-relaxed max-w-sm">
            Continue exploring your applications with TestPilot AI. Run real browser verifications and review detailed failure evidence.
          </p>
        </div>

        {/* Feature Highlights on Left Panel */}
        <div className="relative z-10 space-y-3 pt-8 border-t border-[#18583D]">
          <div className="flex items-center gap-3 text-xs text-[#A4D1B8]">
            <ShieldCheck className="w-4 h-4 text-[#61B487]" />
            <span>Deterministic Chromium headless runs</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#A4D1B8]">
            <ShieldCheck className="w-4 h-4 text-[#61B487]" />
            <span>Row-level isolated test history</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#A4D1B8]">
            <ShieldCheck className="w-4 h-4 text-[#61B487]" />
            <span>High-resolution failure screenshots</span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-[#A4D1B8]/60">
          VIT Code Apex 3.0 Hackathon · Team Latent
        </div>
      </div>

      {/* RIGHT AUTH PANEL */}
      <div className="col-span-12 md:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="md:hidden flex items-center justify-between pb-4 border-b border-[#DDE8E0]">
            <Link to="/home" className="text-xs font-semibold text-[#18583D] flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <span className="font-bold text-sm text-[#15251D]">TestPilot AI</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#15251D]">
              Sign in to your account
            </h1>
            <p className="mt-1 text-xs text-[#64746A]">
              Enter your credentials to access your autonomous testing dashboard.
            </p>
          </div>

          {/* Notice if Supabase keys are not set in .env yet */}
          {!isSupabaseConfigured && (
            <div className="p-3.5 rounded-xl bg-[#EAF5EE] border border-[#DDE8E0] text-xs text-[#18583D]">
              <div className="font-semibold mb-0.5">Development Environment Active</div>
              <p className="text-[11px] text-[#64746A] leading-relaxed">
                Connect your real Supabase instance anytime via <code className="bg-white px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code>. You can log in with any email to test the workflow immediately!
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#F8D7DA] text-xs text-[#D64545] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#15251D] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE8E0] rounded-xl text-[#15251D] placeholder:text-[#64746A]/50 focus:outline-none focus:border-[#18583D] focus:ring-1 focus:ring-[#18583D] transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#15251D]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs font-medium text-[#18583D] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE8E0] rounded-xl text-[#15251D] placeholder:text-[#64746A]/50 focus:outline-none focus:border-[#18583D] focus:ring-1 focus:ring-[#18583D] transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64746A] hover:text-[#15251D]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#18583D] rounded-xl hover:bg-[#0D3D29] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-[#64746A]">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#18583D] hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#DDE8E0]">
            <h3 className="text-base font-bold text-[#15251D]">Reset Password</h3>
            <p className="text-xs text-[#64746A] mt-1 mb-4">
              Enter your registered email address. We'll send a password reset verification link.
            </p>

            {resetSent ? (
              <div className="p-3 bg-[#EAF5EE] text-[#18583D] rounded-xl text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Password reset email dispatched successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs border border-[#DDE8E0] rounded-lg"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2 text-xs font-semibold text-white bg-[#18583D] rounded-lg hover:bg-[#0D3D29]"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setShowResetModal(false);
                setResetSent(false);
              }}
              className="w-full mt-2 py-1.5 text-xs text-[#64746A] hover:text-[#15251D]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
