---
name: enable-1m-context
description: Enable or repair a 1M token context window for Codex Desktop/CLI by safely patching the local Codex model catalog and config. Use when a user asks to raise Codex context length, change 258k/272k context to 1M/1000K, fix the status bar still showing 258k, package or apply the local 1M context workaround, or restore the backed-up Codex context configuration.
---

# Enable 1M Context

## Core Behavior

Treat this as a local Codex configuration workflow, not as a guaranteed model entitlement change. Installing the skill alone does not change context length; the user must invoke the skill and approve edits to their Codex config directory.

Use `scripts/enable_1m_context.cjs` for the deterministic path. The script:

- Locates Codex home from `CODEX_HOME`, then the default user `.codex` directory.
- Backs up `config.toml` and `models_cache.json`.
- Creates `models_1m.json` with the selected model set to a 1,000,000 token context window.
- Adds or updates `model_context_window` and `model_catalog_json` in `config.toml`.
- Restores from backups or resets the selected model to the default-like 258k display when requested.
- Prints verification details and restart instructions.

## Workflow

1. Inspect the user's current Codex model and config if available.
2. Warn that the change is local, experimental, and may depend on the user's Codex version, account, and model availability.
3. Run the script from this skill folder, requesting filesystem approval when Codex home is outside the workspace.
4. Ask the user to fully quit and reopen Codex Desktop, then create a new conversation.
5. Verify by checking the newest session log for `model_context_window: 1000000` or by asking the user to inspect the status bar.

## Commands

Run with defaults:

```bash
node scripts/enable_1m_context.cjs
```

Target a specific model:

```bash
node scripts/enable_1m_context.cjs --model gpt-5.5
```

Use a specific Codex home:

```bash
node scripts/enable_1m_context.cjs --codex-home "C:/Users/USER/.codex"
```

Preview without writing:

```bash
node scripts/enable_1m_context.cjs --dry-run
```

Restore the latest backup:

```bash
node scripts/enable_1m_context.cjs --restore-latest
```

Force the selected model back to the 258k-style default if backups are unavailable or the user wants to undo the workaround:

```bash
node scripts/enable_1m_context.cjs --reset-258k
```

## Verification

After the user restarts Codex and opens a new conversation, inspect the newest session log under `.codex/sessions` and search for `model_context_window`. Success looks like:

```text
model_context_window: 1000000
```

If the UI still shows `258k`, check whether the user is viewing an old conversation. Existing conversations may keep their original context window; new conversations should use the new value.

## Rollback

Prefer `--restore-latest` because it restores the exact `config.toml` and `models_cache.json` that existed before the script changed anything.

Use `--reset-258k` when no backup is available or the user explicitly wants the visible status bar to return to the old 258k-style window. This mode removes `model_context_window` and `model_catalog_json` from `config.toml`, sets the selected model catalog entry to `context_window = 272000`, `max_context_window = 272000`, and `effective_context_window_percent = 95`, then asks the user to restart Codex and open a new conversation.

## Safety Notes

- Do not delete existing Codex files.
- Do not edit `auth.json`.
- Always keep backups.
- Use `--restore-latest` for exact rollback; use `--reset-258k` as a fallback.
- If `models_cache.json` is missing, tell the user to open Codex once so the model catalog is created.
- If the server rejects long-context requests despite the UI showing 1M, explain that account/model entitlement may be the limiting factor.
