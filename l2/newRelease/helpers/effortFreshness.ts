/// <mls fileReference="_102035_/l2/newRelease/helpers/effortFreshness.ts" enhancement="_blank" />
import { buildCandidateSnapshot } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { readActiveSealedL4Candidate, type L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { fileExists, readSourceText } from '/_102035_/l2/solution/fs.js';
import { normalizeTobeArtifactPath, tobeArtifactFileInfo } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';

export async function effortMatchesCurrent(project: number, moduleName: string, effort: unknown,
  dependencies: { sealed?: () => Promise<L4SealedCandidateSnapshot | null>; source?: (path: L4SealedCandidateSnapshot['sources'][number]['path']) => Promise<string> } = {}): Promise<boolean> {
  const checked = validateChangeEffort(effort);
  if (!checked.ok || checked.file.module !== moduleName) return false;
  try {
    const sealed = await (dependencies.sealed ?? (() => readActiveSealedL4Candidate(project, moduleName)))();
    if (!sealed) return false;
    const manifest = sealed.manifest;
    const root = `${moduleName}/pipeline/changes/${manifest.changeId}/revisions/${manifest.revisionId}/l4`;
    if (checked.file.base.baseId !== manifest.baseId || checked.file.base.revisionId !== manifest.revisionId
      || checked.file.base.candidateRoot !== root) return false;
    const source = dependencies.source ?? (async path => {
      const mirror = tobeArtifactFileInfo(project, moduleName, path, 'tobe');
      return readSourceText(fileExists(mirror) ? mirror : tobeArtifactFileInfo(project, moduleName, path, 'asis'));
    });
    if (!dependencies.source) {
      const prefix = `${moduleName}/tobe/plan`;
      const expected = new Set(sealed.sources.map(item => item.path));
      for (const file of Object.values(mls.stor.files)) {
        if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted' || file.extension !== '.defs.ts'
          || !(file.folder === prefix || file.folder.startsWith(`${prefix}/`))) continue;
        const relative = `${file.folder.slice(prefix.length).replace(/^\//u, '')}/${file.shortName}.defs.ts`.replace(/^\//u, '');
        try { if (!expected.has(normalizeTobeArtifactPath(relative))) return false; } catch (cause) { console.error('[newRelease] effort freshness could not be verified', cause); return false; }
      }
    }
    const current = await Promise.all(sealed.sources.map(async item => ({ path: item.path, source: await source(item.path) })));
    const input = { baseId: manifest.baseId, requestRevision: manifest.requestRevision, request: sealed.request };
    const [expected, actual] = await Promise.all([
      buildCandidateSnapshot({ ...input, sources: sealed.sources }), buildCandidateSnapshot({ ...input, sources: current }),
    ]);
    return expected.hash === actual.hash;
  } catch (cause) { console.error('[newRelease] effort freshness could not be verified', cause); return false; }
}
