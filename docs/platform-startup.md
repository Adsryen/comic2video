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

This script now auto-starts local RabbitMQ and Redis from `compose/local-infra/rabbitmq-redis.compose.yml` before starting Celery, FastAPI, and Vite.

If setup has not been completed, it tells you to run `bash setup-platform.sh` first.

### 2.5. Local infrastructure dependencies

The startup script uses this compose file automatically:

- `compose/local-infra/rabbitmq-redis.compose.yml`

It brings up:

- RabbitMQ on `5672`
- RabbitMQ management UI on `15672`
- Redis on `6379`

## Windows flow

Use:

```powershell
.\start-platform.ps1
```

The PowerShell script uses its own backend virtual environment:

- `platform/backend/.venv-win`

It also auto-starts local RabbitMQ and Redis via `compose/local-infra/rabbitmq-redis.compose.yml`.

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

## Login checklist

If the page opens but login still fails, check these items in order:

1. Backend auth is enabled:

```bash
BACKEND_AUTH_ENABLED=true
```

2. Your backend admin bootstrap email includes your login email:

```bash
BOOTSTRAP_ADMIN_EMAILS=your-email@example.com
```

3. Backend Supabase env values are filled in `platform/backend/.env`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `SUPABASE_KEY`

4. Frontend Supabase env values are filled in `platform/frontend/.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL=http://localhost:8000`

5. After changing any env file, restart `start-platform.sh` or `start-platform.ps1`.

If `BACKEND_AUTH_ENABLED=false`, the backend runs in local bypass mode and frontend Supabase login will not be the primary auth path.
