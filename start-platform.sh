#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/platform/backend"
FRONTEND_DIR="$ROOT_DIR/platform/frontend"
BACKEND_VENV="$BACKEND_DIR/.venv-linux"
BACKEND_LOG_DIR="$BACKEND_DIR/.logs"
FRONTEND_LOG_DIR="$FRONTEND_DIR/.logs"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env.local"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
PLATFORM_HOST="${PLATFORM_HOST:-localhost}"
BACKEND_BIND_HOST="${BACKEND_BIND_HOST:-0.0.0.0}"
FRONTEND_BIND_HOST="${FRONTEND_BIND_HOST:-0.0.0.0}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-}"
API_BASE_URL="${API_BASE_URL:-}"
GOOGLE_REDIRECT_URI_OVERRIDE="${GOOGLE_REDIRECT_URI_OVERRIDE:-}"
CELERY_CONCURRENCY="${CELERY_CONCURRENCY:-1}"
BACKEND_AUTH_ENABLED="${BACKEND_AUTH_ENABLED:-false}"
BOOTSTRAP_ADMIN_EMAILS="${BOOTSTRAP_ADMIN_EMAILS:-admin@local}"
DEFAULT_NEW_USER_ROLE="${DEFAULT_NEW_USER_ROLE:-member}"
LOCAL_ADMIN_ENABLED="${LOCAL_ADMIN_ENABLED:-true}"
LOCAL_ADMIN_USERNAME="${LOCAL_ADMIN_USERNAME:-admin}"
LOCAL_ADMIN_PASSWORD="${LOCAL_ADMIN_PASSWORD:-admin}"
LOCAL_ADMIN_DISPLAY_NAME="${LOCAL_ADMIN_DISPLAY_NAME:-Administrator}"
LOCAL_COMPOSE_FILE="$ROOT_DIR/compose/local-infra/core.compose.yml"

CELERY_PID=""
UVICORN_PID=""
FRONTEND_PID=""
TAIL_PID=""
MONITOR_PID=""

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage: bash start-platform.sh [options]

Options:
  --host <host>                    Public host/IP for browser access, e.g. 172.23.77.80
  --backend-port <port>            Backend port, default: 8000
  --frontend-port <port>           Frontend port, default: 5173
  --backend-bind-host <host>       Backend bind host, default: 0.0.0.0
  --frontend-bind-host <host>      Frontend bind host, default: 0.0.0.0
  --frontend-base-url <url>        Frontend public URL override
  --api-base-url <url>             Frontend API base URL override
  --google-redirect-uri <url>      Backend Google redirect URI override
  -h, --help                       Show this help
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --host)
        PLATFORM_HOST="$2"
        shift 2
        ;;
      --backend-port)
        BACKEND_PORT="$2"
        shift 2
        ;;
      --frontend-port)
        FRONTEND_PORT="$2"
        shift 2
        ;;
      --backend-bind-host)
        BACKEND_BIND_HOST="$2"
        shift 2
        ;;
      --frontend-bind-host)
        FRONTEND_BIND_HOST="$2"
        shift 2
        ;;
      --frontend-base-url)
        FRONTEND_BASE_URL="$2"
        shift 2
        ;;
      --api-base-url)
        API_BASE_URL="$2"
        shift 2
        ;;
      --google-redirect-uri)
        GOOGLE_REDIRECT_URI_OVERRIDE="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        fail "Unknown option: $1"
        ;;
    esac
  done
}

ensure_runtime_urls() {
  FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://${PLATFORM_HOST}:${FRONTEND_PORT}}"
  API_BASE_URL="${API_BASE_URL:-http://${PLATFORM_HOST}:${BACKEND_PORT}}"
  GOOGLE_REDIRECT_URI_OVERRIDE="${GOOGLE_REDIRECT_URI_OVERRIDE:-${API_BASE_URL}/api/v1/auth/google/callback}"
}

require_dir() {
  local path="$1"
  [[ -d "$path" ]] || fail "Required directory not found: $path"
}

ensure_supported_shell_os() {
  case "$(uname -s)" in
    Linux|Darwin) ;;
    *) fail "start-platform.sh only supports Linux/macOS shells. Use start-platform.ps1 on Windows." ;;
  esac
}

ensure_ready() {
  [[ -x "$BACKEND_VENV/bin/python" ]] || fail "Linux backend environment is missing. Run: bash setup-platform.sh"
  [[ -d "$FRONTEND_DIR/node_modules" ]] || fail "Frontend dependencies are missing. Run: bash setup-platform.sh"
}

