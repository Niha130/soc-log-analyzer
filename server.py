#!/usr/bin/env python3
"""
SOC Log Analyzer & Threat Alert System — Enhanced Backend v2.0
Features: Telegram alerts, ML anomaly detection, heatmap, CSV export
Author: Niha130
"""

import os, random, datetime, hashlib, time, threading, requests
import numpy as np
from collections import defaultdict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv

try:
    from sklearn.ensemble import IsolationForest
    ML_AVAILABLE = True
    print("[SOC] ML loaded OK")
except ImportError:
    ML_AVAILABLE = False
    print("[WARN] Run: pip install scikit-learn numpy")

load_dotenv()

app = FastAPI(title="SOC Log Analyzer API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

TELEGRAM_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

HOSTS      = ["dc-01","db-server-02","api-gateway-01","linux-dev-04","web-server-03","firewall-01","endpoint-05"]
USERS      = ["admin","john.doe","svc-account","SYSTEM","jane.smith","root","guest"]
SOURCE_IPS = ["192.168.1.10","10.0.0.5","172.16.0.3","45.33.32.156","185.220.101.45","103.21.244.0","192.168.50.22"]
DEST_IPS   = ["192.168.1.1","8.8.8.8","10.0.0.1","172.217.14.206","151.101.1.140"]
COUNTRIES  = ["Local","Russia","China","USA","Germany","Netherlands","Local","Local"]

EVENTS = [
    {"severity":"CRITICAL","category":"MALWARE",   "message":"Ransomware execution detected in user directory",       "mitre":"T1059"},
    {"severity":"CRITICAL","category":"INTRUSION", "message":"Brute force attack - 500 failed login attempts",        "mitre":"T1110"},
    {"severity":"CRITICAL","category":"DATA_EXFIL","message":"Large data transfer to external IP detected",           "mitre":"T1041"},
    {"severity":"HIGH",    "category":"AUTH",      "message":"Privileged account login from unusual location",        "mitre":"T1078"},
    {"severity":"HIGH",    "category":"MALWARE",   "message":"Known malware hash matched in process list",            "mitre":"T1059"},
    {"severity":"HIGH",    "category":"NETWORK",   "message":"Port scan detected from external IP",                  "mitre":"T1046"},
    {"severity":"HIGH",    "category":"AUTH",      "message":"Multiple failed SSH login attempts detected",           "mitre":"T1110"},
    {"severity":"MEDIUM",  "category":"POLICY",    "message":"Unauthorized software installation attempt",            "mitre":"T1072"},
    {"severity":"MEDIUM",  "category":"NETWORK",   "message":"DNS query to known malicious domain blocked",           "mitre":"T1071"},
    {"severity":"MEDIUM",  "category":"AUTH",      "message":"User account locked after failed attempts",             "mitre":"T1110"},
    {"severity":"MEDIUM",  "category":"SYSTEM",    "message":"Critical system file modification detected",            "mitre":"T1565"},
    {"severity":"LOW",     "category":"SYSTEM",    "message":"System configuration change detected",                 "mitre":"T1562"},
    {"severity":"LOW",     "category":"AUTH",      "message":"Successful user login recorded",                       "mitre":"T1078"},
    {"severity":"LOW",     "category":"NETWORK",   "message":"Firewall rule triggered for outbound traffic",         "mitre":"T1562"},
    {"severity":"LOW",     "category":"POLICY",    "message":"USB device connected to endpoint",                     "mitre":"T1052"},
    {"severity":"INFO",    "category":"SYSTEM",    "message":"Scheduled backup completed successfully",              "mitre":""},
]

_ml_features = []
_sent_ids    = set()
_ml_model    = None
_ml_lock     = threading.Lock()

def send_telegram(message):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            data={"chat_id": TELEGRAM_CHAT_ID, "text": message},
            timeout=5,
        )
    except Exception as e:
        print(f"[WARN] Telegram: {e}")

def notify_telegram(log):
    if log["id"] in _sent_ids:
        return
    _sent_ids.add(log["id"])
    label = "CRITICAL ALERT" if log["severity"] == "CRITICAL" else "HIGH ALERT"
    msg = "\n".join([
        f"SOC {label}",
        "------------------------------",
        f"Event    : {log['message']}",
        f"Host     : {log['hostname']}",
        f"Source IP: {log['sourceIp']}",
        f"User     : {log['user']}",
        f"Category : {log['category']}",
        f"MITRE    : {log.get('mitre','N/A')}",
        f"Time     : {log['timestamp']}",
        "------------------------------",
        "SOC Log Analyzer by Niha130",
    ])
    threading.Thread(target=send_telegram, args=(msg,), daemon=True).start()

SEV_MAP = {"INFO":0,"LOW":1,"MEDIUM":2,"HIGH":3,"CRITICAL":4}
CAT_MAP = {"SYSTEM":0,"AUTH":1,"NETWORK":2,"MALWARE":3,"INTRUSION":4,"DATA_EXFIL":5,"POLICY":6}

