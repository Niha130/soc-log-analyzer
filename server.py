from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import datetime
import hashlib
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HOSTS = ["dc-01", "db-server-02", "api-gateway-01", "linux-dev-04", "web-server-03", "firewall-01", "endpoint-05"]
USERS = ["admin", "john.doe", "svc-account", "SYSTEM", "jane.smith", "root", "guest"]
SOURCE_IPS = ["192.168.1.10", "10.0.0.5", "172.16.0.3", "45.33.32.156", "185.220.101.45", "103.21.244.0", "192.168.50.22"]
DEST_IPS = ["192.168.1.1", "8.8.8.8", "10.0.0.1", "172.217.14.206", "151.101.1.140"]
COUNTRIES = ["Local", "Russia", "China", "USA", "Germany", "Netherlands", "Local", "Local"]

EVENTS = [
    {"severity": "CRITICAL", "category": "MALWARE", "message": "Ransomware execution detected in user directory", "tags": ["ransomware", "endpoint", "critical"]},
    {"severity": "CRITICAL", "category": "INTRUSION", "message": "Brute force attack detected - 500 failed login attempts", "tags": ["brute-force", "auth", "critical"]},
    {"severity": "CRITICAL", "category": "DATA_EXFIL", "message": "Large data transfer to external IP detected", "tags": ["exfiltration", "network", "critical"]},
    {"severity": "HIGH", "category": "AUTH", "message": "Privileged account login from unusual location", "tags": ["auth", "privilege", "anomaly"]},
    {"severity": "HIGH", "category": "MALWARE", "message": "Known malware hash matched in process list", "tags": ["malware", "hash", "detection"]},
    {"severity": "HIGH", "category": "NETWORK", "message": "Port scan detected from external IP", "tags": ["recon", "network", "scan"]},
    {"severity": "HIGH", "category": "AUTH", "message": "Multiple failed SSH login attempts detected", "tags": ["ssh", "brute-force", "auth"]},
    {"severity": "MEDIUM", "category": "POLICY", "message": "Unauthorized software installation attempt", "tags": ["policy", "software", "violation"]},
    {"severity": "MEDIUM", "category": "NETWORK", "message": "DNS query to known malicious domain blocked", "tags": ["dns", "malicious", "blocked"]},
    {"severity": "MEDIUM", "category": "AUTH", "message": "User account locked after failed attempts", "tags": ["auth", "lockout", "policy"]},
    {"severity": "MEDIUM", "category": "SYSTEM", "message": "Critical system file modification detected", "tags": ["filesystem", "integrity", "system"]},
    {"severity": "LOW", "category": "SYSTEM", "message": "System configuration change detected", "tags": ["config", "system", "change"]},
    {"severity": "LOW", "category": "AUTH", "message": "Successful user login recorded", "tags": ["auth", "login", "normal"]},
    {"severity": "LOW", "category": "NETWORK", "message": "Firewall rule triggered for outbound traffic", "tags": ["firewall", "network", "policy"]},
    {"severity": "LOW", "category": "POLICY", "message": "USB device connected to endpoint", "tags": ["usb", "endpoint", "policy"]},
    {"severity": "INFO", "category": "SYSTEM", "message": "Scheduled backup completed successfully", "tags": ["backup", "system", "info"]},
]

def generate_log(index=0):
    event = random.choice(EVENTS)
    host = random.choice(HOSTS)
    src_ip = random.choice(SOURCE_IPS)
    now = datetime.datetime.utcnow() - datetime.timedelta(seconds=random.randint(0, 3600))
    log_id = hashlib.md5(f"{index}{time.time()}{random.random()}".encode()).hexdigest()[:12]

    return {
        "id": log_id,
        "timestamp": now.strftime("%a %b %d %H:%M:%S %Y"),
        "severity": event["severity"],
        "category": event["category"],
        "sourceIp": src_ip,
        "destIp": random.choice(DEST_IPS),
        "hostname": host,
        "user": random.choice(USERS),
        "message": event["message"],
        "rawLog": f"[{event['category']}] {host} {src_ip}: {event['message']}",
        "protocol": random.choice(["TCP", "UDP", "HTTP", "HTTPS", "SSH", "DNS"]),
        "port": random.choice([22, 80, 443, 3389, 53, 8080, 445]),
        "bytes": random.randint(100, 99999),
        "country": random.choice(COUNTRIES),
        "isThreat": event["severity"] in ["CRITICAL", "HIGH"],
        "tags": event["tags"]
    }

@app.get("/")
def root():
    return {"status": "SOC Log Analyzer API running", "author": "Niha130"}

@app.get("/api/logs")
def get_logs():
    logs = [generate_log(i) for i in range(50)]
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"logs": logs}

@app.get("/api/alerts")
def get_alerts():
    logs = [generate_log(i) for i in range(50)]
    alerts = [l for l in logs if l["isThreat"]]
    return {"alerts": alerts[:20]}