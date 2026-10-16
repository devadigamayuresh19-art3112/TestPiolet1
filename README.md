# TestPilot AI — Autonomous Software Testing Platform

**Team Name:** Latent  
**Event:** VIT Code Apex 3.0 Hackathon  
**Domain:** Agentic AI — Autonomous Software Testing  

---

## 🚀 Project Overview

**TestPilot AI** is an autonomous QA testing platform that helps developers explore, test, and debug web applications. Instead of brittle manual tests or unverified mock outputs, TestPilot AI executes real Playwright headless browser runs, performs deterministic assertions, records network/console diagnostics, captures visual evidence screenshots, and persists test execution history with Row-Level Security in Supabase PostgreSQL.

### Key Capabilities in MVP Scope
1. **Cinematic 3D Introduction (`/`):** Full-screen Three.js WebGL debugging lab with an interactive procedural 3D browser, animated radar, and a single navigation action (`LET'S GO →`).
2. **Public Landing Page (`/home`):** SaaS product architecture showcasing core capabilities, 5-stage testing workflow, and sample preview data.
3. **Supabase Authentication (`/login`, `/signup`):** Secure signup and login with Supabase Auth, automatic `profiles` table triggers, and password reset.
4. **Autonomous Testing Dashboard (`/dashboard`):** Real-time test launcher with URL validation, SSRF network protection, execution status tracking, and stored history.
5. **Deterministic Verification Checks:**
   - HTTP reachability & response status verification
   - HTML document title extraction & validation
   - DOM `<body>` content payload and rendering health
   - Uncaught JavaScript console error & exception audit
6. **Evidence Collection:** Screenshot capture and evidence storage for visual debugging.
7. **SSRF & Security Defense:** Strict filtering against `localhost`, loopbacks, cloud metadata (`169.254.169.254`), and private RFC 1918 subnets.

---

## 🛠 Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Three.js (`@react-three/fiber`, `@react-three/drei`), Recharts, Canvas Confetti.
- **Backend API:** Python 3.10+, FastAPI, Pydantic, Playwright Chromium, Uvicorn, HTTPX.
- **Full-Stack Node Server:** Express 4 with Vite middlewares (`server.ts`).
- **Database & Auth:** Supabase PostgreSQL, Supabase Auth, Row-Level Security (RLS), Supabase Storage (`test-evidence` bucket).

---

## 📂 Project Architecture

```
testpilot-ai/
├── src/
│   ├── components/
│   │   └── ThreeHeroScene.tsx      # 3D WebGL laboratory scene & canvas
│   ├── pages/
│   │   ├── IntroPage.tsx           # Route: / (3D experience)
│   │   ├── LandingPage.tsx         # Route: /home (Marketing & features)
│   │   ├── LoginPage.tsx           # Route: /login (Supabase Auth)
│   │   ├── SignupPage.tsx          # Route: /signup (User registration)
│   │   └── DashboardPage.tsx       # Route: /dashboard (Testing workbench)
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client & query helpers
│   │   └── api.ts                  # API client & SSRF validator
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── App.tsx                     # React Router definition
│   ├── main.tsx                    # React DOM entry
│   └── index.css                   # Tailwind CSS styling & brand palette
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Pydantic Settings
│   │   ├── auth.py                 # Bearer token verification
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── health.py           # GET /api/health
│   │   │   └── runs.py             # POST/GET /api/runs
│   │   └── services/
│   │       ├── test_runner.py      # Playwright Chromium execution engine
│   │       ├── url_validator.py    # SSRF & IP validation service
│   │       └── evidence_storage.py # Screenshot storage service
│   ├── tests/
│   │   ├── test_api.py             # Endpoint tests
│   │   └── test_validation.py      # SSRF & IP unit tests
│   └── requirements.txt            # Python dependencies
├── supabase/
│   └── setup.sql                   # Database schema, triggers, RLS policies
├── server.ts                       # Express + Vite full-stack server
├── package.json
└── README.md
```

---

## ⚙️ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js:** v18+ and `npm`
- **Python:** v3.10+ and `pip`
- **Chromium / Playwright:** Browser binaries

### 2. Install Dependencies

```bash
# Install Frontend & Full-Stack Node dependencies
npm install

# Install Python backend requirements
pip install -r backend/requirements.txt

# Install Playwright Chromium with system dependencies
playwright install --with-deps chromium
```

### 3. Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your Supabase and Target Domain credentials:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Authorized testing targets (Initial dev hosts: localhost, 127.0.0.1)
ALLOWED_TEST_DOMAINS="localhost,127.0.0.1"
```

> **Note:** If Supabase credentials are not provided initially, TestPilot AI automatically operates in local development mode so all pages, test runs, and features remain completely testable.

### 4. Configuring `ALLOWED_TEST_DOMAINS` (Adding Your Own Deployed Website)

TestPilot AI implements strict security enforcement to prevent Server-Side Request Forgery (SSRF) and restrict browser automation to authorized targets:

1. **Initial Development Hosts:**
   By default, `localhost` and `127.0.0.1` are always included as authorized development hosts (e.g. `http://localhost:3000`).
2. **Adding Your Deployed Website:**
   To test your deployed staging or production application, add its domain to `ALLOWED_TEST_DOMAINS` in your `.env` file (comma-separated):
   ```env
   ALLOWED_TEST_DOMAINS="localhost,127.0.0.1,my-app.vercel.app,staging.myapp.com"
   ```
   - Subdomains are automatically permitted (e.g. adding `myapp.com` allows `api.myapp.com` and `app.myapp.com`).
   - You can also specify full URLs (e.g. `https://my-app.vercel.app/`), from which the hostname is extracted automatically.
   - For unrestricted public domain testing in staging environments, you can set `ALLOWED_TEST_DOMAINS="*"`.
3. **Strict Cloud Metadata & Private Network Isolation:**
   - Cloud provider metadata service endpoints (`169.254.169.254`, `metadata.google.internal`) and link-local ranges (`169.254.0.0/16`) are **strictly and unconditionally blocked**, regardless of the whitelist.
   - Unauthorized private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked unless explicitly listed.
   - All HTTP redirects and browser navigation hops are validated in real-time before network sockets connect.

### 4. Supabase Database Setup
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Paste and run the contents of `supabase/setup.sql`. This will:
   - Create the `profiles`, `test_runs`, and `test_results` tables.
   - Configure Row Level Security (RLS) policies.
   - Install the user signup trigger (`handle_new_user`).
   - Configure the `test-evidence` private storage bucket.

### 5. Running the Application

#### Option A: Full-Stack Mode (Express + Vite)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Option B: Running FastAPI Backend Standalone
```bash
# Terminal 1: Launch FastAPI Python server on port 8000
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Run frontend dev server
npm run dev
```

### 6. Running Automated Tests
```bash
python3 -m pytest backend/tests
```

---

## 🛡️ Security Architecture
- **SSRF Protection:** Resolves hostnames to destination IP addresses and blocks private subnets (RFC 1918), loopback (`127.0.0.1`), link-local (`169.254.0.0/16`), and AWS/GCP metadata endpoints.
- **Resource Sandboxing:** Playwright Chromium runs with bounded timeouts (15 seconds) and isolated browser contexts.
- **Row-Level Security:** Every test run and result is bound to `auth.uid() = user_id`.
