#!/bin/bash
# SOC Log Analyzer — Git setup for Niha130
# Run this once inside the project folder

git init
git config user.name "Niha130"
git config user.email "your-email@example.com"   # change this to your GitHub email

git add .
git commit -m "feat: initial commit — SOC Log Analyzer & Threat Alert System

- Live dashboard with real-time event volume charts
- Log Analyzer with filterable live stream
- Alert System with triage workflow (Open → Investigating → Resolved)
- Threat Intelligence IOC feed
- Data Sources health monitor
- FastAPI Python backend with log ingestion + IOC check endpoints

Author: Niha130"

git remote add origin https://github.com/Niha130/soc-log-analyzer.git
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Visit: https://github.com/Niha130/soc-log-analyzer"
