#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/platform/backend"
FRONTEND_DIR="$ROOT_DIR/platform/frontend"
BACKEND_VENV="$BACKEND_DIR/.venv-linux"
BACKEND_LOG_DIR="$BACKEND_DIR/.logs"
FRONTEND_LOG_DIR="$FRONTEND_DIR/.logs"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
CELERY_CONCURRENCY="${CELERY_CONCURRENCY:-1}"
BACKEND_AUTH_ENABLED="${BACKEND_AUTH_ENABLED:-false}"
BOOTSTRAP_ADMIN_EMAILS="${BOOTSTRAP_ADMIN_EMAILS:-1594959462@qq.com}"
DEFAULT_NEW_USER_ROLE="${DEFAULT_NEW_USER_ROLE:-member}"
LOCAL_COMPOSE_FILE="$ROOT_DIR/compose/local-infra/rabbitmq-redis.compose.yml"

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

ensure_docker_compose() {
  command -v docker >/dev/null 2>&1 || fail "Docker is required to start RabbitMQ/Redis locally. Install Docker first."
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
  wait_for_port 127.0.0.1 5672 RabbitMQ 45
  wait_for_port 127.0.0.1 6379 Redis 45
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
    uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload
  ) >"$BACKEND_LOG_DIR/uvicorn.log" 2>&1 &
  UVICORN_PID=$!

  log "Starting Vite frontend on port $FRONTEND_PORT"
  (
    cd "$FRONTEND_DIR"
    npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
  ) >"$FRONTEND_LOG_DIR/vite.log" 2>&1 &
  FRONTEND_PID=$!

  log "Platform started"
  echo "Frontend: http://localhost:$FRONTEND_PORT"
  echo "Backend : http://localhost:$BACKEND_PORT"
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
  require_dir "$BACKEND_DIR"
  require_dir "$FRONTEND_DIR"
  ensure_supported_shell_os
  ensure_ready
  start_local_infra
  trap cleanup INT TERM EXIT
  start_services
}

main "$@"
