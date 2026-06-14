#!/usr/bin/env python3
import os, random, datetime, hashlib, time, json, threading, io, csv
import requests
from collections import defaultdict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

try:
    from sklearn.ensemble import IsolationForest
    import numpy as np
    ML_AVAILABLE = True
    print("[SOC] ML loaded OK")
except ImportError:
    ML_AVAILABLE = False
    print("[SOC] ML not available")

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

TELEGRAM_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

HOSTS      = ["dc-01","db-server-02","api-gateway-01","linux-dev-04","web-server-03","firewall-01","endpoint-05"]
USERS      = ["admin","john.doe","svc-account","SYSTEM","jane.smith","root","guest"]
SOURCE_IPS = ["192.168.1.10","10.0.0.5","172.16.0.3","45.33.32.156","185.220.101.45","103.21.244.0","192.168.50.22"]
DEST_IPS   = ["192.168.1.1","8.8.8.8","10.0.0.1","172.217.14.206","151.101.1.140"]
COUNTRIES  = ["Local","Russia","China","USA","Germany","Netherlands","Local","Local"]

EVENTS = [
    {"severity":"CRITICAL","category":"MALWARE",   "message":"Ransomware execution detected in user directory",   "mitre":"T1059"},
    {"severity":"CRITICAL","category":"INTRUSION", "message":"Brute force attack — 500 failed login attempts",    "mitre":"T1110"},
    {"severity":"CRITICAL","category":"DATA_EXFIL","message":"Large data transfer to external IP detected",       "mitre":"T1041"},
    {"severity":"HIGH",    "category":"AUTH",      "message":"Privileged account login from unusual location",    "mitre":"T1078"},
    {"severity":"HIGH",    "category":"MALWARE",   "message":"Known malware hash matched in process list",        "mitre":"T1059"},
    {"severity":"HIGH",    "category":"NETWORK",   "message":"Port scan detected from external IP",              "mitre":"T1046"},
    {"severity":"HIGH",    "category":"AUTH",      "message":"Multiple failed SSH login attempts detected",       "mitre":"T1110"},
    {"severity":"MEDIUM",  "category":"POLICY",    "message":"Unauthorized software installation attempt",        "mitre":"T1072"},
    {"severity":"MEDIUM",  "category":"NETWORK",   "message":"DNS query to known malicious domain blocked",       "mitre":"T1071"},
    {"severity":"MEDIUM",  "category":"AUTH",      "message":"User account locked after failed attempts",         "mitre":"T1110"},
    {"severity":"MEDIUM",  "category":"SYSTEM",    "message":"Critical system file modification detected",        "mitre":"T1565"},
    {"severity":"LOW",     "category":"SYSTEM",    "message":"System configuration change detected",             "mitre":"T1562"},
    {"severity":"LOW",     "category":"AUTH",      "message":"Successful user login recorded",                   "mitre":"T1078"},
    {"severity":"LOW",     "category":"NETWORK",   "message":"Firewall rule triggered for outbound traffic",     "mitre":"T1562"},
    {"severity":"LOW",     "category":"POLICY",    "message":"USB device connected to endpoint",                 "mitre":"T1052"},
    {"severity":"INFO",    "category":"SYSTEM",    "message":"Scheduled backup completed successfully",          "mitre":""},
]

# ── In-memory log store ───────────────────────────────────────────────────────
LIVE_LOGS  = []
MAX_LOGS   = 1000
LOGS_LOCK  = threading.Lock()

# ── Telegram tracking ─────────────────────────────────────────────────────────
_telegram_sent_ids    = set()
_critical_alert_count = 0

# ── ML model cache ─────────────────────────────────────────────────────────────
_ml_lock  = threading.Lock()


# ─────────────────────────────────────────────────────────────────────────────
# LOG GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_one_log():
    event  = random.choice(EVENTS)
    host   = random.choice(HOSTS)
    src    = random.choice(SOURCE_IPS)
    now    = datetime.datetime.utcnow()
    log_id = hashlib.md5(f"{time.time()}{random.random()}".encode()).hexdigest()[:12]

    log = {
        "id":        log_id,
        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
        "hour":      now.hour,
        "dayOfWeek": now.weekday(),
        "severity":  event["severity"],
        "category":  event["category"],
        "sourceIp":  src,
        "destIp":    random.choice(DEST_IPS),
        "hostname":  host,
        "user":      random.choice(USERS),
        "message":   event["message"],
        "rawLog":    f"[{event['category']}] {host} {src}: {event['message']}",
        "protocol":  random.choice(["TCP","UDP","HTTP","HTTPS","SSH","DNS"]),
        "port":      random.choice([22,80,443,3389,53,8080,445]),
        "bytes":     random.randint(100, 99999),
        "country":   random.choice(COUNTRIES),
        "isThreat":  event["severity"] in ["CRITICAL","HIGH"],
        "mitre":     event.get("mitre",""),
        "anomaly":   False,
    }
    return log


def background_log_generator():
    """Generates 1 new log every 3 seconds and stores in LIVE_LOGS."""
    while True:
        log = generate_one_log()
        with LOGS_LOCK:
            LIVE_LOGS.append(log)
            if len(LIVE_LOGS) > MAX_LOGS:
                LIVE_LOGS.pop(0)
        maybe_telegram(log)
        time.sleep(3)


# ─────────────────────────────────────────────────────────────────────────────
# TELEGRAM
# ─────────────────────────────────────────────────────────────────────────────

