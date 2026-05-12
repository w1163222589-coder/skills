#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);

function readFlag(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.log(`Usage:
  node scripts/enable_1m_context.cjs [--model MODEL] [--window 1000000] [--codex-home PATH] [--dry-run]
  node scripts/enable_1m_context.cjs --restore-latest [--codex-home PATH]
  node scripts/enable_1m_context.cjs --reset-258k [--model MODEL] [--codex-home PATH] [--dry-run]`);
}

if (hasFlag("--help") || hasFlag("-h")) {
  usage();
  process.exit(0);
}

const dryRun = hasFlag("--dry-run");
const restoreLatest = hasFlag("--restore-latest");
const reset258k = hasFlag("--reset-258k");
const targetWindow = Number(readFlag("--window") || "1000000");
if (!Number.isInteger(targetWindow) || targetWindow < 272000) {
  console.error("ERROR: --window must be an integer >= 272000.");
  process.exit(1);
}

function defaultCodexHome() {
  if (process.env.CODEX_HOME) return process.env.CODEX_HOME;
  return path.join(os.homedir(), ".codex");
}

const codexHome = path.resolve(readFlag("--codex-home") || defaultCodexHome());
const configPath = path.join(codexHome, "config.toml");
const cachePath = path.join(codexHome, "models_cache.json");
const customCatalogPath = path.join(codexHome, "models_1m.json");
const backupDir = path.join(codexHome, "backups", "enable-1m-context");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: ${label} not found: ${filePath}`);
    process.exit(1);
  }
}

function backupFile(filePath, label, stamp) {
  if (!fs.existsSync(filePath)) return null;
  const destination = path.join(backupDir, `${path.basename(filePath)}.${stamp}.bak`);
  if (!dryRun) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(filePath, destination);
  }
  return { label, source: filePath, destination };
}

function parseConfiguredModel(configText) {
  const match = configText.match(/^\s*model\s*=\s*["']([^"']+)["']/m);
  return match ? match[1] : null;
}

function tomlPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function upsertTopLevelTomlLine(lines, key, valueLine, afterKey) {
  const keyPattern = new RegExp(`^\\s*${key}\\s*=`);
  const existingIndex = lines.findIndex((line) => keyPattern.test(line));
  if (existingIndex >= 0) {
    lines[existingIndex] = valueLine;
    return;
  }

  const afterPattern = afterKey ? new RegExp(`^\\s*${afterKey}\\s*=`) : null;
  const afterIndex = afterPattern ? lines.findIndex((line) => afterPattern.test(line)) : -1;
  if (afterIndex >= 0) {
    lines.splice(afterIndex + 1, 0, valueLine);
  } else {
    lines.unshift(valueLine);
  }
}

function removeTopLevelTomlLine(lines, key) {
  const keyPattern = new RegExp(`^\\s*${key}\\s*=`);
  return lines.filter((line) => !keyPattern.test(line));
}

function latestBackupPair() {
  if (!fs.existsSync(backupDir)) return null;
  const files = fs.readdirSync(backupDir);
  const configBackups = files
    .filter((name) => name.startsWith("config.toml.") && name.endsWith(".bak"))
    .sort()
    .reverse();
  if (configBackups.length === 0) return null;
  const stamp = configBackups[0].slice("config.toml.".length, -".bak".length);
  return {
    stamp,
    config: path.join(backupDir, `config.toml.${stamp}.bak`),
    cache: path.join(backupDir, `models_cache.json.${stamp}.bak`),
  };
}

if (restoreLatest) {
  const backup = latestBackupPair();
  if (!backup) {
    console.error(`ERROR: No backups found in ${backupDir}`);
    process.exit(1);
  }
  console.log(`Restoring backup: ${backup.stamp}`);
  if (!dryRun) {
    fs.copyFileSync(backup.config, configPath);
    if (fs.existsSync(backup.cache)) fs.copyFileSync(backup.cache, cachePath);
  }
  console.log(dryRun ? "Dry run complete. No files changed." : "Restore complete. Restart Codex.");
  process.exit(0);
}

ensureFile(configPath, "Codex config.toml");
ensureFile(cachePath, "Codex models_cache.json");

const configText = fs.readFileSync(configPath, "utf8");
const configuredModel = parseConfiguredModel(configText);
const targetModel = readFlag("--model") || configuredModel || "gpt-5.5";
const catalog = JSON.parse(fs.readFileSync(cachePath, "utf8"));
const model = (catalog.models || []).find((entry) => (entry.slug || entry.model) === targetModel);

if (!model) {
  const available = (catalog.models || []).map((entry) => entry.slug || entry.model).filter(Boolean).join(", ");
  console.error(`ERROR: Model "${targetModel}" not found in models_cache.json.`);
  console.error(`Available models: ${available}`);
  process.exit(1);
}

const stamp = timestamp();
const backups = [backupFile(configPath, "config", stamp), backupFile(cachePath, "model catalog", stamp)].filter(Boolean);

if (reset258k) {
  model.context_window = 272000;
  model.max_context_window = 272000;
  model.effective_context_window_percent = 95;

  let resetLines = configText.split(/\r?\n/);
  resetLines = removeTopLevelTomlLine(resetLines, "model_context_window");
  resetLines = removeTopLevelTomlLine(resetLines, "model_catalog_json");

  if (!dryRun) {
    fs.writeFileSync(cachePath, `${JSON.stringify(catalog, null, 2)}\n`);
    fs.writeFileSync(configPath, resetLines.join("\n"));
  }

  console.log(`Codex home: ${codexHome}`);
  console.log(`Target model: ${targetModel}`);
  console.log("Reset context metadata to 272000 with 95% effective window, shown as about 258k.");
  for (const backup of backups) {
    console.log(`Backup ${backup.label}: ${backup.destination}`);
  }
  console.log(dryRun ? "Dry run complete. No files changed." : "Reset complete. Fully quit and reopen Codex, then create a new conversation.");
  process.exit(0);
}

model.context_window = targetWindow;
model.max_context_window = targetWindow;
model.effective_context_window_percent = 100;

let configLines = configText.split(/\r?\n/);
upsertTopLevelTomlLine(configLines, "model_context_window", `model_context_window = ${targetWindow}`, "model");
upsertTopLevelTomlLine(configLines, "model_catalog_json", `model_catalog_json = '${tomlPath(customCatalogPath)}'`, "model_context_window");

if (!dryRun) {
  fs.writeFileSync(customCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(cachePath, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(configPath, configLines.join("\n"));
}

console.log(`Codex home: ${codexHome}`);
console.log(`Target model: ${targetModel}`);
console.log(`Context window: ${targetWindow}`);
console.log(`Custom catalog: ${customCatalogPath}`);
for (const backup of backups) {
  console.log(`Backup ${backup.label}: ${backup.destination}`);
}
console.log(dryRun ? "Dry run complete. No files changed." : "Done. Fully quit and reopen Codex, then create a new conversation.");
