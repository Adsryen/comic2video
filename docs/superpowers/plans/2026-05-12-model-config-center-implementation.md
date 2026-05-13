# Model Config Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-pass backend model configuration center with global provider persistence, admin APIs, and system status integration.

**Architecture:** Add two SQLAlchemy models for provider and system settings, route them through focused service helpers, and expose a small admin router. Keep runtime compatibility by resolving defaults from the database first and environment fallbacks second.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, SQLite, React

---

### Task 1: Add provider persistence

**Files:**
- Modify: `platform/backend/app/db/models.py`
- Create: `platform/backend/app/schemas/model_config.py`
- Create: `platform/backend/app/services/model_config_service.py`
- Test: `platform/backend/tests/test_model_config_api.py`

- [ ] **Step 1: Write failing tests for listing and creating providers**
- [ ] **Step 2: Run targeted tests and confirm failure**
- [ ] **Step 3: Add models, schemas, and service helpers**
- [ ] **Step 4: Re-run tests and confirm pass**

### Task 2: Add admin router

**Files:**
- Create: `platform/backend/app/routers/admin_model_configs.py`
- Modify: `platform/backend/app/main.py`
- Test: `platform/backend/tests/test_model_config_api.py`

- [ ] **Step 1: Extend tests for update, default, and test-connectivity routes**
- [ ] **Step 2: Run targeted tests and confirm failure**
- [ ] **Step 3: Implement router and wire it into FastAPI**
- [ ] **Step 4: Re-run tests and confirm pass**

### Task 3: Upgrade system status endpoint

**Files:**
- Modify: `platform/backend/app/routers/system.py`
- Modify: `platform/backend/tests/test_jobs_api.py`
- Modify: `platform/backend/app/services/model_config_service.py`

- [ ] **Step 1: Extend system status test to assert active provider data**
- [ ] **Step 2: Run targeted tests and confirm failure**
- [ ] **Step 3: Add provider resolution with env fallback to system endpoint**
- [ ] **Step 4: Re-run targeted tests and confirm pass**

### Task 4: Show active providers in the project UI

**Files:**
- Modify: `platform/frontend/src/components/platform/SystemStatusCard.jsx`
- Modify: `platform/frontend/src/components/platform/platformText.js`

- [ ] **Step 1: Render active provider metadata beneath OCR, script, and TTS states**
- [ ] **Step 2: Keep existing layout intact while surfacing the active defaults**