def send_telegram(message: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            data={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"},
            timeout=5
        )
    except Exception as e:
        print(f"[WARN] Telegram: {e}")


def maybe_telegram(log: dict):
    global _critical_alert_count

    if log["severity"] != "CRITICAL":
        return
    if log["id"] in _telegram_sent_ids:
        return

    _telegram_sent_ids.add(log["id"])
    _critical_alert_count += 1

    msg1 = (
        f"🔴 *SOC CRITICAL ALERT*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📋 *Event:* {log['message']}\n"
        f"🖥 *Host:* `{log['hostname']}`\n"
        f"🌐 *Source IP:* `{log['sourceIp']}`\n"
        f"👤 *User:* `{log['user']}`\n"
        f"🏷 *Category:* {log['category']}\n"
        f"🔍 *MITRE:* `{log.get('mitre','—')}`\n"
        f"🕐 *Time:* {log['timestamp']} UTC\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"_SOC Log Analyzer — Niha130_"
    )
    threading.Thread(target=send_telegram, args=(msg1,), daemon=True).start()

    def send_second():
        time.sleep(2)
        msg2 = (
            f"⚠️ *CRITICAL THREAT CONFIRMATION*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🚨 Threat `{log['id']}` requires *immediate action*\n"
            f"📍 Asset: `{log['hostname']}`\n"
            f"🌍 Origin: `{log['country']}`\n"
            f"🔗 Protocol: `{log['protocol']}` Port: `{log['port']}`\n"
            f"📊 Data: `{log['bytes']:,}` bytes\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"*Action required — Do not ignore.*\n"
            f"_SOC Log Analyzer — Niha130_"
        )
        send_telegram(msg2)
    threading.Thread(target=send_second, daemon=True).start()

    if _critical_alert_count % 15 == 0:
        def send_escalation():
            time.sleep(4)
            msg3 = (
                f"🚨🚨 *ESCALATION ALARM* 🚨🚨\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"*{_critical_alert_count} CRITICAL alerts* triggered.\n"
                f"Immediate SOC team response required.\n"
                f"Latest: `{log['message']}`\n"
                f"Host: `{log['hostname']}` | IP: `{log['sourceIp']}`\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"_SOC Log Analyzer — Niha130_"
            )
            send_telegram(msg3)
        threading.Thread(target=send_escalation, daemon=True).start()


# ─────────────────────────────────────────────────────────────────────────────
# ML ANOMALY DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def run_ml(logs: list) -> list:
    if not ML_AVAILABLE or len(logs) < 10:
        return logs
    try:
        with _ml_lock:
            features = [[
                ["INFO","LOW","MEDIUM","HIGH","CRITICAL"].index(l["severity"]),
                l["bytes"], l["port"], l["hour"],
            ] for l in logs]
            X = np.array(features)
            model = IsolationForest(contamination=0.1, random_state=42)
            preds = model.fit_predict(X)
            for i, log in enumerate(logs):
                log["anomaly"] = bool(preds[i] == -1)
    except Exception as e:
        print(f"[WARN] ML: {e}")
    return logs


# ─────────────────────────────────────────────────────────────────────────────
# START BACKGROUND THREAD
# ─────────────────────────────────────────────────────────────────────────────

threading.Thread(target=background_log_generator, daemon=True).start()


# ─────────────────────────────────────────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status":  "SOC Log Analyzer API v2.0",
        "author":  "Niha130",
        "ml":      ML_AVAILABLE,
        "logs_in_memory": len(LIVE_LOGS)
    }
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/logs")
def get_logs():
    random.seed(int(time.time()))
    # Return only 1 fresh log per call
    log = generate_log(index=random.randint(0, 9999))
    log = run_ml([log])[0]
    maybe_telegram(log)
    return {"logs": [log], "total": 1, "ml_enabled": ML_AVAILABLE}

@app.get("/api/alerts")
def get_alerts():
    with LOGS_LOCK:
        logs = list(LIVE_LOGS)
    alerts = [l for l in logs if l["isThreat"]]
    return {"alerts": alerts[-20:]}

@app.get("/api/heatmap")
def get_heatmap():
    heatmap = defaultdict(int)
    with LOGS_LOCK:
        logs = list(LIVE_LOGS)
    for log in logs:
        if log["isThreat"]:
            key = f"{log['dayOfWeek']}-{log['hour']}"
            heatmap[key] += 1
    # Also generate extra historical data
    for i in range(300):
        log = generate_one_log()
        offset_days = random.randint(0, 6)
        offset_hours = random.randint(0, 23)
        dow = (datetime.datetime.utcnow().weekday() - offset_days) % 7
        if log["isThreat"]:
            key = f"{dow}-{offset_hours}"
            heatmap[key] += 1
    result = []
    days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    for d in range(7):
        for h in range(24):
            result.append({
                "day":      days[d],
                "dayIndex": d,
                "hour":     h,
                "count":    heatmap.get(f"{d}-{h}", 0)
            })
    return {"heatmap": result}

@app.get("/api/anomalies")
def get_anomalies():
    with LOGS_LOCK:
        logs = list(LIVE_LOGS)
    if len(logs) < 10:
        logs = [generate_one_log() for _ in range(50)]
    logs = run_ml(logs)
    anomalies = [l for l in logs if l.get("anomaly")]
    return {
        "anomalies":     anomalies,
        "total_scanned": len(logs),
        "ml_enabled":    ML_AVAILABLE
    }

@app.get("/api/export/csv")
def export_csv():
    with LOGS_LOCK:
        logs = list(LIVE_LOGS)
    output = io.StringIO()
    fields = ["id","timestamp","severity","category","sourceIp","destIp",
              "hostname","user","message","protocol","port","bytes","country","mitre"]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for log in logs:
        writer.writerow({k: log.get(k,"") for k in fields})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=soc_report.csv"}
    )

@app.post("/api/telegram/test")
def test_telegram():
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return {"status": "error", "message": "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env"}
    send_telegram("✅ *SOC Log Analyzer* — Telegram connected!\n_Niha130_")
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)