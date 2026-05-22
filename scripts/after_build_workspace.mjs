#!/usr/bin/env node

import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { readFile, readdir, mkdir, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = resolve(ROOT_DIR, 'config.json');
const DIST_LOCAL_DIR = resolve(ROOT_DIR, 'dist', 'local');
const TEMP_DIR = resolve(ROOT_DIR, 'dist', '.enhancement_tmp');

function log(message) {
  console.log(`[after_build_workspace] ${message}`);
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(dir) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const child = join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.isFile()) {
        files.push(child);
      }
    }
  }
  await visit(dir);
  return files;
}

function parseMlsComment(line) {
  if (!line.includes('<mls')) return null;
  const frMatch = /fileReference="([^"]+)"/.exec(line);
  const enMatch = /enhancement="([^"]+)"/.exec(line);
  if (!frMatch || !enMatch) return null;
  return { fileReference: frMatch[1], enhancement: enMatch[1] };
}

function getProjectRoot(config, projectId) {
  const projectConfig = config.projects?.[projectId];
  const root = projectConfig?.root ?? `_${projectId}_`;
  if (projectConfig?.type === 'enhancement') {
    return resolve(ROOT_DIR, 'enhancement', root.replace(/^\.[\\/]/, ''));
  }
  if (!projectConfig) {
    const enhancementFallback = resolve(ROOT_DIR, 'enhancement', `_${projectId}_`);
    if (existsSync(enhancementFallback)) return enhancementFallback;
  }
  return resolve(ROOT_DIR, root);
}

// Resolve "_102030_/l2/file.ts" (or without extension) to an absolute filesystem path
function resolveVirtualPath(virtualPath, config) {
  const m = /^_(\d+)_\/(.+)$/.exec(virtualPath);
  if (!m) return null;
  const base = resolve(getProjectRoot(config, m[1]), m[2]);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  return candidates.find((c) => existsSync(c)) ?? base;
}

// esbuild plugin that resolves workspace virtual imports (/_NNNNN_/...) to source files
function createWorkspacePlugin(config) {
  function resolveCandidate(base) {
    const candidates = [base];
    if (extname(base) === '.js') {
      candidates.push(`${base.slice(0, -3)}.ts`);
      candidates.push(`${base.slice(0, -3)}.tsx`);
    }
    if (!extname(base)) {
      candidates.push(`${base}.ts`);
      candidates.push(`${base}.tsx`);
      candidates.push(join(base, 'index.ts'));
    }
    return candidates.find((c) => existsSync(c));
  }

  return {
    name: 'workspace-resolver',
    setup(api) {
      api.onResolve({ filter: /^\/_[0-9]+_\// }, (args) => {
        const m = /^\/_(\d+)_\/(.+)$/.exec(args.path);
        if (!m) return null;
        const resolved = resolveCandidate(resolve(getProjectRoot(config, m[1]), m[2]));
        return resolved ? { path: resolved } : null;
      });

      api.onResolve({ filter: /^\.\.?\// }, (args) => {
        const resolved = resolveCandidate(resolve(args.resolveDir, args.path));
        return resolved ? { path: resolved } : null;
      });
    },
  };
}

// Cache: enhancement virtual path -> loaded module exports (or null on failure)
const enhancementCache = new Map();

async function loadEnhancement(enhancementVirtualPath, config) {
  if (enhancementCache.has(enhancementVirtualPath)) {
    return enhancementCache.get(enhancementVirtualPath);
  }

  const tsPath = resolveVirtualPath(enhancementVirtualPath, config);
  if (!tsPath || !existsSync(tsPath)) {
    log(`Enhancement not found: ${enhancementVirtualPath}`);
    enhancementCache.set(enhancementVirtualPath, null);
    return null;
  }

  await mkdir(TEMP_DIR, { recursive: true });
  const tempOut = resolve(TEMP_DIR, `${Date.now()}_${Math.random().toString(36).slice(2)}.mjs`);

  try {
    await build({
      absWorkingDir: ROOT_DIR,
      entryPoints: [tsPath],
      outfile: tempOut,
      platform: 'node',
      format: 'esm',
      bundle: true,
      target: ['node18'],
      plugins: [createWorkspacePlugin(config)],
      logLevel: 'silent',
    });

    const mod = await import(pathToFileURL(tempOut).href);
    enhancementCache.set(enhancementVirtualPath, mod);
    log(`Enhancement built and loaded: ${enhancementVirtualPath}`);
    return mod;
  } catch (err) {
    log(`Failed to build enhancement ${enhancementVirtualPath}: ${err.message}`);
    enhancementCache.set(enhancementVirtualPath, null);
    return null;
  } finally {
    await unlink(tempOut).catch(() => undefined);
  }
}

