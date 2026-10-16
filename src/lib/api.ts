import { ApiHealthStatus, CreateRunPayload, TestRun } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// URL & SSRF Validation Helper
export function validateTargetUrl(rawUrl: string): { isValid: boolean; error?: string; cleanUrl?: string } {
  if (!rawUrl || !rawUrl.trim()) {
    return { isValid: false, error: 'Please enter a target website URL.' };
  }

  let formatted = rawUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = 'https://' + formatted;
  }

  try {
    const parsed = new URL(formatted);

    // Only allow http: and https:
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check Cloud metadata endpoints (strictly prohibited under all circumstances)
    if (
      hostname === '169.254.169.254' ||
      hostname.includes('metadata.google') ||
      hostname === 'metadata' ||
      hostname === 'instance-data' ||
      hostname.startsWith('169.254.')
    ) {
      return {
        isValid: false,
        error: 'Cloud provider metadata endpoints are strictly blocked.',
      };
    }

    // Prohibit internal cluster domains and broadcast/unspecified
    if (
      hostname === '0.0.0.0' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return {
        isValid: false,
        error: 'Internal cluster addresses and unspecified hosts are prohibited.',
      };
    }

    // Check private IPv4 patterns (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);

      if (octet1 === 10) {
        return { isValid: false, error: 'Private IP space (10.0.0.0/8) is prohibited.' };
      }
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        return { isValid: false, error: 'Private IP space (172.16.0.0/12) is prohibited.' };
      }
      if (octet1 === 192 && octet2 === 168) {
        return { isValid: false, error: 'Private IP space (192.168.0.0/16) is prohibited.' };
      }
      if (octet1 === 127) {
        return { isValid: false, error: 'Loopback address (127.0.0.0/8) is prohibited.' };
      }
    }

    // Must have at least one dot in hostname (e.g. domain.tld)
    if (!hostname.includes('.')) {
      return { isValid: false, error: 'Please enter a valid domain name (e.g. example.com).' };
    }

    return { isValid: true, cleanUrl: parsed.toString() };
  } catch (err: any) {
    return { isValid: false, error: 'Invalid URL format. Please enter a valid web address.' };
  }
}

// Resilient API fetcher: Targets configured API_BASE_URL (e.g. http://localhost:8000), with origin fallback
async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const primaryUrl = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  try {
    return await fetch(primaryUrl, init);
  } catch (err: any) {
    if (API_BASE_URL && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Failed to fetch'))) {
      console.warn(`[TestPilot API] Could not reach backend at ${primaryUrl}. Falling back to origin endpoint ${endpoint}.`);
      return await fetch(endpoint, init);
    }
    throw err;
  }
}

// Fetch backend health status
export async function checkBackendHealth(): Promise<ApiHealthStatus> {
  try {
    const res = await apiFetch(`/api/health`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      status: 'unavailable',
      browser_automation_available: false,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      message: err.message || 'Cannot reach testing backend',
    };
  }
}

// Create a new test run
export async function createTestRun(payload: CreateRunPayload, authToken?: string): Promise<{ run_id: string; status: string; message?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await apiFetch(`/api/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || errorBody.message || `Failed to create test run (${res.status})`);
  }

  return await res.json();
}

// Get test runs for current user
export async function getTestRuns(authToken?: string): Promise<TestRun[]> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await apiFetch(`/api/runs`, {
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch test runs (${res.status})`);
  }

  return await res.json();
}

// Get single test run details with results
export async function getTestRunDetails(runId: string, authToken?: string): Promise<TestRun> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await apiFetch(`/api/runs/${runId}`, {
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch run details (${res.status})`);
  }

  return await res.json();
}
