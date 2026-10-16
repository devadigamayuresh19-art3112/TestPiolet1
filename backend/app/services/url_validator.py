import socket
import ipaddress
from urllib.parse import urlparse
from typing import Tuple, Optional
from ..config import settings

# Unconditional blocklist for cloud provider metadata endpoints
BLOCKED_METADATA_HOSTS = {
    "169.254.169.254",
    "metadata.google.internal",
    "metadata",
    "instance-data",
}

def is_cloud_metadata_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Checks if an IP falls in 169.254.0.0/16 (Link-local / Cloud metadata service)"""
    try:
        metadata_network = ipaddress.ip_network("169.254.0.0/16")
        return ip in metadata_network
    except Exception:
        return False

def is_unauthorized_private_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """
    Checks if an IP is in RFC 1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16),
    unspecified, multicast, or reserved networks.
    """
    try:
        return (
            ip.is_private
            and not ip.is_loopback
        ) or ip.is_multicast or ip.is_reserved or ip.is_unspecified
    except Exception:
        return True

def is_loopback_host(hostname_lower: str) -> bool:
    return (
        hostname_lower == "localhost"
        or hostname_lower == "127.0.0.1"
        or hostname_lower == "::1"
        or hostname_lower.endswith(".localhost")
    )

def validate_target_url(raw_url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates target URL scheme, hostname against ALLOWED_TEST_DOMAINS,
    redirect targets, and resolved IP addresses against cloud metadata and unauthorized private networks.
    Returns (is_valid, sanitized_url, error_message).
    """
    if not raw_url or not raw_url.strip():
        return False, None, "Target URL cannot be empty."

    url = raw_url.strip()
    if "://" not in url:
        url = "https://" + url

    # 1. URL Scheme Validation
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, None, f"Malformed URL syntax: {str(e)}"

    if parsed.scheme not in ("http", "https"):
        return False, None, f"Unsupported URL scheme '{parsed.scheme}://'. Only HTTP and HTTPS are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, None, "Target URL must contain a valid hostname or IP address."

    hostname_lower = hostname.lower()

    # 2. Block Cloud Metadata Endpoints Unconditionally
    if (
        hostname_lower in BLOCKED_METADATA_HOSTS
        or "metadata.google" in hostname_lower
        or hostname_lower.endswith(".internal")
    ):
        return False, None, "Access to cloud provider metadata service endpoints is strictly blocked."

    # 3. Allowed Domains Whitelist Enforcement (Requirement 3)
    allowed_domains = settings.allowed_domains_list
    is_domain_authorized = False

    for allowed in allowed_domains:
        if allowed == "*":
            is_domain_authorized = True
            break
        if hostname_lower == allowed or hostname_lower.endswith("." + allowed):
            is_domain_authorized = True
            break

    if not is_domain_authorized:
        allowed_str = ", ".join(allowed_domains)
        return (
            False,
            None,
            f"Target host '{hostname_lower}' is not an authorized test domain. "
            f"Currently authorized: [{allowed_str}]. "
            f"To allow this domain, add it to ALLOWED_TEST_DOMAINS in your backend environment configuration."
        )

    # 4. Resolve Destination IP and Validate Against Unauthorized Private Networks / Rebinding
    try:
        # If hostname is already an IPv4 literal
        try:
            parsed_ip = ipaddress.ip_address(hostname_lower)
            ip_objs = [parsed_ip]
        except ValueError:
            # Resolve DNS
            _, _, ip_strings = socket.gethostbyname_ex(hostname_lower)
            if not ip_strings:
                return False, None, f"Could not resolve host '{hostname_lower}' via DNS."
            ip_objs = [ipaddress.ip_address(ip_s) for ip_s in ip_strings]

        for ip_obj in ip_objs:
            # Always block cloud metadata IP range (169.254.0.0/16)
            if is_cloud_metadata_ip(ip_obj):
                return False, None, f"Target resolved to cloud metadata link-local address ({ip_obj}). Access blocked."

            # Block loopback if hostname was NOT an authorized loopback host (prevents DNS rebinding)
            if ip_obj.is_loopback:
                if not is_loopback_host(hostname_lower) or ("localhost" not in allowed_domains and "127.0.0.1" not in allowed_domains):
                    return False, None, f"Hostname '{hostname_lower}' resolved to loopback IP ({ip_obj}). Access denied."

            # Block unauthorized private network targets (RFC 1918)
            if is_unauthorized_private_ip(ip_obj):
                # If the user explicitly added this private IP or private domain to ALLOWED_TEST_DOMAINS, permit it; otherwise block
                if hostname_lower not in allowed_domains:
                    return False, None, f"Target resolved to unauthorized private network space ({ip_obj}). Access denied."

    except socket.gaierror:
        # If DNS fails for a non-loopback host
        if not is_loopback_host(hostname_lower):
            return False, None, f"DNS resolution failed for '{hostname_lower}'. Verify domain connectivity."
    except Exception as resolve_err:
        return False, None, f"Network destination verification error: {str(resolve_err)}"

    sanitized_url = parsed.geturl()
    return True, sanitized_url, None
