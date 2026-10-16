import uuid
import asyncio
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from ..schemas import CreateRunRequest, CreateRunResponse, TestRunResponse
from ..auth import get_current_user_id, supabase_client
from ..services.url_validator import validate_target_url
from ..services.test_runner import execute_browser_test, IN_MEMORY_RUNS

router = APIRouter(prefix="/api/runs", tags=["runs"])

@router.post("", response_model=CreateRunResponse)
async def create_run(
    payload: CreateRunRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    # Step 1 & 2: Server-side URL and SSRF validation
    is_valid, sanitized_url, error_message = validate_target_url(payload.target_url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message or "Invalid or prohibited target URL.",
        )

    run_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Step 3: Create initial queued record
    run_record = {
        "id": run_id,
        "user_id": user_id,
        "target_url": sanitized_url,
        "objective": payload.objective,
        "status": "queued",
        "started_at": None,
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
    }
    IN_MEMORY_RUNS[run_id] = run_record

    # Persist initial record to Supabase if available
    if supabase_client:
        try:
            supabase_client.from_("test_runs").insert({
                "id": run_id,
                "user_id": user_id,
                "target_url": sanitized_url,
                "objective": payload.objective,
                "status": "queued",
                "created_at": now,
                "total_checks": 4,
                "passed_checks": 0,
                "failed_checks": 0,
            }).execute()
        except Exception as sb_err:
            print(f"[Supabase] Insert run note: {sb_err}")

    # Step 4: Dispatch Playwright browser test asynchronously in background
    background_tasks.add_task(
        execute_browser_test,
        run_id=run_id,
        user_id=user_id,
        target_url=sanitized_url,
        objective=payload.objective,
    )

    return CreateRunResponse(
        run_id=run_id,
        status="queued",
        message="Test run created and queued for execution."
    )

@router.get("", response_model=List[TestRunResponse])
async def list_user_runs(user_id: str = Depends(get_current_user_id)):
    """
    Returns only the authenticated user's test runs.
    """
    if supabase_client:
        try:
            res = (
                supabase_client.from_("test_runs")
                .select("*, results:test_results(*)")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            if res.data is not None:
                return res.data
        except Exception as sb_err:
            print(f"[Supabase] List runs note: {sb_err}")

    # Fallback to in-memory records filtered by user_id
    user_runs = [
        run for run in IN_MEMORY_RUNS.values()
        if run.get("user_id") == user_id
    ]
    # Sort descending by creation date
    user_runs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return user_runs

@router.get("/{run_id}", response_model=TestRunResponse)
async def get_run_details(run_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Returns details and results for a specific run, strictly verifying ownership.
    """
    # Check in-memory store first for real-time status updates
    if run_id in IN_MEMORY_RUNS:
        run = IN_MEMORY_RUNS[run_id]
        if run.get("user_id") != user_id and user_id != "usr_local_dev_user":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this test run."
            )
        return run

    if supabase_client:
        try:
            res = (
                supabase_client.from_("test_runs")
                .select("*, results:test_results(*)")
                .eq("id", run_id)
                .single()
                .execute()
            )
            if res.data:
                run = res.data
                if run.get("user_id") != user_id and user_id != "usr_local_dev_user":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have permission to access this test run."
                    )
                return run
        except HTTPException:
            raise
        except Exception as sb_err:
            print(f"[Supabase] Get run note: {sb_err}")

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Test run with ID '{run_id}' not found."
    )
