"""Pydantic request/response schemas for the analysis API."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
import re


# ── Request Schemas ───────────────────────────────────────────────────────────

class URLAnalysisRequest(BaseModel):
    """Request body for POST /api/analyze/url"""
    url: str = Field(..., min_length=4, max_length=2048, description="URL to analyze")
    include_vision: bool = Field(False, description="Whether to capture and analyze a screenshot (slow)")

    @field_validator("url")
    @classmethod
    def sanitize_url(cls, v: str) -> str:
        v = v.strip()
        # Basic URL format check — real validation done in URLAnalyzer
        if not re.match(r"^https?://", v, re.IGNORECASE):
            # Allow bare domains by prepending https
            if re.match(r"^[a-zA-Z0-9]", v):
                v = "https://" + v
        return v


class PageAnalysisRequest(BaseModel):
    """Request body for POST /api/analyze/page"""
    url: str = Field(..., min_length=4, max_length=2048)
    title: Optional[str] = Field(None, max_length=512)
    meta_description: Optional[str] = Field(None, max_length=1024)
    # Visible text — truncated on client side before sending
    visible_text: Optional[str] = Field(None, max_length=10_000)
    # Structural metadata — never raw HTML with user data
    html_snippet: Optional[str] = Field(None, max_length=50_000,
        description="Safe HTML subset: structure only, no form values")
    form_count: int = Field(0, ge=0, le=100)
    password_field_count: int = Field(0, ge=0, le=50)
    external_script_count: int = Field(0, ge=0, le=500)
    iframe_count: int = Field(0, ge=0, le=100)
    link_count: int = Field(0, ge=0, le=10_000)
    external_links: Optional[list] = Field(default_factory=list)
    include_vision: bool = Field(False)

    @field_validator("url")
    @classmethod
    def sanitize_url(cls, v: str) -> str:
        return v.strip()


class ScreenshotAnalysisRequest(BaseModel):
    """Request body for POST /api/analyze/screenshot"""
    url: str = Field(..., max_length=2048)
    screenshot_base64: str = Field(..., description="Base64-encoded PNG/JPEG screenshot")


class ImageAnalysisResult(BaseModel):
    """Result from the EDI image malware/phishing analyzer."""
    filename: str
    format: Optional[str] = None
    mime_type: Optional[str] = None
    file_size_bytes: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    color_mode: Optional[str] = None
    sha256: Optional[str] = None
    ocr_text: str = ""
    ocr_engine: Optional[str] = None
    urls: list[str] = Field(default_factory=list)
    qr_codes: list[Dict[str, Any]] = Field(default_factory=list)
    risk_score: float = 0.0
    classification: str = "Safe / Benign"
    indicators: list[str] = Field(default_factory=list)
    matched_rules: list[Dict[str, Any]] = Field(default_factory=list)


# ── Response Schemas ──────────────────────────────────────────────────────────

class URLFeatures(BaseModel):
    """Raw features extracted from URL analysis."""
    length: int
    subdomain_count: int
    special_char_count: int
    has_https: bool
    has_ip_address: bool
    has_suspicious_tld: bool
    hyphen_count: int
    digit_count: int
    has_punycode: bool
    has_at_symbol: bool
    has_double_slash: bool
    suspicious_keywords_found: list[str]
    url_entropy: float
    domain: str
    tld: str
    path_length: int
    query_param_count: int


class PageFeatures(BaseModel):
    """Structural features extracted from page analysis."""
    login_form_detected: bool
    password_field_detected: bool
    external_form_submission: bool
    suspicious_iframe: bool
    hidden_elements_detected: bool
    external_scripts_count: int
    redirect_detected: bool
    suspicious_js_patterns: list[str]
    brand_keywords_found: list[str]
    form_count: int
    credential_form_score: float


class VisionResult(BaseModel):
    """Result from vision analysis module."""
    model_config = {"protected_namespaces": ()}
    analyzed: bool
    model_available: bool
    detections: list[Dict[str, Any]] = Field(default_factory=list)
    threat_score: float = 0.0
    threats_detected: list[str] = Field(default_factory=list)
    note: str = ""


class NLPResult(BaseModel):
    """Result from NLP social engineering analysis."""
    analyzed: bool
    urgency_score: float
    threat_score: float
    financial_pressure_score: float
    impersonation_score: float
    overall_score: float
    indicators: list[str] = Field(default_factory=list)


class RiskResult(BaseModel):
    """Final fused risk assessment."""
    risk_score: int = Field(..., ge=0, le=100)
    severity: str  # SAFE | SUSPICIOUS | DANGEROUS | CRITICAL
    url_risk: float
    page_risk: float
    vision_risk: float
    nlp_risk: float
    behavior_risk: float
    threats: list[str]
    evidence: list[str]
    confidence: float


class AnalysisResponse(BaseModel):
    """Top-level response returned to the browser extension."""
    model_config = {"protected_namespaces": ()}
    success: bool
    analysis_id: str
    url: str
    domain: str
    risk: RiskResult
    url_features: Optional[URLFeatures] = None
    page_features: Optional[PageFeatures] = None
    vision: Optional[VisionResult] = None
    image: Optional[ImageAnalysisResult] = None
    nlp: Optional[NLPResult] = None
    explanation: str  # AI Security Analyst output
    recommendation: str
    model_versions: Dict[str, str]
    scan_duration_ms: int


class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]
