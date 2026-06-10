#!/usr/bin/env python3
"""
SOC Log Analyzer - Python Backend
Author: Niha130
Description: FastAPI backend for log ingestion, parsing, and threat detection.
             Run alongside the Vite frontend (proxied on /api).
"""

import json
import random
import hashlib
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum

try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError:
    print("Install dependencies: pip install fastapi uvicorn pydantic")
    raise


# ─── Enums ────────────────────────────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class Category(str, Enum):
    AUTH = "AUTH"
    NETWORK = "NETWORK"
    SYSTEM = "SYSTEM"
    MALWARE = "MALWARE"
    INTRUSION = "INTRUSION"
    DATA_EXFIL = "DATA_EXFIL"
    RECON = "RECON"
    POLICY = "POLICY"


# ─── Models ───────────────────────────────────────────────────────────────────

class LogEntry(BaseModel):
    id: str
    timestamp: str
    severity: Severity
    category: Category
    source_ip: str
    dest_ip: Optional[str] = None
    hostname: str
    user: Optional[str] = None
    message: str
    raw_log: str
    protocol: Optional[str] = None
    port: Optional[int] = None
    bytes: Optional[int] = None
    country: Optional[str] = None
    is_threat: bool
    tags: List[str]


class Alert(BaseModel):
    id: str
    title: str
    description: str
    severity: Severity
    category: Category
    status: str
    affected_host: str
    source_ip: str
    timestamp: str
    mitre_id: Optional[str] = None
    mitre_tactic: Optional[str] = None
    related_logs: List[str] = []


class ThreatCheckRequest(BaseModel):
    value: str
    type: str  # IP | DOMAIN | HASH | URL | EMAIL


class ThreatCheckResponse(BaseModel):
    value: str
    is_threat: bool
    severity: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None


# ─── In-memory stores ─────────────────────────────────────────────────────────

KNOWN_THREAT_IPS = {
    "185.220.101.47": {"severity": "CRITICAL", "description": "Known Tor exit node / ransomware C2", "source": "AbuseIPDB"},
    "91.234.99.12": {"severity": "HIGH", "description": "Credential stuffing botnet", "source": "AlienVault OTX"},
    "198.51.100.23": {"severity": "MEDIUM", "description": "Scanner / recon activity", "source": "Shodan"},
}

KNOWN_THREAT_DOMAINS = {
    "update-service-cdn.xyz": {"severity": "HIGH", "description": "Cobalt Strike C2 domain", "source": "VirusTotal"},
    "telemetry-microsoft.cc": {"severity": "HIGH", "description": "Typosquatting credential harvester", "source": "VirusTotal"},
}

log_store: List[LogEntry] = []
alert_store: List[Alert] = []
log_counter = 0


# ─── Helpers ──────────────────────────────────────────────────────────────────

THREAT_MESSAGES = {
    "AUTH": [
        "Multiple failed SSH login attempts from external IP",
        "Brute-force attack detected on /admin panel",
        "Privilege escalation attempt detected",
    ],
    "NETWORK": [
        "Outbound connection to known C2 infrastructure",
        "Suspicious DNS query to newly registered domain",
        "Port scan sweep from internal host",
    ],
    "MALWARE": [
        "Ransomware encryption pattern detected",
        "Known malware hash matched in process list",
        "Trojan downloader behaviour observed",
    ],
}

HOSTNAMES = ["web-prod-01", "db-server-02", "auth-svc-03", "proxy-01", "endpoint-win-07", "dc-01"]
INTERNAL_IPS = ["10.0.1.5", "10.0.1.12", "192.168.0.44", "172.16.0.3"]
THREAT_IPS = list(KNOWN_THREAT_IPS.keys()) + [
    f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
    for _ in range(10)
]


def is_threat_ip(ip: str) -> bool:
    return ip in KNOWN_THREAT_IPS


def classify_severity(category: str, source_ip: str) -> Severity:
    if is_threat_ip(source_ip):
        return random.choice([Severity.CRITICAL, Severity.HIGH])
    weights = [5, 15, 30, 35, 15]  # CRITICAL HIGH MEDIUM LOW INFO
    return random.choices(list(Severity), weights=weights, k=1)[0]


def generate_log() -> LogEntry:
    global log_counter
    log_counter += 1

    category = random.choice(list(Category))
    is_ext_threat = random.random() < 0.25
    source_ip = random.choice(THREAT_IPS) if is_ext_threat else random.choice(INTERNAL_IPS)
    severity = classify_severity(category.value, source_ip)
    is_threat = severity in (Severity.CRITICAL, Severity.HIGH) or is_threat_ip(source_ip)

    messages = THREAT_MESSAGES.get(category.value, ["Suspicious activity detected"])
    message = random.choice(messages)

    now = datetime.now(timezone.utc).isoformat()
    raw = f"[{now}] {category.value} {severity.value} src={source_ip} dst={random.choice(INTERNAL_IPS)} msg=\"{message}\""

    return LogEntry(
        id=f"LOG-{str(log_counter).zfill(6)}",
        timestamp=now,
        severity=severity,
        category=category,
        source_ip=source_ip,
        dest_ip=random.choice(INTERNAL_IPS),
        hostname=random.choice(HOSTNAMES),
        user=random.choice(["admin", "svc_account", "niha130", None, "jsmith"]),
        message=message,
        raw_log=raw,
        protocol=random.choice(["TCP", "UDP", "HTTP", "HTTPS", "SSH", "DNS"]),
        port=random.choice([22, 80, 443, 3389, 53, 445]),
        bytes=random.randint(128, 50000),
        country="RU" if is_ext_threat else "US",
        is_threat=is_threat,
        tags=[category.value.lower(), severity.value.lower()],
    )