read_env_value() {
  local file="$1"
  local key="$2"
  local line value

  [[ -f "$file" ]] || return 1

  line=$(grep -E "^[[:space:]]*${key}=" "$file" | head -n 1 || true)
  [[ -n "$line" ]] || return 1

  value="${line#*=}"
  value="${value%%#*}"
  value="$(printf '%s' "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  if [[ "$value" =~ ^\".*\"$ ]] || [[ "$value" =~ ^\'.*\'$ ]]; then
    value="${value:1:-1}"
  fi

  printf '%s' "$value"
}

is_placeholder_value() {
  local value="${1:-}"

  [[ -z "$value" ]] && return 0

  case "$value" in
    *"<"*">"*)
      return 0
      ;;
  esac

  return 1
}

upsert_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp_file

  tmp_file=$(mktemp)
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    $0 ~ "^[[:space:]]*" key "=" {
      if (!updated) {
        print key "=" value
        updated = 1
      }
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$file" > "$tmp_file"
  mv "$tmp_file" "$file"
}

ensure_frontend_env() {
  local frontend_api_base_url

  if [[ ! -f "$FRONTEND_ENV_FILE" ]]; then
    log "Creating $FRONTEND_ENV_FILE"
    cat > "$FRONTEND_ENV_FILE" <<EOF
VITE_API_BASE_URL=$API_BASE_URL
VITE_DEMO_MODE=false
EOF
  fi

  frontend_api_base_url="$(read_env_value "$FRONTEND_ENV_FILE" "VITE_API_BASE_URL" || true)"

  if is_placeholder_value "$frontend_api_base_url"; then
    upsert_env_value "$FRONTEND_ENV_FILE" "VITE_API_BASE_URL" "$API_BASE_URL"
    log "Set default VITE_API_BASE_URL=$API_BASE_URL"
  fi

  upsert_env_value "$FRONTEND_ENV_FILE" "VITE_API_BASE_URL" "$API_BASE_URL"
}

ensure_backend_env_urls() {
  [[ -f "$BACKEND_ENV_FILE" ]] || return 0
  upsert_env_value "$BACKEND_ENV_FILE" "FRONTEND_BASE_URL" "$FRONTEND_BASE_URL"
  upsert_env_value "$BACKEND_ENV_FILE" "GOOGLE_REDIRECT_URI" "$GOOGLE_REDIRECT_URI_OVERRIDE"
}

ensure_docker_compose() {
  command -v docker >/dev/null 2>&1 || fail "Docker is required to start RabbitMQ/Redis/MinIO locally. Install Docker first."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local label="$3"
  local timeout_seconds="${4:-30}"
  local start_epoch now_epoch
  start_epoch=$(date +%s)

  while true; do
    if (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1; then
      return 0
    fi
    now_epoch=$(date +%s)
    if (( now_epoch - start_epoch >= timeout_seconds )); then
      fail "Timed out waiting for ${label} at ${host}:${port}. Check Docker compose logs for compose/local-infra/rabbitmq-redis.compose.yml"
    fi
    sleep 1
  done
}

start_local_infra() {
  ensure_docker_compose
  log "Starting local RabbitMQ/Redis via docker compose"
  (
    cd "$BACKEND_DIR"
    docker compose -f "$LOCAL_COMPOSE_FILE" up -d
  )
  wait_for_port 127.0.0.1 25672 RabbitMQ 45
  wait_for_port 127.0.0.1 26379 Redis 45
  wait_for_port 127.0.0.1 29000 MinIO 45
}

cleanup() {
  local exit_code=$?
  trap - INT TERM EXIT
  log "Stopping started services"

  for pid in "$TAIL_PID" "$MONITOR_PID" "$FRONTEND_PID" "$UVICORN_PID" "$CELERY_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done

  wait || true
  exit "$exit_code"
}

monitor_services() {
  while true; do
    if [[ -n "$CELERY_PID" ]] && ! kill -0 "$CELERY_PID" >/dev/null 2>&1; then
      echo "Celery worker exited unexpectedly. Check $BACKEND_LOG_DIR/celery.log" >&2
      [[ -n "$TAIL_PID" ]] && kill "$TAIL_PID" >/dev/null 2>&1 || true
      return 1
    fi
    if [[ -n "$UVICORN_PID" ]] && ! kill -0 "$UVICORN_PID" >/dev/null 2>&1; then
      echo "FastAPI backend exited unexpectedly. Check $BACKEND_LOG_DIR/uvicorn.log" >&2
      [[ -n "$TAIL_PID" ]] && kill "$TAIL_PID" >/dev/null 2>&1 || true
      return 1
    fi
    if [[ -n "$FRONTEND_PID" ]] && ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
      echo "Vite frontend exited unexpectedly. Check $FRONTEND_LOG_DIR/vite.log" >&2
      [[ -n "$TAIL_PID" ]] && kill "$TAIL_PID" >/dev/null 2>&1 || true
      return 1
    fi
    sleep 2
  done
}

start_services() {
  mkdir -p "$BACKEND_LOG_DIR" "$FRONTEND_LOG_DIR"
  : > "$BACKEND_LOG_DIR/celery.log"
  : > "$BACKEND_LOG_DIR/uvicorn.log"
  : > "$FRONTEND_LOG_DIR/vite.log"

  log "Starting Celery worker"
  (
    cd "$BACKEND_DIR"
    export PYTHONPATH="$BACKEND_DIR"
    export PATH="$BACKEND_VENV/bin:$PATH"
    export BACKEND_AUTH_ENABLED="$BACKEND_AUTH_ENABLED"
    export BOOTSTRAP_ADMIN_EMAILS="$BOOTSTRAP_ADMIN_EMAILS"
    export DEFAULT_NEW_USER_ROLE="$DEFAULT_NEW_USER_ROLE"
    export LOCAL_ADMIN_ENABLED="$LOCAL_ADMIN_ENABLED"
    export LOCAL_ADMIN_USERNAME="$LOCAL_ADMIN_USERNAME"
    export LOCAL_ADMIN_PASSWORD="$LOCAL_ADMIN_PASSWORD"
    export LOCAL_ADMIN_DISPLAY_NAME="$LOCAL_ADMIN_DISPLAY_NAME"
    export RABBITMQ_URL="${RABBITMQ_URL:-amqp://guest:guest@127.0.0.1:25672//}"
    export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:26379/0}"
    export STORAGE_PROVIDER="${STORAGE_PROVIDER:-minio}"
    export MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:29000}"
    export MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-comic2video_minio}"
    export MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-comic2video_minio_secret}"
    export MINIO_BUCKET="${MINIO_BUCKET:-comic2video}"
    celery -A app.celery_app worker --loglevel=info --concurrency="$CELERY_CONCURRENCY"
  ) >"$BACKEND_LOG_DIR/celery.log" 2>&1 &
  CELERY_PID=$!

  log "Starting FastAPI backend on port $BACKEND_PORT"
  (
    cd "$BACKEND_DIR"
    export PYTHONPATH="$BACKEND_DIR"
    export PATH="$BACKEND_VENV/bin:$PATH"
    export BACKEND_AUTH_ENABLED="$BACKEND_AUTH_ENABLED"
    export BOOTSTRAP_ADMIN_EMAILS="$BOOTSTRAP_ADMIN_EMAILS"
    export DEFAULT_NEW_USER_ROLE="$DEFAULT_NEW_USER_ROLE"
    export LOCAL_ADMIN_ENABLED="$LOCAL_ADMIN_ENABLED"
    export LOCAL_ADMIN_USERNAME="$LOCAL_ADMIN_USERNAME"
    export LOCAL_ADMIN_PASSWORD="$LOCAL_ADMIN_PASSWORD"
    export LOCAL_ADMIN_DISPLAY_NAME="$LOCAL_ADMIN_DISPLAY_NAME"
    export RABBITMQ_URL="${RABBITMQ_URL:-amqp://guest:guest@127.0.0.1:25672//}"
    export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:26379/0}"
    export STORAGE_PROVIDER="${STORAGE_PROVIDER:-minio}"
    export MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:29000}"
    export MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-comic2video_minio}"
    export MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-comic2video_minio_secret}"
    export MINIO_BUCKET="${MINIO_BUCKET:-comic2video}"
    uvicorn app.main:app --host "$BACKEND_BIND_HOST" --port "$BACKEND_PORT" --reload
  ) >"$BACKEND_LOG_DIR/uvicorn.log" 2>&1 &
  UVICORN_PID=$!

  log "Starting Vite frontend on port $FRONTEND_PORT"
  (
    cd "$FRONTEND_DIR"
    npm run dev -- --host "$FRONTEND_BIND_HOST" --port "$FRONTEND_PORT"
  ) >"$FRONTEND_LOG_DIR/vite.log" 2>&1 &
  FRONTEND_PID=$!

  log "Platform started"
  echo "Frontend: $FRONTEND_BASE_URL"
  echo "Backend : $API_BASE_URL"
  echo "Logs    : $BACKEND_LOG_DIR and $FRONTEND_LOG_DIR"
  echo "Press Ctrl+C to stop all services"

  monitor_services &
  MONITOR_PID=$!

  tail -n 0 -F \
    "$BACKEND_LOG_DIR/celery.log" \
    "$BACKEND_LOG_DIR/uvicorn.log" \
    "$FRONTEND_LOG_DIR/vite.log" &
  TAIL_PID=$!

  wait "$TAIL_PID"
}

main() {
  parse_args "$@"
  ensure_runtime_urls
  require_dir "$BACKEND_DIR"
  require_dir "$FRONTEND_DIR"
  ensure_supported_shell_os
  ensure_ready
  ensure_frontend_env
  ensure_backend_env_urls
  start_local_infra
  trap cleanup INT TERM EXIT
  start_services
}

main "$@"
