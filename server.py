from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import win32evtlog
import datetime
import hashlib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_severity(event_type):
    mapping = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW", 5: "INFO"}
    return mapping.get(event_type, "LOW")

def get_category(source_name):
    source = source_name.lower()
    if "security" in source or "auth" in source or "logon" in source:
        return "AUTH"
    elif "firewall" in source or "network" in source:
        return "NETWORK"
    elif "malware" in source or "defender" in source or "antivirus" in source:
        return "MALWARE"
    elif "intrusion" in source or "ids" in source:
        return "INTRUSION"
    else:
        return "SYSTEM"

def read_windows_logs(log_type="Security", count=30):
    logs = []
    try:
        hand = win32evtlog.OpenEventLog(None, log_type)
        flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
        events = win32evtlog.ReadEventLog(hand, flags, 0)
        for event in events[:count]:
            severity = get_severity(event.EventType)
            category = get_category(event.SourceName)
            message = str(event.StringInserts[0]) if event.StringInserts else "Windows system event"
            log_id = hashlib.md5(f"{event.RecordNumber}{event.TimeGenerated}".encode()).hexdigest()[:12]
            logs.append({
                "id": log_id,
                "timestamp": event.TimeGenerated.Format(),
                "severity": severity,
                "category": category,
                "sourceIp": "127.0.0.1",
                "destIp": "0.0.0.0",
                "hostname": "localhost",
                "user": "SYSTEM",
                "message": message[:120],
                "rawLog": f"[{log_type}] {event.SourceName}: {message[:200]}",
                "protocol": "WINDOWS",
                "port": 0,
                "bytes": 0,
                "country": "Local",
                "isThreat": severity in ["CRITICAL", "HIGH"],
                "tags": [log_type, event.SourceName[:20], severity]
            })
        win32evtlog.CloseEventLog(hand)
    except Exception as e:
        print(f"Error reading {log_type} logs: {e}")
    return logs

@app.get("/api/logs")
def get_logs():
    security = read_windows_logs("Security", 20)
    system = read_windows_logs("System", 15)
    application = read_windows_logs("Application", 15)
    all_logs = security + system + application
    all_logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"logs": all_logs[:50]}

@app.get("/api/alerts")
def get_alerts():
    logs = read_windows_logs("Security", 50)
    alerts = [l for l in logs if l["isThreat"]]
    return {"alerts": alerts[:20]}