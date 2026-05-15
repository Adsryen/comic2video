# Platform Workflow Platformization Plan

## Goal

Upgrade the current one-shot pipeline into a platform workflow system that supports:

- per-step persistence
- resumable execution from failed stages
- controlled rerun from any stage
- artifact history and latest-version selection
- full frontend observability for every stage

This document is intentionally written as an execution guide, not just a concept note, so work can continue across multiple days without losing context.

---

## 1. Current State

The current backend already has useful primitives:

- `jobs`
- `job_steps`
- `assets`
- `storyboards`

The current pipeline is created in `platform/backend/app/routers/jobs.py` with fixed steps:

- `parse`
- `analyze`
- `storyboard`
- `script`
- `tts`
- `video`
- `merge`

Execution is handled by `platform/backend/app/workers/pipeline_worker.py`.

Each step currently:

- runs sequentially
- writes an `output_json`
- persists some assets
- updates job progress

### Current Limitations

1. Execution is effectively single-run and linear.
2. Step context is partially in-memory during a run.
3. Failed jobs cannot safely resume from the middle.
4. Successful steps are not explicitly reusable as step-level inputs for later runs.
5. Rerun semantics are not defined.
6. Asset history/versioning is not formalized.
7. Frontend can inspect some outputs, but not as a true step workspace.

---

## 2. Product Requirements

The platform should guarantee:

1. every stage stores its data and artifacts
2. any failed stage can resume without replaying all successful upstream stages
3. any successful stage can be rerun with confirmation
4. reruns do not destroy historical outputs
5. frontend can display each stage's status, outputs, and artifacts
6. users can see what was produced at each stage and when

---

## 3. Design Principles

1. **Persist everything needed for recovery**
   - no execution step should depend on transient in-memory context alone
2. **Never overwrite the only copy of a successful artifact**
   - reruns create new versions
3. **Separate job definition from execution instance**
   - a job can have multiple runs
4. **Frontend should reflect execution truth from backend state**
   - not reconstruct assumptions client-side
5. **Add compatibility first, then migrate gradually**
   - avoid a big-bang rewrite

---

## 4. Target Architecture

### 4.1 Core Concepts

#### Job
A task definition attached to a project.

#### JobRun
One execution instance of a job.

Examples:

- initial execution
- resume after failure
- rerun from step
- full rerun

#### JobStepRun
One execution record for a specific step inside a specific run.

#### Asset Version
A materialized output attached to a step run.

---

## 5. Data Model Changes

## 5.1 New Table: `job_runs`

Suggested fields:

