# Enable 1M Context

A Codex skill that helps raise the local Codex context-window metadata from the default 258k-style display to a 1M / 1000K context window.

English | [中文](README_ZH.md)

## What It Does

When invoked, this skill runs a bundled script that:

- backs up the user's `config.toml` and `models_cache.json`;
- creates a patched local model catalog at `models_1m.json`;
- adds `model_context_window = 1000000`;
- points `model_catalog_json` to the patched catalog;
- supports exact restore from backup;
- supports a fallback reset to the original 258k-style window.

This is a local Codex configuration workflow. It does not modify your account, subscription, API entitlement, or the upstream model service.

## Install with CC Switch

In CC Switch:

1. Open **Skills**.
2. Open **Repository Management**.
3. Click **Add Repository**.
4. Fill in:

```text
Owner: w1163222589-coder
Name: skills
Branch: main
Subdirectory: skills/.experimental
```

5. Refresh the skill list.
6. Install `enable-1m-context`.

## Manual Install

Copy this folder into your Codex skills directory:

```text
enable-1m-context  ->  ~/.codex/skills/enable-1m-context
```

On Windows, the target is usually:

```text
C:\Users\<USER>\.codex\skills\enable-1m-context
```

Restart Codex after installing the skill.

## Usage

In Codex, ask:

```text
Use $enable-1m-context to enable a 1M context window for Codex on this machine.
```

Codex should run:

```bash
node scripts/enable_1m_context.cjs
```

If your Codex home is not detected automatically:

```bash
node scripts/enable_1m_context.cjs --codex-home "C:/Users/USER/.codex"
```

Fully quit and reopen Codex Desktop, then create a new conversation.

## Verify

UI check:

- Open a new Codex conversation.
- Click the context/status circle.
- The total window should show about `1000K`.

Log check:

```powershell
Get-ChildItem "$env:USERPROFILE\.codex\sessions" -Recurse -Filter *.jsonl |
  Select-String -Pattern '"model_context_window":1000000' |
  Select-Object -Last 10 Path,LineNumber,Line
```

If the log shows `"model_context_window":1000000`, the Codex session was started with a 1M context window.

## Rollback

Restore the exact latest backup:

```bash
node scripts/enable_1m_context.cjs --restore-latest
```

Force reset to the old 258k-style window:

```bash
node scripts/enable_1m_context.cjs --reset-258k
```

After rollback, fully quit and reopen Codex Desktop, then create a new conversation.

## Notes

- Existing conversations may keep their original context window. Test with a new conversation.
- If the server rejects very long prompts, your account/model entitlement may still be the limiting factor.
- The script does not edit `auth.json`.
- Backups are stored under `.codex/backups/enable-1m-context/`.
