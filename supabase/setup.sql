-- ========================================================================
-- TestPilot AI - Supabase Database Setup & Schema
-- Team: Latent | VIT Code Apex 3.0 Hackathon
-- ========================================================================

-- 1. PROFILES TABLE
-- Linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEST_RUNS TABLE
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'passed', 'failed', 'error', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  page_title TEXT,
  final_url TEXT,
  http_status INTEGER,
  error_message TEXT,
  total_checks INTEGER DEFAULT 0,
  passed_checks INTEGER DEFAULT 0,
  failed_checks INTEGER DEFAULT 0,
  screenshot_path TEXT
);

-- 3. TEST_RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'skipped')),
  expected_result TEXT,
  actual_result TEXT,
  error_message TEXT,
  reproduction_steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for fast lookup and user isolation
CREATE INDEX IF NOT EXISTS idx_test_runs_user_id ON public.test_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON public.test_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON public.test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON public.test_results(user_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY POLICIES

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Test runs policies
CREATE POLICY "Users can view their own test runs"
  ON public.test_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test runs"
  ON public.test_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test runs"
  ON public.test_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test runs"
  ON public.test_runs FOR DELETE
  USING (auth.uid() = user_id);

-- Test results policies
CREATE POLICY "Users can view their own test results"
  ON public.test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results"
  ON public.test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test results"
  ON public.test_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test results"
  ON public.test_results FOR DELETE
  USING (auth.uid() = user_id);

-- AUTOMATIC PROFILE CREATION TRIGGER
-- Whenever a user signs up via Supabase Auth, automatically insert a profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STORAGE SETUP FOR 'test-evidence' BUCKET
-- Run in Supabase SQL Editor if storage bucket creation is desired via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-evidence', 'test-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies:
-- Users can view screenshots in their own folder (user_id/...)
CREATE POLICY "Allow authenticated users to read their own evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'test-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Backend or authenticated users can insert screenshots into their folder
CREATE POLICY "Allow authenticated users to upload their own evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'test-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
