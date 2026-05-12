import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# 1. Get Secrets
# Ensure RABBITMQ_URL and REDIS_URL are set in your Hugging Face Secrets
BROKER_URL = os.getenv("RABBITMQ_URL")
BACKEND_URL = os.getenv("REDIS_URL")

# 2. Initialize Celery
celery_app = Celery(
    "manhwa_worker",
    broker=BROKER_URL,
    backend=BACKEND_URL,
    include=["app.worker"]
)

# 3. Optimization Settings
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,            # Keep results for 1 hour
    worker_prefetch_multiplier=1,   # Process 1 task at a time (Heavy AI work)
    task_acks_late=True,
    broker_connection_retry_on_startup=True
)