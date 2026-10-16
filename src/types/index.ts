export type RunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'error' | 'cancelled';
export type CheckStatus = 'passed' | 'failed' | 'warning' | 'skipped';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface TestResultItem {
  id: string;
  run_id: string;
  user_id: string;
  test_name: string;
  status: CheckStatus;
  expected_result: string;
  actual_result: string;
  error_message?: string | null;
  reproduction_steps?: string[];
  created_at: string;
}

export interface TestRun {
  id: string;
  user_id: string;
  target_url: string;
  objective?: string | null;
  status: RunStatus;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  page_title?: string | null;
  final_url?: string | null;
  http_status?: number | null;
  error_message?: string | null;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  screenshot_path?: string | null;
  results?: TestResultItem[];
}

export interface CreateRunPayload {
  target_url: string;
  objective?: string;
}

export interface DashboardStats {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  runningRuns: number;
  passRate: number;
}

export interface ApiHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  browser_automation_available: boolean;
  version: string;
  timestamp: string;
  message?: string;
}
