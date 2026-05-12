# Platform Startup

## Linux/macOS flow

### 1. Prepare the environment

```bash
bash setup-platform.sh
```

This script:

- checks `python3`, `python3-venv`, and `npm`
- creates `platform/backend/.venv-linux`
- installs backend Python dependencies
- installs frontend npm dependencies
- creates `platform/backend/.env` from `.env.example` if needed

### 2. Start the platform

```bash
bash start-platform.sh
```

This script only starts services. If setup has not been completed, it tells you to run `bash setup-platform.sh` first.

## Windows flow

Use:

```powershell
.\start-platform.ps1
```

The PowerShell script uses its own backend virtual environment:

- `platform/backend/.venv-win`

## Services started

- Celery worker
- FastAPI backend on `http://localhost:8000`
- Vite frontend on `http://localhost:5173`

## Logs

- logs are streamed live to the terminal while the script is running
- backend logs are also written to `platform/backend/.logs`
- frontend logs are also written to `platform/frontend/.logs`


## Frontend env

Before starting the frontend, create `platform/frontend/.env.local` from `platform/frontend/.env.example` and fill in your Supabase values if you want login enabled.

See `docs/frontend-env.md` for details.

