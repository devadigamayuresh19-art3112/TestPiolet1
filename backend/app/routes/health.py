import datetime
from fastapi import APIRouter
from ..schemas import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health", response_model=HealthResponse)
async def get_health():
    browser_available = True
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        browser_available = False

    return HealthResponse(
        status="healthy",
        browser_automation_available=browser_available,
        version="1.0.0",
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        message="TestPilot AI testing engine is running."
    )
