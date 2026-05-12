#!/bin/bash

# Start Celery Worker in background (&)
celery -A app.celery_app worker --loglevel=info --concurrency=1 &

# Start FastAPI Server in foreground
uvicorn app.main:app --host 0.0.0.0 --port 7860