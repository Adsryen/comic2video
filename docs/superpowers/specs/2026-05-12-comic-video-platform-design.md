# Comic-to-Video Platform Design

## Overview

This design defines a v1 platform for turning uploaded comic files (`pdf`, `cbz`) into narrated videos by evolving a copied application base under `platform/` from the existing `Manhwa-ai` reference project and integrating `Index-anisora` as an optional video generation engine.

The goal of v1 is not perfect architecture or perfect generation quality. The goal is to establish a practical, extensible production path that:

- accepts comic uploads
- creates reusable project and job records
- runs a multi-stage AI pipeline asynchronously
- outputs downloadable narrated videos
- leaves room for gradual replacement and optimization of models and services

## Guiding Strategy

### Primary Foundation

Use a clean copy of `Manhwa-ai` inside `platform/` as the v1 application foundation because it already provides:

- frontend upload and result interaction patterns
- a FastAPI backend
- asynchronous processing patterns
- PDF parsing and panel extraction references
- video-generation product flow concepts

### Video Generation Role

Use `Index-anisora` as a separate inference capability, not as the main application repository.

It should be integrated behind a video generation adapter/service boundary so the main platform can:

- run without AniSora in `basic` mode
- selectively use AniSora in `hybrid` mode
- later expand or replace video models without rewriting business workflows

### Delivery Philosophy

Build a usable single-product platform first, then incrementally refactor toward cleaner service boundaries.

The design must optimize for:

- fast initial delivery
- stable intermediate data structures
- resumable long-running jobs
- swappable model adapters

## Product Scope

### In Scope for v1

- upload `pdf` and `cbz` comic files
- create and manage projects
- create video generation jobs
- parse source files into pages and panels
- run OCR and visual analysis
- generate a structured storyboard
- generate narration and subtitles
- generate audio
- render a final video
- preview and download generated videos
- support multiple rendering modes

### Out of Scope for v1

- collaborative editing
- advanced timeline editing
- voice cloning
- fully automated soundtrack generation
- large-scale multi-tenant permissions
- long-series episode management
- comprehensive operations dashboards

## Architecture

The v1 platform is organized into five logical layers.

### 1. Frontend Layer

Responsibilities:

- project listing
- upload flows
- job creation forms
- job progress display
- video preview and download
- storyboard and asset inspection

Recommended initial approach:

- reuse the copied `platform/frontend` React structure derived from `Manhwa-ai`
- reorganize it around projects, jobs, and results instead of a single upload-first demo flow

### 2. API Layer

Responsibilities:

- expose project, job, asset, and result APIs
- validate input and job configuration
- create database records
- enqueue background tasks
- expose system and model health information

Recommended implementation:

- continue using FastAPI

### 3. Pipeline Orchestration Layer

Responsibilities:

- execute long-running jobs asynchronously
- split a generation task into resumable pipeline steps
- update step-level state
- support retries and partial reruns

Recommended implementation:

- continue using Celery for v1
- model job execution as a sequence of explicit steps instead of one monolithic worker body

### 4. Model and Rendering Layer

Responsibilities:

- OCR
- visual understanding
- script generation
- TTS generation
- video generation
- final ffmpeg composition

Recommended implementation:

- access each capability through a dedicated adapter or service boundary

### 5. Storage and Persistence Layer

Responsibilities:

- store source files
- store page and panel images
- store audio, clips, final videos, subtitles, and storyboard artifacts
- store projects, jobs, job steps, and intermediate metadata

Recommended implementation:

- PostgreSQL for metadata
- object storage compatible with S3 semantics, or local development storage for early testing

## Core Pipeline

Each generation job follows a staged pipeline.

### Step 1: Upload and Project Creation

- user uploads a `pdf` or `cbz`
- API creates a `project`
- original file is stored as a `source_file` asset
- project status becomes `UPLOADED`

### Step 2: Job Creation

- user starts a `generate_video` job for a project
- API creates a `job`
- configuration includes options such as:
  - render mode
  - target language
  - voice preset
  - subtitle enablement
  - optional animated ratio
- job status becomes `QUEUED`

### Step 3: Parsing

- worker fetches the source file
- if `pdf`, convert pages to images
- if `cbz`, extract and sort page images
- create page image assets
- detect and cut panels
- create panel image assets
- mark parse step completed

### Step 4: Analysis

- run OCR on page or panel images
- run visual analysis to extract scene context
- produce structured analysis such as:
  - OCR text
  - scene descriptions
  - character hints
  - importance scores
- mark analyze step completed

### Step 5: Storyboard Assembly

- combine parsed and analyzed outputs into a unified storyboard structure
- determine scene groupings, durations, and candidate render modes
- persist storyboard content
- mark storyboard step completed

### Step 6: Script Generation

- generate narration text
- generate subtitle text
- generate video prompts for animated scenes
- mark script step completed

### Step 7: Audio Generation

- generate TTS audio for each scene
- store audio assets
- update storyboard scene references
- mark TTS step completed

