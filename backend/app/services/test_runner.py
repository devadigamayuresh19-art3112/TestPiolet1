import asyncio
import uuid
import datetime
from typing import Dict, Any, List
from playwright.async_api import async_playwright
from .evidence_storage import upload_screenshot_evidence
from ..auth import supabase_client

# In-memory execution cache for fast polling and local state synchronization
IN_MEMORY_RUNS: Dict[str, Dict[str, Any]] = {}

async def execute_browser_test(run_id: str, user_id: str, target_url: str, objective: str = None) -> Dict[str, Any]:
    """
    Spawns an isolated Playwright Chromium instance, navigates to target_url,
    executes deterministic checks, captures a screenshot, and persists results.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    run_record = IN_MEMORY_RUNS.get(run_id, {
        "id": run_id,
        "user_id": user_id,
        "target_url": target_url,
        "objective": objective,
        "status": "running",
        "started_at": now,
        "completed_at": None,
        "created_at": now,
        "page_title": None,
        "final_url": None,
        "http_status": None,
        "error_message": None,
        "total_checks": 4,
        "passed_checks": 0,
        "failed_checks": 0,
        "screenshot_path": None,
        "results": [],
    })
    run_record["status"] = "running"
    run_record["started_at"] = now
    IN_MEMORY_RUNS[run_id] = run_record

    results: List[Dict[str, Any]] = []
    browser = None
    page = None
    final_url = None
    http_status = None
    page_title = None
    screenshot_url = None
    error_msg = None

    try:
        async with async_playwright() as p:
            # Launch Chromium with headless security flags and bounded timeout
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
                timeout=15000,
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="TestPilot-Autonomous-QA/1.0",
                ignore_https_errors=False,
            )
            page = await context.new_page()

            # Track console errors
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

            # Intercept navigations and redirects to enforce ALLOWED_TEST_DOMAINS and block SSRF
            from .url_validator import validate_target_url
            redirect_error: Optional[str] = None

            async def intercept_route(route):
                nonlocal redirect_error
                req = route.request
                if req.is_navigation_request():
                    req_valid, _, req_err = validate_target_url(req.url)
                    if not req_valid:
                        redirect_error = f"Redirect to unauthorized host blocked: {req_err}"
                        await route.abort("blockedbyclient")
                        return
                await route.continue_()

            await page.route("**/*", intercept_route)

            # STEP 5 & 6: Navigate with 15s timeout
            response = None
            try:
                response = await page.goto(target_url, wait_until="load", timeout=15000)
                final_url = page.url
                if response:
                    http_status = response.status
            except Exception as nav_err:
                error_msg = redirect_error or f"Navigation failed: {str(nav_err)}"

            # CHECK 1: Navigation & HTTP Reachability
            check_1_id = str(uuid.uuid4())
            is_http_ok = response is not None and (200 <= response.status < 400)
            results.append({
                "id": check_1_id,
                "run_id": run_id,
                "user_id": user_id,
                "test_name": "HTTP Reachability & Navigation",
                "status": "passed" if is_http_ok else "failed",
                "expected_result": "Successful HTTP response (status code 200–399)",
                "actual_result": f"Received HTTP {http_status}" if http_status else (error_msg or "No HTTP response"),
                "error_message": None if is_http_ok else (error_msg or f"HTTP status {http_status}"),
                "reproduction_steps": [
                    f"Navigate to {target_url}",
                    "Wait for response headers",
                    f"Observed HTTP {http_status}"
                ],
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            })

            # CHECK 2: Document Title Verification
            check_2_id = str(uuid.uuid4())
            if response and not error_msg:
                try:
                    page_title = await page.title()
                    has_title = bool(page_title and page_title.strip())
                    results.append({
                        "id": check_2_id,
                        "run_id": run_id,
                        "user_id": user_id,
                        "test_name": "Page Document Title Check",
                        "status": "passed" if has_title else "failed",
                        "expected_result": "Non-empty HTML document <title>",
                        "actual_result": f"Title found: '{page_title}'" if has_title else "Document title is blank or missing",
                        "error_message": None if has_title else "Page has empty title tag",
                        "reproduction_steps": ["Inspect document.title after load event"],
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    })
                except Exception as title_err:
                    results.append({
                        "id": check_2_id,
                        "run_id": run_id,
                        "user_id": user_id,
                        "test_name": "Page Document Title Check",
                        "status": "failed",
                        "expected_result": "Non-empty HTML document <title>",
                        "actual_result": f"Title extraction error: {str(title_err)}",
                        "error_message": str(title_err),
                        "reproduction_steps": ["Inspect document.title after load event"],
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    })
            else:
                results.append({
                    "id": check_2_id,
                    "run_id": run_id,
                    "user_id": user_id,
                    "test_name": "Page Document Title Check",
                    "status": "failed",
                    "expected_result": "Non-empty HTML document <title>",
                    "actual_result": "Skipped due to navigation failure",
                    "error_message": "Page could not be loaded",
                    "reproduction_steps": [f"Target {target_url} was unreachable"],
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                })

            # CHECK 3: Main DOM Body Render Check
            check_3_id = str(uuid.uuid4())
            if response and not error_msg:
                try:
                    body_element = await page.query_selector("body")
                    body_text = await page.evaluate("() => document.body ? document.body.innerText.trim().length : 0")
                    has_content = body_element is not None and body_text > 0
                    results.append({
                        "id": check_3_id,
                        "run_id": run_id,
                        "user_id": user_id,
                        "test_name": "DOM Body Render & Visibility",
                        "status": "passed" if has_content else "failed",
                        "expected_result": "HTML <body> element rendered with visible content",
                        "actual_result": f"Body rendered ({body_text} text chars)" if has_content else "Body is empty",
                        "error_message": None if has_content else "Document body contains no visible text",
                        "reproduction_steps": ["Evaluate document.body.innerText"],
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    })
                except Exception as dom_err:
                    results.append({
                        "id": check_3_id,
                        "run_id": run_id,
                        "user_id": user_id,
                        "test_name": "DOM Body Render & Visibility",
                        "status": "failed",
                        "expected_result": "HTML <body> element rendered with visible content",
                        "actual_result": f"DOM evaluation failed: {str(dom_err)}",
                        "error_message": str(dom_err),
                        "reproduction_steps": ["Evaluate document.body"],
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    })
            else:
                results.append({
                    "id": check_3_id,
                    "run_id": run_id,
                    "user_id": user_id,
                    "test_name": "DOM Body Render & Visibility",
                    "status": "failed",
                    "expected_result": "HTML <body> rendered with visible content",
                    "actual_result": "Skipped due to navigation failure",
                    "error_message": "Page could not be loaded",
                    "reproduction_steps": [f"Target {target_url} was unreachable"],
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                })

            # CHECK 4: Console Error & Runtime Exception Audit
            check_4_id = str(uuid.uuid4())
            has_no_console_errors = len(console_errors) == 0
            results.append({
                "id": check_4_id,
                "run_id": run_id,
                "user_id": user_id,
                "test_name": "Runtime Console Error Audit",
                "status": "passed" if has_no_console_errors else "failed",
                "expected_result": "Zero uncaught JavaScript console errors during page execution",
                "actual_result": "Clean execution (0 console errors)" if has_no_console_errors else f"Encountered {len(console_errors)} console error(s)",
                "error_message": "; ".join(console_errors[:3]) if console_errors else None,
                "reproduction_steps": ["Listen for page 'console' error events during window load"],
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            })

            # STEP 9: Capture Evidence Screenshot
            if page and not page.is_closed():
                try:
                    screenshot_bytes = await page.screenshot(type="png", full_page=False)
                    screenshot_url = upload_screenshot_evidence(user_id, run_id, screenshot_bytes)
                except Exception as sc_err:
                    print(f"[Playwright] Screenshot capture note: {sc_err}")

            await context.close()
            await browser.close()

    except Exception as browser_fatal_err:
        error_msg = f"Browser automation encountered error: {str(browser_fatal_err)}"
        if not results:
            results.append({
                "id": str(uuid.uuid4()),
                "run_id": run_id,
                "user_id": user_id,
                "test_name": "Browser Automation Engine",
                "status": "failed",
                "expected_result": "Chromium headless browser session initializes and executes successfully",
                "actual_result": error_msg,
                "error_message": error_msg,
                "reproduction_steps": ["Launch Chromium process"],
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            })

    # Calculate final status
    passed_count = sum(1 for r in results if r["status"] == "passed")
    failed_count = sum(1 for r in results if r["status"] == "failed")
    total_count = len(results)

    final_status = "passed" if (failed_count == 0 and passed_count > 0) else "failed"
    if error_msg and passed_count == 0:
        final_status = "error"

    completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Update in-memory record
    run_record.update({
        "status": final_status,
        "completed_at": completed_at,
        "final_url": final_url,
        "http_status": http_status,
        "page_title": page_title,
        "error_message": error_msg,
        "total_checks": total_count,
        "passed_checks": passed_count,
        "failed_checks": failed_count,
        "screenshot_path": screenshot_url,
        "results": results,
    })
    IN_MEMORY_RUNS[run_id] = run_record

    # Sync with Supabase if configured
    if supabase_client:
        try:
            supabase_client.from_("test_runs").update({
                "status": final_status,
                "completed_at": completed_at,
                "final_url": final_url,
                "http_status": http_status,
                "page_title": page_title,
                "error_message": error_msg,
                "total_checks": total_count,
                "passed_checks": passed_count,
                "failed_checks": failed_count,
                "screenshot_path": screenshot_url,
            }).eq("id", run_id).execute()

            # Insert test results
            for r in results:
                supabase_client.from_("test_results").insert({
                    "id": r["id"],
                    "run_id": run_id,
                    "user_id": user_id,
                    "test_name": r["test_name"],
                    "status": r["status"],
                    "expected_result": r["expected_result"],
                    "actual_result": r["actual_result"],
                    "error_message": r["error_message"],
                    "reproduction_steps": r["reproduction_steps"],
                }).execute()
        except Exception as sb_sync_err:
            print(f"[Supabase] Sync notice: {sb_sync_err}")

    return run_record
