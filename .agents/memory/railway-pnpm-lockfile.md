---
name: Railway pnpm compatibility
description: The Railway builder can use a different pnpm major version than the Replit workspace.
---

When Railway reports `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` during `pnpm install --frozen-lockfile`, regenerate and validate `pnpm-lock.yaml` with the pnpm version shown in the Railway build log, not only the workspace's default pnpm.

**Why:** pnpm 9 and pnpm 10 can serialize workspace settings and lockfile metadata differently, so a lockfile that is valid locally may still be rejected by Railway.

**How to apply:** Read the builder version from the log, run that version with `--lockfile-only` and then `--frozen-lockfile`, commit only the lockfile change, and trigger a new deployment.