### Step 8: Clip Generation

- if mode is `basic`, render scenes from static images with camera motion
- if mode is `hybrid`, route only important scenes to AniSora and render the rest with basic motion
- if mode is `animated`, route a larger portion of scenes to AniSora
- store clip assets
- mark video step completed

### Step 9: Merge

- collect clips, audio, and subtitles
- compose the final video with ffmpeg
- store final video asset
- mark merge step completed

### Step 10: Completion

- update job status to `COMPLETED`
- update project status to `READY`
- expose final result to the frontend

## Rendering Modes

Three render modes are defined.

### `basic`

All scenes are rendered from still images using cinematic camera motion, transitions, and standard composition.

This is the default and required stable path for v1.

### `hybrid`

Important scenes are rendered through AniSora, while the rest use `basic` rendering.

This is the recommended first animation-enhanced mode.

### `animated`

A larger share of scenes use AniSora-based video generation.

This mode is optional in v1 and can be introduced after `basic` and `hybrid` are stable.

## Data Model

The initial database design uses six primary tables.

### `projects`

Purpose:

- represents one comic project

Suggested fields:

- `id`
- `name`
- `source_type`
- `source_asset_id`
- `status`
- `created_at`
- `updated_at`

### `assets`

Purpose:

- represents all stored files and generated artifacts

Suggested fields:

- `id`
- `project_id`
- `job_id` nullable
- `asset_type`
- `storage_path`
- `mime_type`
- `metadata_json`
- `created_at`

Recommended `asset_type` values:

- `source_file`
- `page_image`
- `panel_image`
- `audio`
- `clip`
- `final_video`
- `subtitle`
- `storyboard`

### `jobs`

Purpose:

- represents one generation request

Suggested fields:

- `id`
- `project_id`
- `job_type`
- `mode`
- `status`
- `progress`
- `error_message`
- `started_at`
- `finished_at`
- `created_at`

### `job_steps`

Purpose:

- records per-step execution state and makes long-running jobs resumable

Suggested fields:

- `id`
- `job_id`
- `step_name`
- `status`
- `input_json`
- `output_json`
- `error_message`
- `started_at`
- `finished_at`

Recommended `step_name` values:

- `parse`
- `analyze`
- `storyboard`
- `script`
- `tts`
- `video`
- `merge`

### `storyboards`

Purpose:

- stores structured storyboard output and versioned intermediate content

Suggested fields:

- `id`
- `project_id`
- `job_id`
- `version`
- `content_json`
- `created_at`

### `clips`

Purpose:

- stores scene-level rendering information

Suggested fields:

- `id`
- `job_id`
- `panel_asset_id`
- `audio_asset_id` nullable
- `clip_asset_id` nullable
- `clip_index`
- `render_mode`
- `duration`
- `status`
- `metadata_json`

## State Model

### Project Status

Recommended values:

- `UPLOADED`
- `PARSED`
- `ANALYZED`
- `READY`
- `FAILED`

### Job Status

Recommended values:

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

### Job Step Status

Recommended values:

- `PENDING`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `SKIPPED`

## Storyboard Contract

The storyboard is the most important reusable intermediate structure in the platform.

The storyboard schema must remain stable even when underlying OCR, vision, TTS, or video models change.

Recommended top-level structure:

- `pages`
- `panels`
- `scenes`

### `pages`

Each page includes:

- `page_index`
- `page_asset_id`
- `width`
- `height`

### `panels`

Each panel includes:

- `panel_id`
- `page_index`
- `panel_asset_id`
- `bbox`
- `ocr_text`
- `scene_description`
- `characters`
- `importance_score`

### `scenes`

Each scene includes:

- `scene_index`
- `panel_ids`
- `narration_text`
- `subtitle_text`
- `video_mode`
- `video_prompt`
- `duration`
- `audio_asset_id`
- `clip_asset_id`

## API Design

The initial API surface should stay compact and map directly to frontend pages and background job needs.

### Project APIs

- `POST /api/v1/projects`
  - create a project and upload a `pdf` or `cbz`
- `GET /api/v1/projects`
  - list projects
- `GET /api/v1/projects/{project_id}`
  - project detail
- `GET /api/v1/projects/{project_id}/assets`
  - list assets for a project

### Job APIs

- `POST /api/v1/projects/{project_id}/jobs`
  - create a generation job
- `GET /api/v1/jobs`
  - list jobs
- `GET /api/v1/jobs/{job_id}`
  - job detail
- `GET /api/v1/jobs/{job_id}/steps`
  - job step detail
- `POST /api/v1/jobs/{job_id}/retry`
  - retry a failed job or failed step sequence
- `POST /api/v1/jobs/{job_id}/cancel`
  - cancel a running job

### Result APIs

- `GET /api/v1/jobs/{job_id}/storyboard`
  - fetch storyboard output
- `GET /api/v1/jobs/{job_id}/clips`
  - fetch clip list
