#!/usr/bin/env node

import { existsSync } from 'node:fs';
import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = resolve(ROOT_DIR, 'config.json');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const LOCAL_DIST_DIR = resolve(DIST_DIR, 'local');
const VALID_PROJECT_TYPES = new Set(['master frontend', 'master backend', 'client', 'lib', 'enhancement']);
const PROJECT_IMPORT_PATTERN = /(?<prefix>\bfrom\s+["']|\bimport\s*\(\s*["'])(?<specifier>\/_\d+_\/(?:core|l1|l2)\/[^"']+)(?<suffix>["'](?:\s*\))?)/gu;
const IMPORTMAP_PATTERN = /\s*<script\s+type=["']importmap["'][^>]*>.*?<\/script>\s*/gsu;
const PROJECT_ASSET_URL_PATTERN = /(?<prefix>["'(=])(?<path>\/_\d+_\/(?:core|l1|l2)\/[^"')\s>]+)/gu;
const RESOURCE_SUFFIXES = new Set(['.html', '.css', '.json', '.svg', '.md', '.less']);
const TYPESCRIPT_SEGMENTS = ['core', 'l1', 'l2'];
const RESOURCE_SEGMENTS = ['core', 'l1', 'l2', 'l5'];

function log(message) {
  console.log(`[build_workspace] ${message}`);
}

function run(command, args, options = {}) {
  log(`Running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${command} ${args.join(' ')}`);
  }
}

function toPosix(path) {
  return path.split('\\').join('/');
}

function relativeToRoot(path) {
  return toPosix(relative(ROOT_DIR, path));
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`config.json not found at ${CONFIG_PATH}`);
  }

  const config = await loadJson(CONFIG_PATH);
  const projects = config.projects ?? {};
  if (typeof projects !== 'object' || Object.keys(projects).length === 0) {
    throw new Error("config.json must declare a non-empty 'projects' object.");
  }

  const invalidTypes = [];
  const clients = [];
  const masterFrontends = [];
  const masterBackends = [];
  const libs = [];

  for (const [projectId, project] of Object.entries(projects)) {
    const projectType = project.type;
    if (!VALID_PROJECT_TYPES.has(projectType)) {
      invalidTypes.push(`${projectId}:${projectType}`);
      continue;
    }
    if (projectType === 'client') {
      clients.push(projectId);
    } else if (projectType === 'master frontend') {
      masterFrontends.push(projectId);
    } else if (projectType === 'master backend') {
      masterBackends.push(projectId);
    } else if (projectType === 'lib') {
      libs.push(projectId);
    }
  }

  if (invalidTypes.length > 0) {
    throw new Error(`Invalid project type declarations: ${invalidTypes.join(', ')}`);
  }
  if (clients.length !== 1) {
    throw new Error(`Workspace must declare exactly one project of type 'client'. Found ${clients.length}.`);
  }
  if (masterFrontends.length === 0) {
    throw new Error("Workspace must declare at least one project of type 'master frontend'.");
  }
  if (masterBackends.length === 0) {
    throw new Error("Workspace must declare at least one project of type 'master backend'.");
  }
  if (!projects[config.defaultProjectId]) {
    throw new Error(`defaultProjectId '${config.defaultProjectId}' is not declared in config.json.`);
  }

  log(
    `Workspace config loaded (client=${clients[0]}, frontend_masters=${masterFrontends.length}, backend_masters=${masterBackends.length}, libs=${libs.length}, total_projects=${Object.keys(projects).length})`,
  );
  return config;
}

function getProjectRoot(config, projectId) {
  const root = config.projects[projectId]?.root;
  if (!root) {
    return resolve(ROOT_DIR, `_${projectId}_`);
  }
  return resolve(ROOT_DIR, root);
}

function getVirtualProjectDir(projectId) {
  return resolve(LOCAL_DIST_DIR, `_${projectId}_`);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(rootDir) {
  const files = [];
  if (!await pathExists(rootDir)) {
    return files;
  }

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

  await visit(rootDir);
  return files;
}

async function walkDirs(rootDir) {
  const dirs = [];
  if (!await pathExists(rootDir)) {
    return dirs;
  }

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const child = join(current, entry.name);
      if (entry.isDirectory()) {
        dirs.push(child);
        await visit(child);
      }
    }
  }

  await visit(rootDir);
  return dirs;
}

function getPublicationTargets(config) {
  const targets = config.publication?.targets ?? {};
  if (typeof targets !== 'object' || Object.keys(targets).length === 0) {
    throw new Error('config.json must declare a non-empty publication.targets object.');
  }
  return targets;
}

async function buildDynamicTsconfig(config) {
  const tsconfig = await loadJson(resolve(ROOT_DIR, 'tsconfig.json'));
  const compilerOptions = tsconfig.compilerOptions ?? {};
  const dynamicPaths = { ...(compilerOptions.paths ?? {}) };
  const dynamicInclude = [];

  compilerOptions.noEmit = false;
  compilerOptions.outDir = relativeToRoot(LOCAL_DIST_DIR);
  compilerOptions.paths = dynamicPaths;
  tsconfig.compilerOptions = compilerOptions;

  for (const projectId of Object.keys(config.projects)) {
    const projectRoot = getProjectRoot(config, projectId);
    for (const segment of TYPESCRIPT_SEGMENTS) {
      const segmentDir = resolve(projectRoot, segment);
      if (!existsSync(segmentDir)) {
        continue;
      }

      dynamicPaths[`/_${projectId}_/${segment}/*`] = [toPosix(relative(ROOT_DIR, resolve(projectRoot, segment, '*')))];
      dynamicInclude.push(`${relativeToRoot(segmentDir)}/**/*.d.ts`);
      dynamicInclude.push(`${relativeToRoot(segmentDir)}/**/*.ts`);
    }
  }

  tsconfig.include = dynamicInclude;
  return tsconfig;
}

async function cleanDist() {
  if (existsSync(DIST_DIR)) {
    await rm(DIST_DIR, { recursive: true, force: true });
    log('Removed existing dist directory');
  } else {
    log('dist directory did not exist; clean step skipped');
  }
}

async function moveRootProjectEmit(config) {
  for (const [projectId, project] of Object.entries(config.projects)) {
    if (resolve(ROOT_DIR, project.root ?? `_${projectId}_`) !== ROOT_DIR) {
      continue;
    }

    const targetProjectDir = getVirtualProjectDir(projectId);
    await mkdir(targetProjectDir, { recursive: true });
    for (const segment of TYPESCRIPT_SEGMENTS) {
      const emittedSegmentDir = resolve(LOCAL_DIST_DIR, segment);
      if (!existsSync(emittedSegmentDir)) {
        continue;
      }
      const targetSegmentDir = resolve(targetProjectDir, segment);
      await rm(targetSegmentDir, { recursive: true, force: true });
      await rename(emittedSegmentDir, targetSegmentDir);
    }
  }
}

async function buildTypescript(config) {
  const tempPath = resolve(ROOT_DIR, `.tsconfig.workspace.${process.pid}.json`);
  await writeFile(tempPath, `${JSON.stringify(await buildDynamicTsconfig(config), null, 2)}\n`, 'utf8');
  try {
    run('npx', ['tsc', '-p', relativeToRoot(tempPath)]);
  } finally {
    await unlink(tempPath).catch(() => undefined);
  }
  await moveRootProjectEmit(config);
  log('TypeScript compilation completed');
}

async function buildTailwind(config) {
  for (const [projectId, project] of Object.entries(config.projects)) {
    if (project.type !== 'master frontend') {
      continue;
    }

    const projectRoot = getProjectRoot(config, projectId);
    const sourceFile = resolve(projectRoot, 'l2/shared/tailwind.css');
    if (!existsSync(sourceFile)) {
      log(`Tailwind source not found for frontend master ${projectId}; skipping`);
      continue;
    }

    const outputFile = resolve(getVirtualProjectDir(projectId), 'l2/shared/tailwind.css');
    await mkdir(dirname(outputFile), { recursive: true });
    const workspaceSourceLines = Object.keys(config.projects)
      .filter((otherProjectId) => otherProjectId !== projectId)
      .map((otherProjectId) => {
        const otherRoot = getProjectRoot(config, otherProjectId);
        return `@source "${toPosix(relative(dirname(sourceFile), resolve(otherRoot, 'l2/**/*.ts')))}";`;
      });
    const tempSourceFile = resolve(dirname(sourceFile), '.tailwind.workspace.css');
    try {
      const source = await readFile(sourceFile, 'utf8');
      await writeFile(tempSourceFile, `${source.trimEnd()}\n\n${workspaceSourceLines.join('\n')}\n`, 'utf8');
      run('npx', [
        '@tailwindcss/cli',
        '-i',
        relativeToRoot(tempSourceFile),
        '-o',
        relativeToRoot(outputFile),
        '--minify',
      ]);
    } finally {
      await unlink(tempSourceFile).catch(() => undefined);
    }
    log(`Tailwind build completed for frontend master ${projectId}`);
  }
}

async function rewriteAbsoluteImports(config) {
  for (const [projectId] of Object.entries(config.projects)) {
    const projectRoot = getProjectRoot(config, projectId);
    const candidatePaths = [
      resolve(projectRoot, 'l1/scripts/rewriteProjectAbsoluteImports.mjs'),
      resolve(projectRoot, 'scripts/rewriteProjectAbsoluteImports.mjs'),
    ];
    for (const candidate of candidatePaths) {
      if (!existsSync(candidate)) {
        continue;
      }
      run('node', [relativeToRoot(candidate)]);
      log(`Absolute import rewrite completed for project ${projectId}`);
    }
  }
}

async function rewriteDistProjectAbsoluteImports() {
  if (!existsSync(LOCAL_DIST_DIR)) {
    return;
  }

  let rewrittenFiles = 0;
  const files = (await walkFiles(LOCAL_DIST_DIR)).filter((file) => extname(file) === '.js');
  for (const filePath of files) {
    const current = await readFile(filePath, 'utf8');
    const updated = current.replace(PROJECT_IMPORT_PATTERN, (...args) => {
      const groups = args.at(-1);
      const targetPath = resolve(LOCAL_DIST_DIR, groups.specifier.slice(1));
      let relativeTarget = toPosix(relative(dirname(filePath), targetPath));
      if (!relativeTarget.startsWith('.')) {
        relativeTarget = `./${relativeTarget}`;
      }
      return `${groups.prefix}${relativeTarget}${groups.suffix}`;
    });

    if (updated === current) {
      continue;
    }

    await writeFile(filePath, updated, 'utf8');
    rewrittenFiles += 1;
  }

  if (rewrittenFiles > 0) {
    log(`Generic absolute import rewrite completed for dist (files=${rewrittenFiles})`);
  }
}

async function copyProjectSql(config) {
  for (const [projectId] of Object.entries(config.projects)) {
    const sqlDir = resolve(getProjectRoot(config, projectId), 'l1/sql');
    if (!existsSync(sqlDir)) {
      continue;
    }

    const targetDir = resolve(getVirtualProjectDir(projectId), 'l1/sql');
    await mkdir(targetDir, { recursive: true });
    const sqlFiles = (await readdir(sqlDir)).filter((file) => file.endsWith('.sql'));
    for (const sqlFile of sqlFiles) {
      await copyFile(resolve(sqlDir, sqlFile), resolve(targetDir, sqlFile));
    }
    log(`Copied ${sqlFiles.length} SQL files for project ${projectId}`);
  }
}

async function copyProjectL2StaticFiles(config) {
  for (const [projectId] of Object.entries(config.projects)) {
    const l2Dir = resolve(getProjectRoot(config, projectId), 'l2');
    if (!existsSync(l2Dir)) {
      continue;
    }

    let copiedHtml = 0;
    let copiedAssets = 0;
    const files = await walkFiles(l2Dir);
    for (const filePath of files) {
      const relativePath = toPosix(relative(l2Dir, filePath));
      const targetFile = resolve(getVirtualProjectDir(projectId), 'l2', relativePath);
      if (extname(filePath) === '.html') {
        await mkdir(dirname(targetFile), { recursive: true });
        await copyFile(filePath, targetFile);
        copiedHtml += 1;
      }
    }

    const dirs = await walkDirs(l2Dir);
    for (const assetsDir of dirs) {
      if (assetsDir.split(/[\\/]/u).at(-1) !== 'assets') {
        continue;
      }
      const relativeAssets = toPosix(relative(l2Dir, assetsDir));
      await cp(assetsDir, resolve(getVirtualProjectDir(projectId), 'l2', relativeAssets), { recursive: true, force: true });
      copiedAssets += 1;
    }

    if (copiedHtml > 0 || copiedAssets > 0) {
      log(`Copied static frontend files for project ${projectId} (html=${copiedHtml}, asset_dirs=${copiedAssets})`);
    }
  }
}

async function copyProjectResources(config) {
  for (const [projectId] of Object.entries(config.projects)) {
    const projectRoot = getProjectRoot(config, projectId);
    let copiedFiles = 0;

    for (const segment of RESOURCE_SEGMENTS) {
      const segmentDir = resolve(projectRoot, segment);
      if (!existsSync(segmentDir)) {
        continue;
      }

      const files = await walkFiles(segmentDir);
      for (const filePath of files) {
        if (!RESOURCE_SUFFIXES.has(extname(filePath))) {
          continue;
        }
        if (filePath.endsWith('.tailwind.workspace.css') || filePath.endsWith('/tailwind.css')) {
          continue;
        }

        const targetFile = resolve(getVirtualProjectDir(projectId), segment, toPosix(relative(segmentDir, filePath)));
        await mkdir(dirname(targetFile), { recursive: true });
        await copyFile(filePath, targetFile);
        copiedFiles += 1;
      }
    }

    if (copiedFiles > 0) {
      log(`Copied project resources for project ${projectId} (files=${copiedFiles})`);
    }
  }
}

async function copyFrontendPublicationResources(config, targetName) {
  const targetRoot = resolve(DIST_DIR, targetName);

  for (const [projectId, project] of Object.entries(config.projects)) {
    const l2Dir = resolve(getProjectRoot(config, projectId), 'l2');
    if (!existsSync(l2Dir)) {
      continue;
    }

    let copiedFiles = 0;
    const files = await walkFiles(l2Dir);
    for (const filePath of files) {
      if (!RESOURCE_SUFFIXES.has(extname(filePath))) {
        continue;
      }
      if (filePath.endsWith('.tailwind.workspace.css') || filePath.endsWith('/tailwind.css')) {
        continue;
      }
      const targetFile = resolve(targetRoot, `_${projectId}_`, 'l2', toPosix(relative(l2Dir, filePath)));
      await mkdir(dirname(targetFile), { recursive: true });
      await copyFile(filePath, targetFile);
      copiedFiles += 1;
    }

    const builtTailwind = resolve(getVirtualProjectDir(projectId), 'l2/shared/tailwind.css');
    if (project.type === 'master frontend' && existsSync(builtTailwind)) {
      const targetTailwind = resolve(targetRoot, `_${projectId}_`, 'l2/shared/tailwind.css');
      if (resolve(targetTailwind) !== resolve(builtTailwind)) {
        await mkdir(dirname(targetTailwind), { recursive: true });
        await copyFile(builtTailwind, targetTailwind);
        copiedFiles += 1;
      }
    }

    if (copiedFiles > 0) {
      log(`Copied publication resources for target=${targetName} project=${projectId} (files=${copiedFiles})`);
    }
  }
}

function prefixProjectAssetUrls(contents, assetBaseUrl) {
  if (!assetBaseUrl) {
    return contents;
  }

  const normalizedBase = assetBaseUrl.replace(/\/+$/u, '');
  return contents.replace(PROJECT_ASSET_URL_PATTERN, (...args) => {
    const groups = args.at(-1);
    return `${groups.prefix}${normalizedBase}${groups.path}`;
  });
}

async function renderPublicationShellTemplates(config, targetName, targetConfig) {
  const assetBaseUrl = String(targetConfig.assetBaseUrl ?? '');
  for (const shellRelativePath of Object.values(config.shellTemplates ?? {})) {
    const sourcePath = resolve(ROOT_DIR, shellRelativePath.replace(/^\.\//u, ''));
    if (!existsSync(sourcePath)) {
      continue;
    }

    let rendered = await readFile(sourcePath, 'utf8');
    rendered = rendered.replace(IMPORTMAP_PATTERN, '');
    rendered = prefixProjectAssetUrls(rendered, assetBaseUrl);

    const targetPath = resolve(DIST_DIR, targetName, shellRelativePath.replace(/^\.\//u, ''));
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, rendered, 'utf8');
  }
}

async function buildFrontendPublicationTargets(config) {
  const targets = getPublicationTargets(config);
  for (const [targetName, targetConfig] of Object.entries(targets)) {
    run('node', ['scripts/build_frontend.mjs', '--target', targetName]);
    await copyFrontendPublicationResources(config, targetName);
    await renderPublicationShellTemplates(config, targetName, targetConfig);
    log(`Publication target built (${targetName})`);
  }
}

async function runFullBuild(config) {
  await cleanDist();
  await buildTypescript(config);
  await buildTailwind(config);
  await rewriteAbsoluteImports(config);
  await rewriteDistProjectAbsoluteImports();
  await copyProjectSql(config);
  await copyProjectL2StaticFiles(config);
  await copyProjectResources(config);
  await buildFrontendPublicationTargets(config);
  log('Workspace build finished successfully');
}

async function watchTypescript(config) {
  log('Entering TypeScript watch mode. Static copy and post-build steps will not rerun automatically.');
  const tempPath = resolve(ROOT_DIR, `.tsconfig.workspace.${process.pid}.json`);
  await writeFile(tempPath, `${JSON.stringify(await buildDynamicTsconfig(config), null, 2)}\n`, 'utf8');
  const result = spawnSync('npx', ['tsc', '-p', tempPath, '--watch'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  await unlink(tempPath).catch(() => undefined);
  if (result.status !== 0) {
    throw new Error(`TypeScript watch exited with code ${result.status}`);
  }
}

function parseArgs(argv) {
  return {
    watchTsc: argv.includes('--watch-tsc'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  await runFullBuild(config);
  if (args.watchTsc) {
    await watchTypescript(config);
  }
}

main().catch((error) => {
  console.error(`[build_workspace] Build aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
