import pytest
from backend.app.config import settings
from backend.app.services.url_validator import validate_target_url, is_cloud_metadata_ip, is_unauthorized_private_ip
import ipaddress

def test_initial_dev_hosts_allowed():
    # settings defaults to localhost,127.0.0.1
    settings.ALLOWED_TEST_DOMAINS = "localhost,127.0.0.1"

    valid, url, err = validate_target_url("http://localhost:3000")
    assert valid is True
    assert "localhost" in url
    assert err is None

    valid, url, err = validate_target_url("http://127.0.0.1:8000/api/health")
    assert valid is True
    assert "127.0.0.1" in url
    assert err is None

def test_unauthorized_domain_rejected():
    settings.ALLOWED_TEST_DOMAINS = "localhost,127.0.0.1"

    valid, url, err = validate_target_url("https://unauthorized-sample-site.org")
    assert valid is False
    assert "not an authorized test domain" in err
    assert "ALLOWED_TEST_DOMAINS" in err

def test_explicitly_authorized_domain_allowed():
    # Authorize example.com
    settings.ALLOWED_TEST_DOMAINS = "localhost,127.0.0.1,example.com"

    valid, url, err = validate_target_url("https://example.com")
    assert valid is True
    assert url.startswith("https://example.com")
    assert err is None

    # Subdomain matching for localhost
    valid, url, err = validate_target_url("http://test.localhost:3000")
    assert valid is True

def test_cloud_metadata_strictly_blocked():
    settings.ALLOWED_TEST_DOMAINS = "localhost,127.0.0.1,169.254.169.254"

    valid, url, err = validate_target_url("http://169.254.169.254/latest/meta-data")
    assert valid is False
    assert "metadata" in err.lower() or "blocked" in err.lower()

    valid, url, err = validate_target_url("http://metadata.google.internal/computeMetadata/v1/")
    assert valid is False

def test_unauthorized_private_ip_blocked():
    settings.ALLOWED_TEST_DOMAINS = "localhost,127.0.0.1"

    valid, url, err = validate_target_url("http://10.0.0.1")
    assert valid is False

    valid, url, err = validate_target_url("http://192.168.1.1")
    assert valid is False

def test_invalid_scheme_rejected():
    valid, url, err = validate_target_url("ftp://example.com")
    assert valid is False
    assert "scheme" in err.lower()

    valid, url, err = validate_target_url("file:///etc/passwd")
    assert valid is False

def test_ip_helper_functions():
    assert is_cloud_metadata_ip(ipaddress.ip_address("169.254.169.254")) is True
    assert is_cloud_metadata_ip(ipaddress.ip_address("169.254.1.1")) is True
    assert is_cloud_metadata_ip(ipaddress.ip_address("127.0.0.1")) is False

    assert is_unauthorized_private_ip(ipaddress.ip_address("10.0.0.1")) is True
    assert is_unauthorized_private_ip(ipaddress.ip_address("192.168.0.1")) is True
    assert is_unauthorized_private_ip(ipaddress.ip_address("172.16.0.1")) is True
    assert is_unauthorized_private_ip(ipaddress.ip_address("8.8.8.8")) is False