async function processFile(jsFilePath, config) {
  const content = await readFile(jsFilePath, 'utf8');
  const firstNewline = content.indexOf('\n');
  const firstLine = firstNewline === -1 ? content : content.slice(0, firstNewline);

  const parsed = parseMlsComment(firstLine);
  if (!parsed) return;

  const { fileReference, enhancement } = parsed;
  if (enhancement === '_blank') return;

  const mod = await loadEnhancement(enhancement, config);
  if (!mod) return;

  if (typeof mod.onAfterCompileAction !== 'function') {
    log(`Enhancement ${enhancement} does not export onAfterCompileAction; skipping ${fileReference}`);
    return;
  }

  // Resolve the original .ts source from fileReference
  const tsPath = resolveVirtualPath(fileReference, config);
  const sourceTS = tsPath && existsSync(tsPath) ? await readFile(tsPath, 'utf8') : '';
  if (!sourceTS) {
    log(`Source TS not found for ${fileReference}`);
  }

  // Build optional css argument when a .less file exists alongside the source
  let css;
  if (tsPath) {
    const lessPath = `${tsPath.slice(0, -3)}.less`;
    if (existsSync(lessPath)) {
      const projectMatch = /^_(\d+)_\//.exec(fileReference);
      let sourceTokens = '';
      if (projectMatch) {
        const projectId = projectMatch[1];
        const dsCompiledPath = resolve(DIST_LOCAL_DIR, `_${projectId}_`, 'l2', 'designSystem.js');
        if (existsSync(dsCompiledPath)) {
          try {
            const dsModule = await import(pathToFileURL(dsCompiledPath).href);
            const tokensValue = dsModule.tokens ?? dsModule.default?.tokens ?? dsModule.default ?? dsModule;
            sourceTokens = JSON.stringify(tokensValue);
          } catch (err) {
            log(`Could not load compiled designSystem for project ${projectId}: ${err.message}`);
          }
        }
      }
      css = { sourceLess: await readFile(lessPath, 'utf8'), sourceTokens };
    }
  }

  let updatedJS;
  try {
    updatedJS = await mod.onAfterCompileAction(content, sourceTS, css);
  } catch (err) {
    log(`Error in onAfterCompileAction for ${fileReference}: ${err.message}`);
    return;
  }

  if (typeof updatedJS !== 'string') {
    log(`onAfterCompileAction for ${enhancement} did not return a string; skipping`);
    return;
  }

  await writeFile(jsFilePath, updatedJS, 'utf8');
  log(`Updated: ${relative(ROOT_DIR, jsFilePath)}`);
}

async function main() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error('config.json not found');
  }
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));

  if (!await pathExists(DIST_LOCAL_DIR)) {
    log('dist/local not found; nothing to process');
    return;
  }

  const jsFiles = (await walkFiles(DIST_LOCAL_DIR)).filter((f) => extname(f) === '.js');
  log(`Processing ${jsFiles.length} JS files in dist/local`);

  for (const jsFile of jsFiles) {
    await processFile(jsFile, config);
  }

  await rm(TEMP_DIR, { recursive: true, force: true }).catch(() => undefined);
  log('After-build processing complete');
}

main().catch((err) => {
  console.error(`[after_build_workspace] Fatal: ${err.message}`);
  process.exit(1);
});
