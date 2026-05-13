# Model Config Center Design

## Scope

First version adds a global-only model configuration center for the backend. It does not support per-project or per-job overrides.

## Goals

- Persist default providers in the database
- Keep `.env` as fallback when DB config is missing
- Expose admin APIs to list, create, update, set default, and test providers
- Extend `/api/v1/models` to show active provider configuration as well as runtime availability

## Data Model

### model_providers
- `id`: uuid string primary key
- `provider_type`: one of `ocr`, `script`, `tts`, `video`
- `provider_key`: stable key like `provider_a`, `openai_compatible`, `tts_local`
- `display_name`: human-readable label
- `base_url`: optional remote endpoint
- `model_name`: optional model name
- `is_enabled`: boolean
- `is_default`: boolean
- `config_json`: optional JSON blob for provider-specific parameters
- `created_at`
- `updated_at`

### system_settings
- `id`: uuid string primary key
- `setting_key`: unique key
- `setting_value`: string
- `value_type`: `string`, `number`, `boolean`, `json`
- `updated_at`

## Runtime Resolution Order

For each provider type:
1. database default enabled provider
2. `.env` fallback values
3. hard-coded legacy runtime details

## Admin API

- `GET /api/v1/admin/model-providers`
- `POST /api/v1/admin/model-providers`
- `PATCH /api/v1/admin/model-providers/{provider_id}`
- `POST /api/v1/admin/model-providers/{provider_id}/set-default`
- `POST /api/v1/admin/model-providers/{provider_id}/test`
- `GET /api/v1/admin/system-settings`

## First UI Slice

The first frontend slice does not add a full admin panel. It only upgrades the existing project system status card to show which provider is currently active for OCR, script, and TTS.

## Test Strategy

- router tests for create/list/update/default/test behavior
- system models endpoint test updated to include active provider information
- keep existing project/job flow green