def encode_log(log):
    try:
        hour = int(log["timestamp"].split(" ")[3].split(":")[0])
    except:
        hour = 0
    is_ext = 0 if log["sourceIp"].startswith(("192.168","10.","172.16")) else 1
    return [SEV_MAP.get(log["severity"],0), CAT_MAP.get(log["category"],0), hour, log.get("port",80), is_ext]

def train_model():
    global _ml_model
    if not ML_AVAILABLE or len(_ml_features) < 20:
        return
    with _ml_lock:
        X = np.array(_ml_features)
        model = IsolationForest(contamination=0.1, random_state=42, n_estimators=50)
        model.fit(X)
        _ml_model = model
        print(f"[SOC] ML retrained on {len(_ml_features)} samples")

def detect_anomaly(log):
    if not ML_AVAILABLE or _ml_model is None:
        return {"isAnomaly": False, "anomalyScore": 0.0, "mlStatus": "training"}
    with _ml_lock:
        feat  = np.array([encode_log(log)])
        pred  = _ml_model.predict(feat)[0]
        score = float(_ml_model.decision_function(feat)[0])
        norm  = round(max(0.0, min(100.0, (1 - score) * 50)), 1)
        return {"isAnomaly": bool(pred == -1), "anomalyScore": norm, "mlStatus": "active"}

def make_log(index=0):
    event  = random.choice(EVENTS)
    now    = datetime.datetime.utcnow() - datetime.timedelta(seconds=random.randint(0, 3600))
    log_id = hashlib.md5(f"{index}{time.time()}{random.random()}".encode()).hexdigest()[:12]
    log = {
        "id":        log_id,
        "timestamp": now.strftime("%a %b %d %H:%M:%S %Y"),
        "hour":      now.hour,
        "severity":  event["severity"],
        "category":  event["category"],
        "sourceIp":  random.choice(SOURCE_IPS),
        "destIp":    random.choice(DEST_IPS),
        "hostname":  random.choice(HOSTS),
        "user":      random.choice(USERS),
        "message":   event["message"],
        "rawLog":    f"[{event['category']}] {event['message']}",
        "protocol":  random.choice(["TCP","UDP","HTTP","HTTPS","SSH","DNS"]),
        "port":      random.choice([22,80,443,3389,53,8080,445]),
        "bytes":     random.randint(100, 99999),
        "country":   random.choice(COUNTRIES),
        "isThreat":  event["severity"] in ["CRITICAL","HIGH"],
        "mitre":     event.get("mitre",""),
    }
    _ml_features.append(encode_log(log))
    if len(_ml_features) % 50 == 0:
        threading.Thread(target=train_model, daemon=True).start()
    log["ml"] = detect_anomaly(log)
    if log["isThreat"]:
        notify_telegram(log)
    return log

@app.get("/")
def root():
    return {"status": "SOC Log Analyzer API v2.0", "author": "Niha130"}

@app.get("/api/logs")
def get_logs():
    logs = sorted([make_log(i) for i in range(50)], key=lambda x: x["timestamp"], reverse=True)
    return {"logs": logs, "total": len(logs)}

@app.get("/api/alerts")
def get_alerts():
    logs = [make_log(i) for i in range(50)]
    alerts = [l for l in logs if l["isThreat"]]
    return {"alerts": alerts[:20], "total": len(alerts)}

@app.get("/api/heatmap")
def get_heatmap():
    logs   = [make_log(i) for i in range(200)]
    counts = defaultdict(int)
    for l in logs:
        counts[l["hour"]] += 1
    data = [{"hour": h, "label": f"{h:02d}:00", "count": counts.get(h, 0)} for h in range(24)]
    return {"heatmap": data}

@app.get("/api/anomalies")
def get_anomalies():
    logs = [make_log(i) for i in range(100)]
    anomalies = [l for l in logs if l.get("ml", {}).get("isAnomaly", False)]
    return {"anomalies": anomalies, "total": len(anomalies), "mlStatus": "active" if _ml_model else "training", "trainedOn": len(_ml_features)}

@app.get("/api/export/csv")
def export_csv():
    logs = [make_log(i) for i in range(100)]
    header = "id,timestamp,severity,category,sourceIp,destIp,hostname,user,message,protocol,port,bytes,country,mitre\n"
    rows = "\n".join(
        f"{l['id']},{l['timestamp']},{l['severity']},{l['category']},"
        f"{l['sourceIp']},{l['destIp']},{l['hostname']},{l['user']},"
        f"\"{l['message']}\",{l['protocol']},{l['port']},{l['bytes']},"
        f"{l['country']},{l.get('mitre','')}"
        for l in logs
    )
    return Response(content=header + rows, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=soc_logs.csv"})

@app.get("/api/telegram/test")
def test_telegram():
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in .env"}
    send_telegram("SOC Alert System Connected!\nTelegram notifications working.\n-- SOC Log Analyzer by Niha130 --")
    return {"ok": True, "message": "Test message sent to Telegram"}