- `id`
- `job_id`
- `run_type` (`initial`, `resume`, `rerun`, `rerun_from_step`)
- `status` (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`)
- `triggered_by_user_id`
- `source_run_id` (nullable, for resume/rerun lineage)
- `resume_from_step_name` (nullable)
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

Purpose:

- preserve execution history
- distinguish first run vs resumed run vs rerun
- support later audit and UI history

## 5.2 New Table: `job_step_runs`

Suggested fields:

- `id`
- `job_run_id`
- `job_id`
- `step_name`
- `attempt_no`
- `status`
- `input_json`
- `output_json`
- `error_message`
- `reused_from_step_run_id` (nullable)
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

Purpose:

- every step execution has an immutable history row
- reused steps are explicit, not implicit
- reruns and resumes become queryable

## 5.3 Extend `assets`

Suggested additions:

- `job_run_id`
- `job_step_run_id`
- `step_name`
- `version`
- `is_latest`
- `label`
- `preview_type`

Purpose:

- preserve all historical outputs
- allow frontend to fetch latest or version history
- associate artifacts with exact execution attempts

## 5.4 Keep Existing `job_steps` Temporarily

The current `job_steps` table can remain during transition.

Short-term role:

- backward compatibility
- lightweight summary for current UI

Long-term role:

- optional denormalized job-level step snapshot
- or deprecate after frontend migrates to `job_step_runs`

---

## 6. Execution Semantics

## 6.1 Normal Run

When creating a job:

1. create job
2. create job run with `run_type=initial`
3. create step runs for all pipeline steps
4. execute in dependency order

## 6.2 Resume Run

When a job fails:

1. frontend shows failed step
2. user chooses `continue from failed step`
3. backend creates a new `job_run` with `run_type=resume`
4. successful upstream step outputs are reused
5. failed step and downstream steps execute again

## 6.3 Step Rerun

When a user reruns a successful step:

1. frontend asks for confirmation
2. backend creates a new `job_run` with `run_type=rerun_from_step`
3. upstream successful steps are reused
4. selected step and downstream steps are re-executed, depending on chosen scope

## 6.4 Full Rerun

When user requests full rerun:

1. create a new `job_run`
2. execute all steps again
3. previous run remains intact

---

## 7. Recovery Model

### Required Rule

No step should rely exclusively on in-memory `context` from a single process run.

### Current Problem

`pipeline_worker.run_job_pipeline(job_id)` builds a transient `context` dict.

This means:

- recovery depends on rerunning previous steps in the same process chain
- later resumability is structurally weak

### Target Rule

Each step must reconstruct its required inputs from persisted upstream outputs.

Example:

- `analyze` reads latest successful `parse` output for the same run or reused source
- `storyboard` reads latest successful `parse`/`analyze` outputs
- `script` reads persisted storyboard/parse summaries
- `tts` reads persisted script output
- `video` reads persisted storyboard/audio assets
- `merge` reads persisted intermediate video outputs

This is the single most important architectural shift.

---

## 8. Artifact Versioning Strategy

### Rule

Reruns create new asset versions instead of destructive overwrite.

### On new output

- insert new asset row
- assign `version = previous_version + 1`
- mark previous latest rows for same `(job, step_name, asset_type)` as `is_latest=false`
- mark new row `is_latest=true`

### Benefits

- safe rollback
- historical inspection
- comparison across reruns
- no accidental data loss

---

## 9. Confirmation UX Rules

## 9.1 Resume Failed Step

Prompt:

- reuse successful upstream steps
- rerun failed step and downstream steps
- keep existing historical outputs

## 9.2 Rerun This Step Only

Prompt:

- create a new version for this step’s artifacts
- keep prior versions
- downstream steps are not automatically updated

## 9.3 Rerun From This Step Forward

Prompt:

- reuse upstream steps
- rerun selected step and all downstream steps
- latest visible outputs will switch to the new run’s outputs

## 9.4 Full Rerun

Prompt:

- start a full new execution instance
- keep all previous run history
- latest visible outputs will switch to the newest successful run

---

## 10. Frontend Workflow Workspace

The frontend should evolve from simple job panels to a true workflow workspace.

## 10.1 Job Workspace Structure

Sections:

- job summary
- run history
- current run timeline
- step cards
- artifact viewer
- action panel

## 10.2 Step Card Requirements

Each step card should show:

- step name
- current status
- last run time
- latest output summary
- artifact count
- latest artifact previews
- latest error if failed
- actions:
  - view details
  - view artifacts
  - continue from here
  - rerun step
  - rerun from here

## 10.3 Artifact Preview Rules

- JSON outputs: structured preview
- images: gallery preview
- audio: player
- video: embedded player
- storyboard: scene/cards preview
- plain text/script: text panel

## 10.4 Run History

Need a switcher for:

- latest run
- previous runs
- rerun history
- resumed runs

---

## 11. API Plan

## 11.1 Run APIs

- `GET /api/v1/jobs/{job_id}/runs`
- `GET /api/v1/job-runs/{run_id}`
- `GET /api/v1/job-runs/{run_id}/steps`

## 11.2 Step Control APIs

- `POST /api/v1/jobs/{job_id}/resume`
- `POST /api/v1/jobs/{job_id}/rerun`
- `POST /api/v1/job-runs/{run_id}/steps/{step_name}/rerun`
- `POST /api/v1/job-runs/{run_id}/steps/{step_name}/rerun-downstream`

## 11.3 Artifact APIs

- `GET /api/v1/job-runs/{run_id}/assets`
- `GET /api/v1/job-runs/{run_id}/steps/{step_name}/assets`
- `GET /api/v1/job-runs/{run_id}/steps/{step_name}/history`

## 11.4 Existing Job APIs That Can Stay

Current endpoints can remain during transition:

- `GET /api/v1/jobs/{job_id}`
- `GET /api/v1/jobs/{job_id}/steps`
- `GET /api/v1/jobs/{job_id}/assets`
- `GET /api/v1/jobs/{job_id}/storyboard`
- `GET /api/v1/jobs/{job_id}/result`

These can later read from latest successful run.

---

## 12. Backend Refactor Strategy

## 12.1 Current Runner

Current code:

- `run_job_pipeline(job_id)`
- sequential over `job_steps`
- transient `context`

## 12.2 Target Runner

Introduce:

- `run_job_run(job_run_id)`

Responsibilities:

- resolve execution order
- load persisted upstream inputs
- execute step handlers
- write step-run output
- write asset versions
- update run status

## 12.3 Step Handlers

Each step handler should:

1. load inputs from DB/storage
2. execute business logic
3. emit structured output
4. emit zero or more assets
5. never depend on process-local state only

---

## 13. Recommended Migration Phases

## Phase 1 — Execution Foundations

### Goal
Introduce run-aware execution without changing user-facing workflow too much.

### Tasks

- add `job_runs`
- add `job_step_runs`
- add transition-safe ORM models and schemas
- create `run_job_run(job_run_id)`
- create job run when a job is created
- mirror current execution into run-based records
- keep old `job_steps` updated as job summary state

### Acceptance

- creating a job creates one `job_run`
- each current pipeline step has a corresponding `job_step_run`
- final outputs still work as before

## Phase 2 — Persisted Step Input/Output Recovery

### Goal
Eliminate dependency on transient in-memory context.

### Tasks

- define persisted input loaders for each step
- refactor step execution to rebuild context from persisted outputs
- standardize output payloads per step
- ensure step reruns can reconstruct prerequisites

### Acceptance

- pipeline can resume from persisted outputs
- no required upstream step state exists only in memory

## Phase 3 — Asset Versioning

### Goal
Keep every successful output and support latest/history semantics.

### Tasks

- extend assets with run/step/version/latest fields
- mark latest on new successful asset creation
- add APIs for step artifact history

### Acceptance

- rerunning a step does not delete previous outputs
- frontend can access current latest and historical versions

## Phase 4 — Resume and Rerun Controls

### Goal
Make execution controllable from the middle.

### Tasks

- add resume API
- add rerun-step API
- add rerun-downstream API
- add confirmation policies
- implement upstream result reuse

### Acceptance

- failed jobs can continue without full replay
- successful steps can rerun safely with preserved history

## Phase 5 — Frontend Workflow Workspace

### Goal
Expose run, step, and artifact visibility clearly.

### Tasks

- add run history panel
- add step cards with per-step actions
- add artifact previews by type
- add latest/history switching
- add error details and rerun prompts

### Acceptance

- a user can inspect every stage in frontend
- a user can continue or rerun from the UI
- step outputs and artifacts are visible without backend log inspection

---

## 14. Recommended First Execution Plan

This is the next concrete work package after this document.

### Plan A — Foundation Sprint

1. add ORM + migration-safe schema for `job_runs`
2. add ORM + migration-safe schema for `job_step_runs`
3. create run records on job creation
4. wire current pipeline into run-aware execution
5. expose `GET /jobs/{job_id}/runs`
6. expose `GET /job-runs/{run_id}/steps`

### Plan B — Recovery Sprint

1. define per-step persisted input contract
2. refactor step execution to load persisted inputs
3. remove hard dependency on runtime `context`
4. add resume API

### Plan C — UX Sprint

1. redesign job detail as workflow workspace
2. add per-step artifact panels
3. add rerun/continue actions with confirmation

---

## 15. Open Questions

These should be answered before Phase 2/3 implementation decisions are finalized.

1. Should rerunning a step automatically invalidate downstream latest artifacts, or only after downstream rerun succeeds?
   - recommended: only switch latest when new downstream outputs succeed

2. Should run history be shown at project level, job level, or both?
   - recommended: job level first

3. Should users be allowed to pin an older artifact version as latest manually?
   - recommended: not in phase 1

4. Are some steps optional depending on mode?
   - if yes, step graph should become mode-aware in Phase 2

---

## 16. Recommended Immediate Next Step

Start with **Phase 1** only.

Why:

- smallest architecture upgrade with the biggest long-term payoff
- creates the scaffold for resume, rerun, and artifact history
- keeps current product behavior mostly stable while backend becomes run-aware

---

## 17. Handoff Summary

If work stops today, resume from this exact path:

1. implement `job_runs` and `job_step_runs`
2. adapt current `create_job` flow to create an initial run
3. replace `run_job_pipeline(job_id)` entry path with run-aware execution
4. keep existing APIs working by reading latest successful run or mirroring summary state into current tables

This is the minimum viable foundation required before resumability and rerun control can be implemented safely.
