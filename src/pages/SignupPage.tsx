import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signUpWithEmail, isSupabaseConfigured } from '../lib/supabase';

export function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);
    try {
      const { user, session, error } = await signUpWithEmail(email.trim(), password, fullName.trim());
      if (error) {
        setErrorMessage(error.message);
      } else if (session) {
        navigate('/dashboard');
      } else if (user) {
        // If Supabase has email confirmation enabled
        setSuccessMessage('Account created! If confirmation is enabled on your Supabase project, check your email inbox to verify your account.');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-12 bg-[#F7FAF8]">
      {/* LEFT BRAND PANEL (Desktop) */}
      <div className="hidden md:flex md:col-span-5 bg-[#0D3D29] text-white p-12 flex-col justify-between relative overflow-hidden">
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
            Create Your Testing<br />Workspace.
          </h2>
          <p className="mt-3 text-sm text-[#DDE8E0]/80 leading-relaxed max-w-sm">
            Start testing your web applications with TestPilot AI. Launch Playwright headless browser automation, capture screenshots, and inspect test run logs.
          </p>
        </div>

        <div className="relative z-10 space-y-3 pt-8 border-t border-[#18583D]">
          <div className="flex items-center gap-3 text-xs text-[#A4D1B8]">
            <ShieldCheck className="w-4 h-4 text-[#61B487]" />
            <span>Private Row-Level Security on all test data</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#A4D1B8]">
            <ShieldCheck className="w-4 h-4 text-[#61B487]" />
            <span>Built-in SSRF and private IP network guards</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#A4D1B8]">
            <ShieldCheck className="w-4 h-4 text-[#61B487]" />
            <span>Complete test execution history</span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-[#A4D1B8]/60">
          VIT Code Apex 3.0 Hackathon · Team Latent
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
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
              Create an account
            </h1>
            <p className="mt-1 text-xs text-[#64746A]">
              Set up your testing profile and start executing automated QA runs.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="p-3.5 rounded-xl bg-[#EAF5EE] border border-[#DDE8E0] text-xs text-[#18583D]">
              <div className="font-semibold mb-0.5">Development Environment Ready</div>
              <p className="text-[11px] text-[#64746A] leading-relaxed">
                Supabase credentials can be loaded via <code className="bg-white px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code>. In development sandbox mode, you can sign up with any test credentials.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#F8D7DA] text-xs text-[#D64545] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[#EAF5EE] border border-[#DDE8E0] text-xs text-[#18583D] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#15251D] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE8E0] rounded-xl text-[#15251D] placeholder:text-[#64746A]/50 focus:outline-none focus:border-[#18583D] focus:ring-1 focus:ring-[#18583D] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#15251D] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE8E0] rounded-xl text-[#15251D] placeholder:text-[#64746A]/50 focus:outline-none focus:border-[#18583D] focus:ring-1 focus:ring-[#18583D] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#15251D] mb-1.5">
                Password (min. 6 characters)
              </label>
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

            <div>
              <label className="block text-xs font-semibold text-[#15251D] mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE8E0] rounded-xl text-[#15251D] placeholder:text-[#64746A]/50 focus:outline-none focus:border-[#18583D] focus:ring-1 focus:ring-[#18583D] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#18583D] rounded-xl hover:bg-[#0D3D29] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Creating Workspace...</span>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-[#64746A]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#18583D] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
