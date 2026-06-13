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

_telegram_sent_ids = set()

def generate_log(index=0, hours_ago=0):
    event  = random.choice(EVENTS)
    host   = random.choice(HOSTS)
    src    = random.choice(SOURCE_IPS)
    now    = datetime.datetime.utcnow() - datetime.timedelta(
                 hours=hours_ago, seconds=random.randint(0, 3599))
    log_id = hashlib.md5(f"{index}{time.time()}{random.random()}".encode()).hexdigest()[:12]
    return {
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
    if log["id"] in _telegram_sent_ids:
        return
    if log["severity"] not in ["CRITICAL","HIGH"]:
        return
    _telegram_sent_ids.add(log["id"])
    emoji = "🔴" if log["severity"] == "CRITICAL" else "🟠"
    msg = (
        f"{emoji} *SOC ALERT — {log['severity']}*\n"
        f"📋 *Event:* {log['message']}\n"
        f"🖥 *Host:* `{log['hostname']}`\n"
        f"🌐 *IP:* `{log['sourceIp']}`\n"
        f"👤 *User:* `{log['user']}`\n"
        f"🔍 *MITRE:* `{log.get('mitre','—')}`\n"
        f"🕐 *Time:* {log['timestamp']} UTC"
    )
    threading.Thread(target=send_telegram, args=(msg,), daemon=True).start()

def run_ml(logs: list) -> list:
    if not ML_AVAILABLE or len(logs) < 10:
        return logs
    try:
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

# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "SOC Log Analyzer API v2.0", "author": "Niha130", "ml": ML_AVAILABLE}

@app.get("/api/logs")
def get_logs():
    logs = [generate_log(i) for i in range(50)]
    logs = run_ml(logs)
    for log in logs:
        maybe_telegram(log)
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"logs": logs, "total": len(logs), "ml_enabled": ML_AVAILABLE}

@app.get("/api/alerts")
def get_alerts():
    logs = [generate_log(i) for i in range(50)]
    alerts = [l for l in logs if l["isThreat"]]
    return {"alerts": alerts[:20]}

@app.get("/api/heatmap")
def get_heatmap():
    heatmap = defaultdict(int)
    for i in range(500):
        log = generate_log(i, hours_ago=random.randint(0, 167))
        if log["isThreat"]:
            key = f"{log['dayOfWeek']}-{log['hour']}"
            heatmap[key] += 1
    result = []
    days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    for d in range(7):
        for h in range(24):
            result.append({
                "day": days[d], "dayIndex": d,
                "hour": h, "count": heatmap.get(f"{d}-{h}", 0)
            })
    return {"heatmap": result}

@app.get("/api/anomalies")
def get_anomalies():
    logs = [generate_log(i) for i in range(100)]
    logs = run_ml(logs)
    anomalies = [l for l in logs if l.get("anomaly")]
    return {
        "anomalies":     anomalies,
        "total_scanned": len(logs),
        "ml_enabled":    ML_AVAILABLE
    }

@app.get("/api/export/csv")
def export_csv():
    logs = [generate_log(i) for i in range(100)]
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
    send_telegram("✅ *SOC Log Analyzer* — Telegram connected!")
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)