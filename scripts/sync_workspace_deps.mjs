#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = resolve(ROOT_DIR, 'config.json');

function log(message) {
  console.log(`[sync_workspace_deps] ${message}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT_DIR,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.status !== 0) {
    const details = options.capture ? `\n${result.stderr || result.stdout}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${details}`);
  }

  return (result.stdout ?? '').trim();
}

function loadConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

function ensureCleanWorktree(projectId, projectPath) {
  const status = run('git', ['status', '--porcelain'], { cwd: projectPath, capture: true });
  if (status) {
    throw new Error(
      `Workspace dependency ${projectId} has local changes. Commit/stash them before syncing:\n${status}`,
    );
  }
}

function syncDependency(projectId, dependency) {
  const projectConfig = loadConfig().projects?.[projectId];
  if (!projectConfig?.root) {
    throw new Error(`Project ${projectId} must exist in config.projects with a root.`);
  }
  if (!dependency.repo || !dependency.commit) {
    throw new Error(`workspaceDependencies.${projectId} must declare repo and commit.`);
  }

  const isEnhancement = projectConfig.type === 'enhancement';
  const projectPath = isEnhancement
    ? resolve(ROOT_DIR, 'enhancement', projectConfig.root.replace(/^\.[\\/]/, ''))
    : resolve(ROOT_DIR, projectConfig.root);
  if (!existsSync(projectPath)) {
    log(`Cloning ${projectId} from ${dependency.repo}`);
    run('git', ['clone', dependency.repo,   projectPath]);
  } else {
    ensureCleanWorktree(projectId, projectPath);
  }

  run('git', ['remote', 'set-url', 'origin', dependency.repo], { cwd: projectPath });
  log(`Fetching ${projectId}`);
  run('git', ['fetch', '--tags', 'origin'], { cwd: projectPath });
  ensureCleanWorktree(projectId, projectPath);

  log(`Checking out ${projectId} at ${dependency.commit}`);
  run('git', ['checkout', '--detach', dependency.commit], { cwd: projectPath });
}

function main() {
  const config = loadConfig();
  const dependencies = config.workspaceDependencies ?? {};
  const entries = Object.entries(dependencies);

  if (entries.length === 0) {
    log('No workspace dependencies declared; nothing to sync');
    return;
  }

  for (const [projectId, dependency] of entries) {
    syncDependency(projectId, dependency);
  }

  log(`Synced ${entries.length} workspace dependencies`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
