import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  History,
  FileText,
  Play,
  ArrowRight,
  Shield,
  Menu,
  X,
  ExternalLink,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';
import { getCurrentSession } from '../lib/supabase';

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getCurrentSession().then(({ session }) => {
      setIsAuthenticated(Boolean(session));
    });
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] text-[#15251D]">
      {/* STICKY TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#DDE8E0]">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between gap-8">
          {/* Logo Zone */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 text-[#15251D] group">
            <div className="w-8 h-8 rounded-lg bg-[#18583D] flex items-center justify-center text-[#EAF5EE] font-extrabold text-sm tracking-tight shadow-sm group-hover:bg-[#0D3D29] transition-colors">
              TP
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#15251D]">
              TestPilot <span className="text-[#18583D]">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64746A]">
            <button
              onClick={() => scrollToSection('home')}
              className="hover:text-[#18583D] transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-[#18583D] transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[#18583D] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#18583D] transition-colors cursor-pointer"
            >
              How It Works
            </button>
          </nav>

          {/* Action Zone */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#18583D] rounded-lg hover:bg-[#0D3D29] transition-colors shadow-sm cursor-pointer"
              >
                Go to Dashboard →
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-[#18583D] hover:text-[#0D3D29] transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#18583D] rounded-lg hover:bg-[#0D3D29] transition-colors shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#64746A] hover:text-[#15251D] focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#DDE8E0] bg-[#FFFFFF] px-6 py-4 space-y-3">
            <button
              onClick={() => scrollToSection('home')}
              className="block w-full text-left py-2 text-sm font-medium text-[#64746A]"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left py-2 text-sm font-medium text-[#64746A]"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-sm font-medium text-[#64746A]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-sm font-medium text-[#64746A]"
            >
              How It Works
            </button>
            <div className="pt-3 border-t border-[#DDE8E0] flex flex-col gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full text-center py-2.5 text-xs font-semibold text-white bg-[#18583D] rounded-lg"
                >
                  Open Dashboard
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full text-center py-2 text-xs font-semibold text-[#18583D] border border-[#DDE8E0] rounded-lg"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full text-center py-2 text-xs font-semibold text-white bg-[#18583D] rounded-lg"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section id="home" className="pt-16 pb-20 md:pt-24 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline and CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#EAF5EE] border border-[#DDE8E0] text-[#18583D] text-xs font-semibold tracking-wide uppercase">
                <Shield className="w-3.5 h-3.5 text-[#18583D]" />
                <span>INTELLIGENT SOFTWARE QUALITY ASSURANCE</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#15251D] leading-[1.1] text-balance">
                Ship Better Code.<br />
                <span className="text-[#18583D]">Break Fewer Things.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#64746A] leading-relaxed max-w-xl">
                TestPilot AI helps developers test web applications, identify failures, and
                investigate bugs with clear, actionable evidence.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')}
                  className="px-6 py-3.5 text-sm font-semibold text-white bg-[#18583D] rounded-xl hover:bg-[#0D3D29] transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>{isAuthenticated ? 'Go to Dashboard' : 'Get Started'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-6 py-3.5 text-sm font-semibold text-[#18583D] bg-[#FFFFFF] border border-[#DDE8E0] rounded-xl hover:bg-[#EAF5EE] transition-colors cursor-pointer"
                >
                  Explore Features
                </button>
              </div>

              {/* Sub-hero trust notes */}
              <div className="pt-6 border-t border-[#DDE8E0] flex flex-wrap items-center gap-6 text-xs text-[#64746A]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#18583D]" />
                  <span>Real Playwright Browser Automation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#18583D]" />
                  <span>Supabase Database & Auth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#18583D]" />
                  <span>SSRF & Network Protection</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Product Preview */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-xl p-5 overflow-hidden">
                {/* Browser bar preview */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DDE8E0]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#D64545]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#D99525]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#61B487]" />
                  </div>
                  <div className="px-3 py-1 text-[11px] font-mono text-[#64746A] bg-[#F7FAF8] rounded border border-[#DDE8E0]">
                    https://target-app.dev/checkout
                  </div>
                  <div className="text-[10px] font-semibold text-[#18583D] bg-[#EAF5EE] px-2 py-0.5 rounded">
                    RUN #842
                  </div>
                </div>

                {/* Simulated Verification Results */}
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DDE8E0]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#15251D]">Page Navigation & Status</span>
                      <span className="text-[11px] font-bold text-[#18583D]">HTTP 200 OK</span>
                    </div>
                    <div className="text-[11px] text-[#64746A]">
                      Main document loaded in 412ms · Chromium Headless session
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DDE8E0]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#15251D]">DOM Health & Page Title</span>
                      <span className="text-[11px] font-bold text-[#18583D]">PASSED</span>
                    </div>
                    <div className="text-[11px] text-[#64746A]">
                      Title: "Storefront Checkout · Secure Payment"
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FFF5F5] border border-[#F8D7DA]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#D64545]">Button Interaction Check</span>
                      <span className="text-[11px] font-bold text-[#D64545]">FAILED</span>
                    </div>
                    <div className="text-[11px] text-[#D64545]">
                      Expected #submit-btn enabled. Actual: disabled attribute persisted.
                    </div>
                  </div>
                </div>

                {/* Evidence Screenshot Preview Badge */}
                <div className="mt-4 pt-3 border-t border-[#DDE8E0] flex items-center justify-between text-xs text-[#64746A]">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#18583D]" />
                    <span>Evidence screenshot captured</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#64746A]">1280x800.png</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-20 bg-[#FFFFFF] border-y border-[#DDE8E0]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14 text-left">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#18583D]">
              THE TESTING CHALLENGE
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#15251D] tracking-tight">
              Testing Shouldn't Slow Innovation.
            </h2>
            <p className="mt-4 text-base text-[#64746A] leading-relaxed">
              Manual testing consumes time. Rigid scripts can break when interfaces change.
              Failed tests can be difficult to investigate without sufficient evidence.
              TestPilot AI combines structured test execution, browser automation, failure
              verification, and evidence collection in one workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] hover:border-[#61B487] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#15251D] mb-2">1. Less Repetitive Testing</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Automate foundational web accessibility, HTTP status checks, page-load verification,
                and DOM checks without writing custom boilerplate for every release.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] hover:border-[#61B487] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#15251D] mb-2">2. Clearer Failure Reports</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                View exact discrepancies between expected outcomes and observed browser states,
                including console error traces, HTTP error codes, and reproduction steps.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] hover:border-[#61B487] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#15251D] mb-2">3. Faster Investigation</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Access stored screenshot evidence, final navigation URLs, and timestamped test run
                histories to pinpoint exact regression points instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-[#F7FAF8]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14 text-left">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#18583D]">
              CAPABILITIES & ARCHITECTURE
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#15251D] tracking-tight">
              Engineered for Quality & Reliability
            </h2>
            <p className="mt-4 text-base text-[#64746A] leading-relaxed">
              Every feature is built on deterministic software engineering principles, avoiding
              unpredictable mock outputs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#15251D] mb-2">Structured Test Planning</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Prepare clear testing scenarios and expected outcomes tailored to your web application endpoints.
              </p>
              <span className="inline-block mt-4 text-[11px] font-medium text-[#18583D] bg-[#EAF5EE] px-2 py-0.5 rounded">
                MVP Scope
              </span>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#15251D] mb-2">Browser Automation</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Use Playwright with Chromium to interact with web applications in an isolated, sandboxed environment.
              </p>
              <span className="inline-block mt-4 text-[11px] font-medium text-[#18583D] bg-[#EAF5EE] px-2 py-0.5 rounded">
                MVP Scope
              </span>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#15251D] mb-2">Failure Verification</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Compare expected behavior against actual results with deterministic assertion logic and honest error flags.
              </p>
              <span className="inline-block mt-4 text-[11px] font-medium text-[#18583D] bg-[#EAF5EE] px-2 py-0.5 rounded">
                MVP Scope
              </span>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#15251D] mb-2">Evidence Collection</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Capture screenshots and relevant browser information when available for visual debugging.
              </p>
              <span className="inline-block mt-4 text-[11px] font-medium text-[#18583D] bg-[#EAF5EE] px-2 py-0.5 rounded">
                MVP Scope
              </span>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#15251D] mb-2">Test Run History</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Review previous runs and their outcomes stored securely in Supabase PostgreSQL with user-level isolation.
              </p>
              <span className="inline-block mt-4 text-[11px] font-medium text-[#18583D] bg-[#EAF5EE] px-2 py-0.5 rounded">
                MVP Scope
              </span>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[#EAF5EE] text-[#18583D] flex items-center justify-center mb-4">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#15251D] mb-2">Developer-Friendly Reports</h3>
              <p className="text-sm text-[#64746A] leading-relaxed">
                Present failures, reproduction steps, and available evidence clearly in a developer-first interface.
              </p>
              <span className="inline-block mt-4 text-[11px] font-medium text-[#18583D] bg-[#EAF5EE] px-2 py-0.5 rounded">
                MVP Scope
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 bg-[#FFFFFF] border-y border-[#DDE8E0]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14 text-left">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#18583D]">
              TESTING PIPELINE
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#15251D] tracking-tight">
              How TestPilot AI Works
            </h2>
            <p className="mt-4 text-base text-[#64746A] leading-relaxed">
              From URL submission to evidence generation in five disciplined stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] relative">
              <div className="text-xs font-bold text-[#18583D] mb-2">STEP 1</div>
              <h3 className="text-sm font-bold text-[#15251D] mb-1">Enter Website URL</h3>
              <p className="text-xs text-[#64746A] leading-relaxed">
                The user provides the target website and optional testing objective.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] relative">
              <div className="text-xs font-bold text-[#18583D] mb-2">STEP 2</div>
              <h3 className="text-sm font-bold text-[#15251D] mb-1">Validate & Open</h3>
              <p className="text-xs text-[#64746A] leading-relaxed">
                The system validates the URL, enforces SSRF protections, and opens the target.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] relative">
              <div className="text-xs font-bold text-[#18583D] mb-2">STEP 3</div>
              <h3 className="text-sm font-bold text-[#15251D] mb-1">Execute Tests</h3>
              <p className="text-xs text-[#64746A] leading-relaxed">
                Playwright performs supported browser navigation and accessibility checks.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] relative">
              <div className="text-xs font-bold text-[#18583D] mb-2">STEP 4</div>
              <h3 className="text-sm font-bold text-[#15251D] mb-1">Verify Results</h3>
              <p className="text-xs text-[#64746A] leading-relaxed">
                The system compares observed behavior with expected outcomes.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-5 rounded-2xl bg-[#F7FAF8] border border-[#DDE8E0] relative">
              <div className="text-xs font-bold text-[#18583D] mb-2">STEP 5</div>
              <h3 className="text-sm font-bold text-[#15251D] mb-1">Review Evidence</h3>
              <p className="text-xs text-[#64746A] leading-relaxed">
                The dashboard presents test results, logs, and captured screenshots.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO PREVIEW SECTION */}
      <section className="py-20 bg-[#F7FAF8]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-[#18583D]">
                PRODUCT DEMONSTRATION
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#15251D] tracking-tight">
                Dashboard Overview
              </h2>
            </div>
            <span className="text-xs text-[#64746A] bg-[#FFFFFF] px-3 py-1 rounded-md border border-[#DDE8E0]">
              Sample Preview Data
            </span>
          </div>

          <div className="p-6 md:p-8 rounded-3xl bg-[#FFFFFF] border border-[#DDE8E0] shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0]">
                <div className="text-xs text-[#64746A]">Total Runs</div>
                <div className="text-2xl font-bold text-[#15251D] mt-1 font-mono">14</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0]">
                <div className="text-xs text-[#64746A]">Passed Runs</div>
                <div className="text-2xl font-bold text-[#18583D] mt-1 font-mono">11</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0]">
                <div className="text-xs text-[#64746A]">Failed Runs</div>
                <div className="text-2xl font-bold text-[#D64545] mt-1 font-mono">3</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7FAF8] border border-[#DDE8E0]">
                <div className="text-xs text-[#64746A]">Running Tests</div>
                <div className="text-2xl font-bold text-[#D99525] mt-1 font-mono">0</div>
              </div>
            </div>

            {/* Table Mock Preview */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DDE8E0] text-[#64746A]">
                    <th className="py-3 px-4">Run ID</th>
                    <th className="py-3 px-4">Target Website</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Checks Passed</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE8E0]">
                  <tr className="hover:bg-[#F7FAF8]">
                    <td className="py-3.5 px-4 font-mono text-[#64746A]">#run_8819</td>
                    <td className="py-3.5 px-4 font-medium text-[#15251D]">https://example.com</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EAF5EE] text-[#18583D]">
                        PASSED
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">4 / 4</td>
                    <td className="py-3.5 px-4 text-[#18583D] font-medium">View Report</td>
                  </tr>
                  <tr className="hover:bg-[#F7FAF8]">
                    <td className="py-3.5 px-4 font-mono text-[#64746A]">#run_8812</td>
                    <td className="py-3.5 px-4 font-medium text-[#15251D]">https://httpbin.org/status/404</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FFF5F5] text-[#D64545]">
                        FAILED
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">1 / 4</td>
                    <td className="py-3.5 px-4 text-[#18583D] font-medium">View Report</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT THE PROJECT SECTION */}
      <section className="py-16 bg-[#FFFFFF] border-t border-[#DDE8E0]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="p-8 rounded-3xl bg-[#EAF5EE] border border-[#DDE8E0] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-[#18583D] uppercase tracking-wider">
                HACKATHON PRESENTATION
              </span>
              <h3 className="text-2xl font-extrabold text-[#15251D] mt-1">
                Project: TestPilot AI · Team Latent
              </h3>
              <p className="text-sm text-[#64746A] mt-2 max-w-2xl leading-relaxed">
                Developed for the VIT Code Apex 3.0 Hackathon under the Agentic AI domain.
                Our mission is to build an intelligent, reproducible QA workflow that helps developers
                validate web interfaces and investigate software bugs with verified browser evidence.
              </p>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-3 text-xs font-semibold text-white bg-[#18583D] rounded-xl hover:bg-[#0D3D29] transition-colors shrink-0 shadow-sm cursor-pointer"
            >
              Launch Platform →
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-[#0D3D29] text-[#EAF5EE]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#18583D] flex items-center justify-center font-bold text-white text-xs">
              TP
            </div>
            <span className="font-bold text-sm tracking-tight text-white">TestPilot AI</span>
            <span className="text-[#A4D1B8] hidden sm:inline">· Team Latent</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[#A4D1B8]">
            <button onClick={() => scrollToSection('home')} className="hover:text-white transition-colors cursor-pointer">
              Home
            </button>
            <button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors cursor-pointer">
              About
            </button>
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors cursor-pointer">
              How It Works
            </button>
            <Link to="/login" className="hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/signup" className="hover:text-white transition-colors">
              Get Started
            </Link>
          </div>

          <div className="text-[#A4D1B8]/80 text-[11px]">
            VIT Code Apex 3.0 Hackathon Prototype · Built with Playwright, FastAPI & Supabase
          </div>
        </div>
      </footer>
    </div>
  );
}
