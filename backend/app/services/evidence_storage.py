import os
import base64
from typing import Optional
from ..config import settings
from ..auth import supabase_client

EVIDENCE_BUCKET = settings.ARTIFACT_STORAGE_BUCKET

def upload_screenshot_evidence(user_id: str, run_id: str, image_bytes: bytes) -> Optional[str]:
    """
    Uploads screenshot evidence to Supabase Storage or returns a Base64 data URI if storage bucket is unconfigured.
    """
    file_path = f"{user_id}/{run_id}/screenshot.png"

    if supabase_client and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            # Upload using Supabase storage client
            res = supabase_client.storage.from_(EVIDENCE_BUCKET).upload(
                path=file_path,
                file=image_bytes,
                file_options={"content-type": "image/png", "upsert": "true"}
            )
            # Create a signed URL valid for 24 hours
            signed_url_res = supabase_client.storage.from_(EVIDENCE_BUCKET).create_signed_url(
                path=file_path,
                expires_in=86400
            )
            if signed_url_res and "signedURL" in signed_url_res:
                return signed_url_res["signedURL"]
        except Exception as e:
            print(f"[EvidenceStorage] Storage upload notice: {e}. Falling back to Data URI.")

    # Base64 fallback ensures screenshot is immediately visible in prototype even before Supabase bucket is provisioned
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/png;base64,{encoded}"
