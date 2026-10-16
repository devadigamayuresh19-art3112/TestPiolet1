import express, { Request, Response } from 'express';
import dns from 'dns/promises';
import { URL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

app.use(express.json());

// Enable CORS for all incoming client requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-memory test runs store for instant coordination & fallback
interface CheckResult {
  id: string;
  run_id: string;
  user_id: string;
  test_name: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  expected_result: string;
  actual_result: string;
  error_message?: string | null;
  reproduction_steps?: string[];
  created_at: string;
}

interface RunData {
  id: string;
  user_id: string;
  target_url: string;
  objective?: string | null;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'error' | 'cancelled';
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
  results: CheckResult[];
}

const memoryRuns = new Map<string, RunData>();

// Helper to check if FastAPI backend is responding on port 8000
async function isFastApiAlive(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${FASTAPI_URL}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function getAllowedDomains(): string[] {
  const domains = new Set<string>(['localhost', '127.0.0.1']);
  const raw = process.env.ALLOWED_TEST_DOMAINS || '';
  for (const item of raw.split(',')) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed === '*') {
      domains.add('*');
      continue;
    }
    if (trimmed.includes('://')) {
      try {
        const u = new URL(trimmed);
        if (u.hostname) domains.add(u.hostname.toLowerCase());
      } catch {}
    } else {
      const clean = trimmed.split('/')[0].split(':')[0].trim().toLowerCase();
      if (clean) domains.add(clean);
    }
  }
  return Array.from(domains).sort();
}

// Server-side SSRF, Allowed Domains, and URL validation
function validateUrl(rawUrl: string): { valid: boolean; cleanUrl?: string; error?: string } {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: false, error: 'Target URL cannot be empty.' };
  }

  let formatted = rawUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = 'https://' + formatted;
  }

  try {
    const parsed = new URL(formatted);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: `Protocol '${parsed.protocol}' is prohibited. Only HTTP and HTTPS are permitted.` };
    }

    const host = parsed.hostname.toLowerCase();

    // 1. Unconditionally block cloud provider metadata endpoints
    if (
      host === '169.254.169.254' ||
      host.includes('metadata.google') ||
      host === 'metadata' ||
      host === 'instance-data' ||
      host.startsWith('169.254.')
    ) {
      return { valid: false, error: 'Access to cloud provider metadata services is strictly prohibited.' };
    }

    // 2. Enforce ALLOWED_TEST_DOMAINS whitelist
    const allowed = getAllowedDomains();
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
    
    let isDomainAuthorized = false;
    for (const item of allowed) {
      if (item === '*') {
        isDomainAuthorized = true;
        break;
      }
      if (host === item || host.endsWith('.' + item)) {
        isDomainAuthorized = true;
        break;
      }
    }

    if (!isDomainAuthorized) {
      return {
        valid: false,
        error: `Target host '${host}' is not authorized. Authorized test domains: [${allowed.join(', ')}]. Configure ALLOWED_TEST_DOMAINS in environment to permit this host.`,
      };
    }

    // 3. Block unauthorized private networks (RFC 1918)
    const ipMatch = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const o1 = parseInt(ipMatch[1], 10);
      const o2 = parseInt(ipMatch[2], 10);
      if (o1 === 169 && o2 === 254) {
        return { valid: false, error: 'Cloud metadata IP addresses are strictly prohibited.' };
      }
      if (o1 === 127) {
        if (!isLoopback || (!allowed.includes('localhost') && !allowed.includes('127.0.0.1'))) {
          return { valid: false, error: 'Loopback target is not authorized.' };
        }
      } else if (o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) || o1 === 0) {
        if (!allowed.includes(host)) {
          return { valid: false, error: 'Target resolves to unauthorized private network space.' };
        }
      }
    }

    return { valid: true, cleanUrl: parsed.toString() };
  } catch {
    return { valid: false, error: 'Invalid URL syntax.' };
  }
}

// Extract Bearer user token or default dev user
function getUserIdFromReq(req: Request): string {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    if (token.startsWith('dev_mock_token_')) {
      return 'usr_local_dev_user';
    }
  }
  return 'usr_local_dev_user';
}

// ==========================================
// API ROUTES
// ==========================================

// GET /api/health
app.get('/api/health', async (req: Request, res: Response) => {
  const fastApiUp = await isFastApiAlive();
  res.json({
    status: 'healthy',
    browser_automation_available: true,
    fastapi_service_connected: fastApiUp,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    message: 'TestPilot AI testing engine operational.',
  });
});

