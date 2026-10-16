from typing import Optional, List, Any
from pydantic import BaseModel, HttpUrl, Field

class CreateRunRequest(BaseModel):
    target_url: str = Field(..., description="Target website URL to test (HTTP or HTTPS)")
    objective: Optional[str] = Field(None, description="Optional testing objective or focus scenario")

class TestResultItemResponse(BaseModel):
    id: str
    run_id: str
    user_id: str
    test_name: str
    status: str
    expected_result: str
    actual_result: str
    error_message: Optional[str] = None
    reproduction_steps: Optional[List[str]] = None
    created_at: str

class TestRunResponse(BaseModel):
    id: str
    user_id: str
    target_url: str
    objective: Optional[str] = None
    status: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str
    page_title: Optional[str] = None
    final_url: Optional[str] = None
    http_status: Optional[int] = None
    error_message: Optional[str] = None
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    screenshot_path: Optional[str] = None
    results: List[TestResultItemResponse] = []

class CreateRunResponse(BaseModel):
    run_id: str
    status: str
    message: str = "Test run queued successfully."

class HealthResponse(BaseModel):
    status: str
    browser_automation_available: bool
    version: str
    timestamp: str
    message: Optional[str] = None
