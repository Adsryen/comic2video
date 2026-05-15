# Platform Workflow Phase 1 Plan

## Objective

Lay the technical foundation for resumable and rerunnable workflow execution without breaking the current product flow.

This phase does **not** attempt to finish the whole platformization effort.
It focuses on making execution run-aware.

---

## Phase 1 Scope

### In scope

- introduce `job_runs`
- introduce `job_step_runs`
- create an initial run when a job is created
- adapt backend execution entry from job-based to run-based
- record step execution history into `job_step_runs`
- preserve current `jobs` / `job_steps` behavior for compatibility
- expose read APIs for run and step-run state

### Out of scope

- resumability UI
- rerun UI
- artifact history UI
- latest/history switching
- full persisted input reconstruction for every step

---

## Deliverables

1. new ORM models for:
   - `JobRun`
   - `JobStepRun`
2. startup schema compatibility for both tables
3. new schemas for run responses
4. create initial run when creating job
5. backend runner switched to `run_job_run(job_run_id)`
6. APIs:
   - `GET /api/v1/jobs/{job_id}/runs`
   - `GET /api/v1/job-runs/{run_id}`
   - `GET /api/v1/job-runs/{run_id}/steps`
7. existing job endpoints continue to work

---

## Data Model Proposal

## `job_runs`

Fields:

- `id`
- `job_id`
- `run_type`
- `status`
- `triggered_by_user_id`
- `source_run_id`
- `resume_from_step_name`
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

## `job_step_runs`

Fields:

- `id`
- `job_run_id`
- `job_id`
- `step_name`
- `attempt_no`
- `status`
- `input_json`
- `output_json`
- `error_message`
- `reused_from_step_run_id`
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

---

## Backend Work Breakdown

## Task 1 — Add DB Models

Files:

- `platform/backend/app/db/models.py`
- `platform/backend/app/main.py`

Work:

- add `JobRun`
- add `JobStepRun`
- add compatibility DDL in startup migration helper

Acceptance:

- server boots on existing DB
- missing tables are created automatically

## Task 2 — Add Schemas

Files:

- `platform/backend/app/schemas/job.py`
  - or a new dedicated schema file if cleaner

Work:

- add response models for run and step-run entities

Acceptance:

- routes can serialize runs and step runs cleanly

## Task 3 — Create Initial Run on Job Creation

Files:

- `platform/backend/app/routers/jobs.py`

Work:

- after creating `job`, create one `job_run`
- create one `job_step_run` for each pipeline step
- still create current `job_steps` for compatibility
- invoke run-aware execution entry

Acceptance:

- creating a job creates both legacy `job_steps` and run-aware records

## Task 4 — Introduce Run-Aware Runner

Files:

- `platform/backend/app/workers/pipeline_worker.py`
- `platform/backend/app/workers/step_runner.py`

Work:

- add `run_job_run(job_run_id)`
- move current `run_job_pipeline(job_id)` to delegate into run-aware flow, or keep as compatibility wrapper
- write execution state into `job_runs` and `job_step_runs`
- keep updating `jobs` and `job_steps` for compatibility

Acceptance:

- current pipeline still completes
- run history is captured separately

## Task 5 — Add Read APIs

Files:

- `platform/backend/app/routers/jobs.py`

Work:

- `GET /api/v1/jobs/{job_id}/runs`
- `GET /api/v1/job-runs/{run_id}`
- `GET /api/v1/job-runs/{run_id}/steps`

Acceptance:

- frontend or curl can inspect run history and step history

---

## Compatibility Strategy

During Phase 1:

- `jobs.status` remains authoritative for current pages
- `job_steps` remain populated for current job detail pages
- new run tables are additive
- no frontend migration is required immediately

This reduces risk and keeps rollout manageable.

---

## Risks

1. duplicated state between `job_steps` and `job_step_runs`
   - acceptable in phase 1 for compatibility
2. current runner still depends on in-memory context
   - accepted for phase 1, fixed in phase 2
3. asset linkage still points to job rather than run/step-run
   - accepted for phase 1, versioning planned in phase 3

---

## Validation Checklist

- create a job successfully
- confirm one `job_run` is created
- confirm seven `job_step_runs` are created
- confirm pipeline completes as before
- confirm run status transitions are correct
- confirm step-run statuses mirror actual execution
- confirm existing job endpoints still return expected results

---

## Stop/Resume Note

If work pauses midway, resume in this order:

1. finish DB models and startup compatibility
2. finish create-job run creation
3. wire runner to run-aware records
4. expose read APIs

Do **not** start frontend changes before Phase 1 backend persistence is stable.

## 2026-05-15 资产版本化进展

- `assets` 已扩展到运行级归属：`job_run_id`、`job_step_run_id`、`step_name`
- 新增资产版本语义：`version`、`is_latest`
- 流水线步骤产物改为按运行写入，前端运行视图只展示所选运行的资产
- 当前仍保留 `storyboards` 旧表写入，后续可继续收敛到统一产物视图
