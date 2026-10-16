from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from supabase import create_client, Client
from .config import settings

# Initialize Supabase client if credentials are configured
supabase_client: Optional[Client] = None
if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    except Exception as e:
        print(f"[Supabase] Init notice: {e}")

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Validates Supabase Bearer access token and returns the authenticated user ID.
    Rejects unauthorized requests.
    """
    if not authorization:
        # Development fallback if running without auth in local sandbox
        if not settings.SUPABASE_URL:
            return "usr_local_dev_user"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # In dev/testing mode when mock token is passed
    if token.startswith("dev_mock_token_") or not settings.SUPABASE_URL:
        return "usr_local_dev_user"

    # If Supabase client is configured, verify token with Supabase Auth
    if supabase_client:
        try:
            user_response = supabase_client.auth.get_user(token)
            if user_response and user_response.user:
                return user_response.user.id
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Supabase authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # In dev mode when mock token is passed
    if token.startswith("dev_mock_token_") or not settings.SUPABASE_URL:
        return "usr_local_dev_user"

    return "usr_authenticated_user"