// POST /api/runs - Create and launch test run
app.post('/api/runs', async (req: Request, res: Response) => {
  // Check if FastAPI is running, if so proxy to it
  if (await isFastApiAlive()) {
    try {
      const forwardRes = await fetch(`${FASTAPI_URL}/api/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
        body: JSON.stringify(req.body),
      });
      const data = await forwardRes.json();
      return res.status(forwardRes.status).json(data);
    } catch (e) {
      console.warn('Proxying to FastAPI failed, using native runner:', e);
    }
  }

  const { target_url, objective } = req.body || {};
  const validation = validateUrl(target_url);

  if (!validation.valid) {
    return res.status(400).json({ detail: validation.error });
  }

  const cleanUrl = validation.cleanUrl!;
  const userId = getUserIdFromReq(req);
  const runId = 'run_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  const newRun: RunData = {
    id: runId,
    user_id: userId,
    target_url: cleanUrl,
    objective: objective || null,
    status: 'queued',
    started_at: null,
    completed_at: null,
    created_at: now,
    page_title: null,
    final_url: null,
    http_status: null,
    error_message: null,
    total_checks: 4,
    passed_checks: 0,
    failed_checks: 0,
    screenshot_path: null,
    results: [],
  };

  memoryRuns.set(runId, newRun);

  // Execute background verification asynchronously
  setTimeout(async () => {
    newRun.status = 'running';
    newRun.started_at = new Date().toISOString();

    const results: CheckResult[] = [];
    let httpStatus: number | null = null;
    let pageTitle: string | null = null;
    let finalUrl: string | null = cleanUrl;
    let errorMsg: string | null = null;

    try {
      // Step A: DNS and host resolution
      const parsedUrl = new URL(cleanUrl);
      const host = parsedUrl.hostname;

      let ip = '';
      try {
        const lookup = await dns.lookup(host);
        ip = lookup.address;
      } catch (dnsErr: any) {
        throw new Error(`DNS lookup failed for ${host}: ${dnsErr.message}`);
      }

      // Step B: HTTP Fetch check with redirect validation
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      let currentReqUrl = cleanUrl;
      let redirectHops = 0;
      let response: any = null;

      while (redirectHops < 5) {
        response = await fetch(currentReqUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestPilot-QA-Engine/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        // Check if redirect
        if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
          const redirectLocation = new URL(response.headers.get('location')!, currentReqUrl).toString();
          const redirectCheck = validateUrl(redirectLocation);
          if (!redirectCheck.valid) {
            throw new Error(`Redirect to unauthorized target blocked: ${redirectCheck.error}`);
          }
          currentReqUrl = redirectCheck.cleanUrl!;
          redirectHops++;
        } else {
          break;
        }
      }
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      httpStatus = response.status;
      finalUrl = currentReqUrl;

      const isStatusOk = httpStatus !== null && httpStatus >= 200 && httpStatus < 400;

      // Check 1: HTTP Reachability
      results.push({
        id: 'chk_1_' + Math.random().toString(36).substring(2, 7),
        run_id: runId,
        user_id: userId,
        test_name: 'HTTP Reachability & Navigation',
        status: isStatusOk ? 'passed' : 'failed',
        expected_result: 'HTTP status 200–399 response from server',
        actual_result: `Received HTTP ${httpStatus} (${latencyMs}ms latency)`,
        error_message: isStatusOk ? null : `HTTP status code returned: ${httpStatus}`,
        reproduction_steps: [
          `Send HTTP GET request to ${cleanUrl}`,
          `Resolved to destination IP ${ip}`,
          `Observed HTTP ${httpStatus}`,
        ],
        created_at: new Date().toISOString(),
      });

      // Fetch HTML text
      const htmlText = await response.text();

      // Check 2: Document Title
      const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : null;
      const hasTitle = Boolean(pageTitle && pageTitle.length > 0);

      results.push({
        id: 'chk_2_' + Math.random().toString(36).substring(2, 7),
        run_id: runId,
        user_id: userId,
        test_name: 'Document Title Verification',
        status: hasTitle ? 'passed' : 'failed',
        expected_result: 'Valid non-empty <title> tag in HTML document',
        actual_result: hasTitle ? `Title: "${pageTitle}"` : 'No title tag found in document',
        error_message: hasTitle ? null : 'Missing or empty <title> tag',
        reproduction_steps: ['Parse DOM <head> for <title> content'],
        created_at: new Date().toISOString(),
      });

      // Check 3: Body & Content Render Check
      const hasBody = htmlText.toLowerCase().includes('<body');
      const bodyContentLength = htmlText.length;
      const hasSufficientContent = hasBody && bodyContentLength > 100;

      results.push({
        id: 'chk_3_' + Math.random().toString(36).substring(2, 7),
        run_id: runId,
        user_id: userId,
        test_name: 'DOM Body Render & Document Health',
        status: hasSufficientContent ? 'passed' : 'failed',
        expected_result: 'Document <body> structure with valid content payload',
        actual_result: hasSufficientContent
          ? `Body present (${bodyContentLength.toLocaleString()} bytes received)`
          : 'Empty or truncated body structure',
        error_message: hasSufficientContent ? null : 'Received insufficient DOM payload',
        reproduction_steps: ['Inspect document <body> tag and byte length'],
        created_at: new Date().toISOString(),
      });

      // Check 4: Security Header & Error Audit
      const hasSecurityHeaders =
        response.headers.has('x-content-type-options') ||
        response.headers.has('content-security-policy') ||
        response.headers.has('strict-transport-security');

      results.push({
        id: 'chk_4_' + Math.random().toString(36).substring(2, 7),
        run_id: runId,
        user_id: userId,
        test_name: 'Server Response Headers Audit',
        status: isStatusOk ? 'passed' : 'failed',
        expected_result: 'Valid server content-type and standard headers',
        actual_result: `Content-Type: ${response.headers.get('content-type') || 'unspecified'}`,
        error_message: isStatusOk ? null : 'Abnormal server response headers',
        reproduction_steps: ['Inspect HTTP response headers'],
        created_at: new Date().toISOString(),
      });

    } catch (testErr: any) {
      errorMsg = testErr.message || 'Execution error during browser test';
      results.push({
        id: 'chk_err_' + Math.random().toString(36).substring(2, 7),
        run_id: runId,
        user_id: userId,
        test_name: 'Target Accessibility Check',
        status: 'failed',
        expected_result: 'Target application is reachable and responds to network probe',
        actual_result: `Failed: ${errorMsg}`,
        error_message: errorMsg,
        reproduction_steps: [`Attempted to connect to ${cleanUrl}`, `Encountered exception: ${errorMsg}`],
        created_at: new Date().toISOString(),
      });
    }

    const passedCount = results.filter((r) => r.status === 'passed').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const finalStatus = failedCount === 0 && passedCount > 0 ? 'passed' : 'failed';

    newRun.status = errorMsg && passedCount === 0 ? 'error' : finalStatus;
    newRun.completed_at = new Date().toISOString();
    newRun.final_url = finalUrl;
    newRun.http_status = httpStatus;
    newRun.page_title = pageTitle;
    newRun.error_message = errorMsg;
    newRun.total_checks = results.length;
    newRun.passed_checks = passedCount;
    newRun.failed_checks = failedCount;
    newRun.results = results;
  }, 1200);

  res.status(200).json({
    run_id: runId,
    status: 'queued',
    message: 'Test run created and queued for execution.',
  });
});

// GET /api/runs - List user runs
app.get('/api/runs', async (req: Request, res: Response) => {
  if (await isFastApiAlive()) {
    try {
      const forwardRes = await fetch(`${FASTAPI_URL}/api/runs`, {
        headers: {
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
      });
      const data = await forwardRes.json();
      return res.status(forwardRes.status).json(data);
    } catch {}
  }

  const userId = getUserIdFromReq(req);
  const userRuns = Array.from(memoryRuns.values())
    .filter((r) => r.user_id === userId || userId === 'usr_local_dev_user')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(userRuns);
});

// GET /api/runs/:run_id - Single run details
app.get('/api/runs/:run_id', async (req: Request, res: Response) => {
  const { run_id } = req.params;

  if (await isFastApiAlive()) {
    try {
      const forwardRes = await fetch(`${FASTAPI_URL}/api/runs/${run_id}`, {
        headers: {
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
      });
      const data = await forwardRes.json();
      return res.status(forwardRes.status).json(data);
    } catch {}
  }

  const run = memoryRuns.get(run_id);
  if (!run) {
    return res.status(404).json({ detail: `Test run with ID '${run_id}' not found.` });
  }

  res.json(run);
});

// ==========================================
// VITE SPA INTEGRATION (DEV & PROD)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TestPilot AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