def maybe_generate_alert(log: LogEntry) -> Optional[Alert]:
    if log.severity not in (Severity.CRITICAL, Severity.HIGH):
        return None
    if random.random() > 0.4:
        return None

    mitre_map = {
        "AUTH": ("T1110", "Credential Access"),
        "MALWARE": ("T1055", "Defense Evasion"),
        "NETWORK": ("T1071", "Command and Control"),
        "INTRUSION": ("T1190", "Initial Access"),
        "DATA_EXFIL": ("T1048", "Exfiltration"),
        "RECON": ("T1595", "Reconnaissance"),
    }
    mitre = mitre_map.get(log.category.value)

    return Alert(
        id=f"ALT-{str(uuid.uuid4())[:8].upper()}",
        title=f"Auto-Detected: {log.category.value} on {log.hostname}",
        description=log.message,
        severity=log.severity,
        category=log.category,
        status="OPEN",
        affected_host=log.hostname,
        source_ip=log.source_ip,
        timestamp=log.timestamp,
        mitre_id=mitre[0] if mitre else None,
        mitre_tactic=mitre[1] if mitre else None,
        related_logs=[log.id],
    )


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SOC Analyzer API",
    description="Log ingestion, threat detection, and alert management by Niha130",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "author": "Niha130", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/logs", response_model=List[LogEntry])
def get_logs(
    limit: int = Query(100, ge=1, le=500),
    severity: Optional[str] = None,
    category: Optional[str] = None,
    threat_only: bool = False,
):
    result = log_store[-limit:][::-1]
    if severity:
        result = [l for l in result if l.severity.value == severity.upper()]
    if category:
        result = [l for l in result if l.category.value == category.upper()]
    if threat_only:
        result = [l for l in result if l.is_threat]
    return result


@app.post("/api/logs/generate")
def generate_log_endpoint():
    """Generate a single synthetic log entry."""
    log = generate_log()
    log_store.append(log)
    if len(log_store) > 5000:
        log_store.pop(0)

    alert = maybe_generate_alert(log)
    if alert:
        alert_store.append(alert)
        if len(alert_store) > 1000:
            alert_store.pop(0)

    return {"log": log, "alert_generated": alert is not None, "alert": alert}


@app.post("/api/logs/ingest", response_model=LogEntry)
def ingest_log(entry: LogEntry):
    """Ingest a real log entry from an external source."""
    log_store.append(entry)
    alert = maybe_generate_alert(entry)
    if alert:
        alert_store.append(alert)
    return entry


@app.get("/api/alerts", response_model=List[Alert])
def get_alerts(status: Optional[str] = None, limit: int = 50):
    result = alert_store[-limit:][::-1]
    if status:
        result = [a for a in result if a.status == status.upper()]
    return result


@app.put("/api/alerts/{alert_id}/status")
def update_alert_status(alert_id: str, status: str):
    for alert in alert_store:
        if alert.id == alert_id:
            alert.status = status.upper()
            return {"success": True, "alert_id": alert_id, "new_status": status.upper()}
    raise HTTPException(status_code=404, detail="Alert not found")


@app.post("/api/threat/check", response_model=ThreatCheckResponse)
def check_threat(req: ThreatCheckRequest):
    """Check if a value (IP, domain, hash) is in the threat intelligence feed."""
    value = req.value.strip()

    if req.type.upper() == "IP" and value in KNOWN_THREAT_IPS:
        info = KNOWN_THREAT_IPS[value]
        return ThreatCheckResponse(value=value, is_threat=True, **info)

    if req.type.upper() == "DOMAIN":
        clean = value.replace("hxxp://", "").replace("http://", "").replace("https://", "").split("/")[0]
        if clean in KNOWN_THREAT_DOMAINS:
            info = KNOWN_THREAT_DOMAINS[clean]
            return ThreatCheckResponse(value=value, is_threat=True, **info)

    return ThreatCheckResponse(value=value, is_threat=False)


@app.get("/api/stats")
def get_stats():
    total = len(log_store)
    return {
        "total_logs": total,
        "critical": sum(1 for l in log_store if l.severity == Severity.CRITICAL),
        "high": sum(1 for l in log_store if l.severity == Severity.HIGH),
        "medium": sum(1 for l in log_store if l.severity == Severity.MEDIUM),
        "low": sum(1 for l in log_store if l.severity == Severity.LOW),
        "threats": sum(1 for l in log_store if l.is_threat),
        "open_alerts": sum(1 for a in alert_store if a.status == "OPEN"),
        "total_alerts": len(alert_store),
    }


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("  SOC Analyzer API — Niha130")
    print("  http://localhost:8000")
    print("  Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
