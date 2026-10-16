import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { TestRun, TestResultItem } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('http')
);

// Fallback dummy client if credentials aren't set yet to avoid runtime crash on load
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Local storage session key for development / testing when Supabase credentials are pending
const LOCAL_DEV_SESSION_KEY = 'testpilot_dev_session';
const LOCAL_DEV_RUNS_KEY = 'testpilot_dev_runs';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    user_metadata?: { full_name?: string };
  } | null;
  session: {
    access_token: string;
    user: any;
  } | null;
  error: { message: string } | null;
}

export async function getCurrentSession(): Promise<{ session: Session | any | null; user: User | any | null }> {
  if (supabase) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase getSession error:', error);
      return { session: null, user: null };
    }
    return { session, user: session?.user || null };
  }

  // Fallback for development sandbox environment
  const savedDevSession = localStorage.getItem(LOCAL_DEV_SESSION_KEY);
  if (savedDevSession) {
    try {
      const parsed = JSON.parse(savedDevSession);
      return { session: parsed, user: parsed.user };
    } catch {
      localStorage.removeItem(LOCAL_DEV_SESSION_KEY);
    }
  }
  return { session: null, user: null };
}

export async function signUpWithEmail(email: string, password: string, fullName: string): Promise<AuthResponse> {
  if (!email || !password) {
    return { user: null, session: null, error: { message: 'Email and password are required.' } };
  }
  if (password.length < 6) {
    return { user: null, session: null, error: { message: 'Password must be at least 6 characters.' } };
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { user: null, session: null, error: { message: error.message } };
    }

    // Try inserting into profiles table if RLS allows
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
        });
      } catch (err) {
        console.warn('Profile sync note:', err);
      }
    }

    return { user: data.user as any, session: data.session, error: null };
  }

  // Development workspace mode when Supabase URL is not configured
  const mockUser = {
    id: 'usr_' + Math.random().toString(36).substring(2, 9),
    email,
    user_metadata: { full_name: fullName },
    created_at: new Date().toISOString(),
  };
  const mockSession = {
    access_token: 'dev_mock_token_' + Date.now(),
    user: mockUser,
  };
  localStorage.setItem(LOCAL_DEV_SESSION_KEY, JSON.stringify(mockSession));
  return { user: mockUser, session: mockSession, error: null };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  if (!email || !password) {
    return { user: null, session: null, error: { message: 'Email and password are required.' } };
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { user: null, session: null, error: { message: error.message } };
    }
    return { user: data.user as any, session: data.session, error: null };
  }

  // Development workspace mode
  const saved = localStorage.getItem(LOCAL_DEV_SESSION_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.user.email === email) {
        return { user: parsed.user, session: parsed, error: null };
      }
    } catch {}
  }

  const mockUser = {
    id: 'usr_demo_tester',
    email,
    user_metadata: { full_name: email.split('@')[0] },
  };
  const mockSession = {
    access_token: 'dev_mock_token_' + Date.now(),
    user: mockUser,
  };
  localStorage.setItem(LOCAL_DEV_SESSION_KEY, JSON.stringify(mockSession));
  return { user: mockUser, session: mockSession, error: null };
}

export async function signOutUser(): Promise<{ error: any }> {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    return { error };
  }
  localStorage.removeItem(LOCAL_DEV_SESSION_KEY);
  return { error: null };
}

export async function resetUserPassword(email: string): Promise<{ error: any }> {
  if (!email) {
    return { error: { message: 'Email is required' } };
  }
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error };
  }
  return { error: null };
}

// Fetch test runs for the current user
export async function fetchUserTestRuns(): Promise<TestRun[]> {
  if (supabase) {
    const { data: runs, error } = await supabase
      .from('test_runs')
      .select('*, results:test_results(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch test runs from Supabase:', error);
      throw error;
    }
    return (runs as TestRun[]) || [];
  }

  // Dev fallback
  const raw = localStorage.getItem(LOCAL_DEV_RUNS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return [];
}

export async function fetchTestRunDetails(runId: string): Promise<TestRun | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('test_runs')
      .select('*, results:test_results(*)')
      .eq('id', runId)
      .single();

    if (error) {
      console.error('Error fetching test run details:', error);
      return null;
    }
    return data as TestRun;
  }

  const runs = await fetchUserTestRuns();
  return runs.find((r) => r.id === runId) || null;
}

export async function saveLocalTestRun(run: TestRun): Promise<void> {
  const current = await fetchUserTestRuns();
  const index = current.findIndex((r) => r.id === run.id);
  if (index >= 0) {
    current[index] = run;
  } else {
    current.unshift(run);
  }
  localStorage.setItem(LOCAL_DEV_RUNS_KEY, JSON.stringify(current));
}
