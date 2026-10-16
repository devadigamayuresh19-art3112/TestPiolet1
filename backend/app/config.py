import os
from typing import List
from urllib.parse import urlparse
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # Read ALLOWED_TEST_DOMAINS from backend environment
    ALLOWED_TEST_DOMAINS: str = os.getenv("ALLOWED_TEST_DOMAINS", "")
    ARTIFACT_STORAGE_BUCKET: str = os.getenv("ARTIFACT_STORAGE_BUCKET", "test-evidence")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    model_config = ConfigDict(extra="allow")

    @property
    def allowed_domains_list(self) -> List[str]:
        """
        Extracts authorized domains. Always includes localhost and 127.0.0.1 as initial dev hosts,
        plus any domains/hosts specified in the ALLOWED_TEST_DOMAINS environment variable.
        Supports hostnames, wildcard (*), and full URLs.
        """
        domains = {"localhost", "127.0.0.1"}
        raw = self.ALLOWED_TEST_DOMAINS or ""
        for item in raw.split(","):
            item = item.strip()
            if not item:
                continue
            if item == "*":
                domains.add("*")
                continue
            # If entry contains scheme or path, extract the hostname
            if "://" in item:
                try:
                    host = urlparse(item).hostname
                    if host:
                        domains.add(host.lower())
                except Exception:
                    pass
            else:
                # Strip port or path if user supplied host:port or host/path
                clean_host = item.split("/")[0].split(":")[0].strip().lower()
                if clean_host:
                    domains.add(clean_host)
        return sorted(list(domains))

settings = Settings()
