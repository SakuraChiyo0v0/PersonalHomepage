@echo off
cd /d %~dp0
python init_db.py
python -m uvicorn main:app --host 0.0.0.0 --port 4200 --reload