- `GET /api/v1/jobs/{job_id}/result`
  - fetch final video result

### System APIs

- `GET /api/v1/health`
- `GET /api/v1/models`
  - list available model backends and service health
- `GET /api/v1/storage/{asset_id}`
  - return a signed URL or proxy resource response

## Backend Refactor Plan

The current backend under `platform/backend` should be reorganized gradually, not rewritten all at once.

### Target Backend Structure

- `app/main.py`
- `app/config.py`
- `app/db/`
- `app/routers/`
- `app/schemas/`
- `app/services/`
- `app/adapters/`
- `app/workers/`
- `app/tasks/`
- `app/utils/`
- `tests/`

### Existing Files to Keep and Adapt

- `platform/backend/app/main.py`
- `platform/backend/app/config.py`
- `platform/backend/app/utils/pdf_utils.py`
- `platform/backend/app/utils/tts_utils.py`
- `platform/backend/app/utils/vision_utils.py`

### Existing Files to Refactor Heavily

- `platform/backend/app/worker.py`
  - split orchestration and step logic
- `platform/backend/app/utils/openai_utils.py`
  - replace with script and vision adapters
- `platform/backend/app/routers/generate_audio_story.py`
  - replace with project and job routers

## Frontend Refactor Plan

The current frontend should be preserved as a base and reorganized around platform entities.

### Target Frontend Structure

- `src/pages/ProjectsPage`
- `src/pages/ProjectDetailPage`
- `src/pages/JobDetailPage`
- `src/components/UploadForm`
- `src/components/JobStatusPanel`
- `src/components/VideoPreview`
- `src/components/StoryboardPreview`
- `src/components/AssetGallery`
- `src/api/`
- `src/types/`

### Frontend Responsibilities

- upload a comic file
- create jobs
- poll job progress
- preview generated videos
- inspect storyboard and intermediate assets

## Adapter Architecture

All model and backend dependencies should be accessed through adapters.

Required adapters:

- `OCRAdapter`
- `VisionAdapter`
- `ScriptAdapter`
- `TTSAdapter`
- `VideoAdapter`
- `StorageAdapter`

Each adapter should expose a consistent shape such as:

- `prepare()`
- `run()`
- `health_check()`

This boundary is required so the platform can replace third-party APIs with internal open-source models without changing pipeline orchestration.

## AniSora Integration Strategy

AniSora must remain isolated from the main business backend.

Recommended integration model:

- deploy AniSora as a separate video service
- provide a stable internal request contract
- return clip assets and generation metadata to the main platform

Suggested video generation request fields:

- `image_path`
- `prompt`
- `duration`
- `resolution`
- `seed`
- `mode`

Suggested response fields:

- `clip_asset_id`
- `duration`
- `metadata`

Initial video adapter implementations:

- `BasicVideoAdapter`
- `AniSoraVideoAdapter`

## Failure Recovery and Idempotency

Long-running jobs must be resumable.

Required rules:

- every pipeline stage writes structured step state
- completed steps should not rerun unless explicitly invalidated
- step inputs and outputs should be stored in `job_steps`
- retries may target the whole job or continue from the failed step
- intermediate assets should be preserved long enough for debugging and reruns

## Phase Roadmap

### Phase 1: Platform Skeleton

- reorganize backend structure
- add database tables
- standardize APIs
- reorganize frontend around projects and jobs

### Phase 2: Core Content Pipeline

- unify PDF and CBZ parsing
- generate storyboard outputs
- generate narration and subtitles
- produce stable `basic` mode videos

### Phase 3: Animation Enhancement

- integrate AniSora video service
- implement `hybrid` mode
- selectively animate important scenes

### Phase 4: Optimization

- retries and resumability improvements
- model health visibility
- caching of intermediate outputs
- multi-machine routing
- quality improvements

## Recommended First Implementation Goal

The first implementation target should be a stable v1 single-product platform based on the existing `Manhwa-ai` codebase that can:

- upload `pdf` and `cbz`
- create projects
- create jobs
- generate narrated videos through the `basic` path
- leave AniSora as an optional enhancement path

This goal is intentionally narrower than the eventual platform vision and is chosen to reduce delivery risk while preserving the right structural abstractions.

## Design Constraints

To keep the project tractable, the team should follow these constraints during v1:

- do not block the main product path on AniSora integration
- do not tightly couple pipeline logic to a single external model provider
- do not over-normalize early data structures beyond what job recovery and asset traceability require
- do not pursue perfect UI polish before the job pipeline is stable
- do prioritize stable storyboard schema, adapter boundaries, and state tracking from the start

## Final Recommendation

Use `Manhwa-ai` as the application base for speed, but refactor it toward a platform shape from the first phase.

Use `Index-anisora` as a separate, optional video generation engine behind a dedicated adapter or service boundary.

Treat the storyboard schema, asset model, job state model, and adapter interfaces as the long-term foundation of the platform.
