#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/platform/backend"
FRONTEND_DIR="$ROOT_DIR/platform/frontend"
BACKEND_VENV="$BACKEND_DIR/.venv-linux"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
BACKEND_ENV_EXAMPLE="$BACKEND_DIR/.env.example"

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

ensure_supported_os() {
  case "$(uname -s)" in
    Linux|Darwin) ;;
    *) fail "setup-platform.sh only supports Linux/macOS shells." ;;
  esac
}

require_command() {
  local cmd="$1"
  local help="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "$cmd is required. $help"
  fi
}

python_major_minor() {
  python3 - <<'PY'
import sys
print(f"{sys.version_info.major}.{sys.version_info.minor}")
PY
}

check_python_venv_support() {
  local python_cmd="$1"
  if ! "$python_cmd" -m venv --help >/dev/null 2>&1; then
    cat >&2 <<MSG
Python venv support is missing.
On Debian/Ubuntu/WSL, install it with:
  sudo apt update
  sudo apt install -y python3-venv
Then rerun:
  bash setup-platform.sh
MSG
    exit 1
  fi
}

check_ensurepip_available() {
  if python3 - <<'PY' >/dev/null 2>&1
import ensurepip
PY
  then
    return 0
  fi

  local pyver
  pyver="$(python_major_minor)"

  cat >&2 <<MSG
Python can run, but its standard venv bootstrap component (ensurepip) is missing.
On Debian/Ubuntu/WSL, install the system package(s) first:
  sudo apt update
  sudo apt install -y python${pyver}-venv python3-pip

Then rerun:
  bash setup-platform.sh
MSG
  exit 1
}

ensure_backend_env() {
  if [[ ! -f "$BACKEND_ENV_FILE" && -f "$BACKEND_ENV_EXAMPLE" ]]; then
    log "Creating backend .env from .env.example"
    cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV_FILE"
  fi
}

venv_python_path() {
  echo "$BACKEND_VENV/bin/python"
}

venv_has_python() {
  [[ -x "$(venv_python_path)" ]]
}

venv_has_pip() {
  venv_has_python && "$(venv_python_path)" -m pip --version >/dev/null 2>&1
}

recreate_backend_venv() {
  local python_cmd="$1"
  if [[ -d "$BACKEND_VENV" ]]; then
    log "Removing incomplete Linux backend virtual environment at $BACKEND_VENV"
    rm -rf "$BACKEND_VENV"
  fi

  log "Creating Linux backend virtual environment at $BACKEND_VENV"
  "$python_cmd" -m venv "$BACKEND_VENV"
}

ensure_backend_venv() {
  local python_cmd="$1"

  if [[ ! -d "$BACKEND_VENV" ]]; then
    recreate_backend_venv "$python_cmd"
  elif ! venv_has_python || ! venv_has_pip; then
    log "Detected broken Linux backend virtual environment"
    recreate_backend_venv "$python_cmd"
  fi

  if ! venv_has_python; then
    fail "Linux backend virtual environment is incomplete: $(venv_python_path) not found"
  fi

  if ! venv_has_pip; then
    log "Attempting to bootstrap pip inside the Linux virtual environment"
    "$(venv_python_path)" -m ensurepip --upgrade >/dev/null 2>&1 || true
  fi

  if ! venv_has_pip; then
    cat >&2 <<MSG
The Linux virtual environment exists but pip is still unavailable.
On Debian/Ubuntu/WSL, install the missing system package(s) and rerun setup:
  sudo apt update
  sudo apt install -y python3-venv python3-pip

If you already installed them, remove the broken venv and rerun:
  rm -rf platform/backend/.venv-linux
  bash setup-platform.sh
MSG
    exit 1
  fi
}

install_backend_deps() {
  log "Installing backend dependencies"
  "$(venv_python_path)" -m pip install --upgrade pip
  "$(venv_python_path)" -m pip install -r "$BACKEND_DIR/requirements.txt"
}

install_frontend_deps() {
  log "Installing frontend dependencies"
  (cd "$FRONTEND_DIR" && npm install)
}

main() {
  ensure_supported_os
  require_dir "$BACKEND_DIR"
  require_dir "$FRONTEND_DIR"
  require_command python3 "Install Python 3 first."
  require_command npm "Install Node.js 18+ first."
  check_python_venv_support python3
  check_ensurepip_available
  ensure_backend_env
  ensure_backend_venv python3
  install_backend_deps
  install_frontend_deps

  log "Platform setup complete"
  echo "Backend venv: $BACKEND_VENV"
  echo "Next step: bash start-platform.sh"
}

main "$@"
