/// <mls fileReference="_102035_/l2/agentNewSolution5/i18nGuard.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_L2 = path.resolve(HERE, '..');
const ACCENT = /[À-ÿ]/;

const TOUCHED = [
  'agentNewSolution5/agentNewSolution5.ts',
  'agentNewSolution5/helpers/ns5Core.ts',
  'agentNewSolution5/helpers/ns5Core.test.ts',
  'agentNewSolution5/helpers/ns5Dispatch.ts',
  'agentNewSolution5/helpers/ns5Dispatch.test.ts',
  'agentNewSolution5/helpers/ns5CreateAgentGraph.test.ts',
  'agentNewSolution5/helpers/ns5RealFixtures.test.ts',
  'agentNewSolution5/helpers/ns5Skills.ts',
  'agentNewSolution5/helpers/ns5Skills.test.ts',
  'agentNewSolution5/replayRealRuns.test.ts',
  'agentNewSolution5/flowContract.test.ts',
  'agentNewSolution5/promptMarkers.test.ts',
  'agentNewSolution5/README.md',
  'agentNewSolution5/CHANGELOG.md',
  'agentNewSolution5/docs/flow.json',
  'agentNewSolution5/schemas/module.schema.json',
  'agentNewSolution5/schemas/journey.schema.json',
  'agentNewSolution5/schemas/ontology-plan.schema.json',
  'agentNewSolution5/schemas/ontology-entity.schema.json',
  'agentNewSolution5/schemas/ontology-bindings.schema.json',
  'agentNewSolution5/schemas/ontology-plan-v3.schema.json',
  'agentNewSolution5/schemas/ontology-entity-v3.schema.json',
  'agentNewSolution5/schemas/rules.schema.json',
  'agentNewSolution5/schemas/workflows.schema.json',
  'agentNewSolution5/schemas/access.schema.json',
  'agentNewSolution5/schemas/integration.schema.json',
  'agentNewSolution5/schemas/judge.schema.json',
  'agentNewSolution5/steps/judge35/agentNs5Judge.ts',
  'agentNewSolution5/steps/judge35/agentNs5Judge.test.ts',
  'agentNewSolution5/steps/judge35/contracts.ts',
  'agentNewSolution5/steps/judge35/gate.ts',
  'agentNewSolution5/steps/judge35/prompt.md',
  'agentNewSolution5/steps/judge35/readme.md',
  'agentNewSolution5/steps/judge35/CHANGELOG.md',
  'agentNewSolution5/steps/finalize80/agentNs5Finalize.ts',
  'agentNewSolution5/steps/finalize80/agentNs5Finalize.test.ts',
  'agentNewSolution5/steps/finalize80/contracts.ts',
  'agentNewSolution5/steps/finalize80/gate.ts',
  'agentNewSolution5/steps/finalize80/readme.md',
  'agentNewSolution5/steps/finalize80/CHANGELOG.md',
  'agentNewSolution5/steps/integration70/agentNs5Integration.ts',
  'agentNewSolution5/steps/integration70/agentNs5Integration.test.ts',
  'agentNewSolution5/steps/integration70/contracts.ts',
  'agentNewSolution5/steps/integration70/gate.ts',
  'agentNewSolution5/steps/integration70/prompt.md',
  'agentNewSolution5/steps/integration70/readme.md',
  'agentNewSolution5/steps/integration70/CHANGELOG.md',
  'agentNewSolution5/nsArtifactFieldRatchet.test.ts',
  'agentNewSolution5/steps/module10/agentNs5Module.ts',
  'agentNewSolution5/steps/journeys20/agentNs5Journeys.ts',
  'agentNewSolution5/steps/ontology30/agentNs5Ontology.ts',
  'agentNewSolution5/steps/ontology30/agentNs5Ontology.test.ts',
  'agentNewSolution5/steps/ontology30/contracts.ts',
  'agentNewSolution5/steps/ontology30/gate.ts',
  'agentNewSolution5/steps/ontology30/contractsV3.ts',
  'agentNewSolution5/steps/ontology30/gateV3.ts',
  'agentNewSolution5/steps/ontology30/agentNs5OntologyV3.test.ts',
  'agentNewSolution5/steps/ontology30/prompt.md',
  'agentNewSolution5/steps/ontology30/promptEntity.md',
  'agentNewSolution5/steps/ontology30/readme.md',
  'agentNewSolution5/steps/ontology30/CHANGELOG.md',
  'agentNewSolution5/steps/rules40/agentNs5Rules.ts',
  'agentNewSolution5/steps/rules40/agentNs5Rules.test.ts',
  'agentNewSolution5/steps/rules40/contracts.ts',
  'agentNewSolution5/steps/rules40/gate.ts',
  'agentNewSolution5/steps/rules40/prompt.md',
  'agentNewSolution5/steps/rules40/readme.md',
  'agentNewSolution5/steps/rules40/CHANGELOG.md',
  'agentNewSolution5/steps/workflows50/agentNs5Workflows.ts',
  'agentNewSolution5/steps/workflows50/agentNs5Workflows.test.ts',
  'agentNewSolution5/steps/workflows50/contracts.ts',
  'agentNewSolution5/steps/workflows50/gate.ts',
  'agentNewSolution5/steps/workflows50/prompt.md',
  'agentNewSolution5/steps/workflows50/readme.md',
  'agentNewSolution5/steps/workflows50/CHANGELOG.md',
  'agentNewSolution5/steps/access60/agentNs5Access.ts',
  'agentNewSolution5/steps/access60/agentNs5Access.test.ts',
  'agentNewSolution5/steps/access60/contracts.ts',
  'agentNewSolution5/steps/access60/gate.ts',
  'agentNewSolution5/steps/access60/prompt.md',
  'agentNewSolution5/steps/access60/readme.md',
  'agentNewSolution5/steps/access60/CHANGELOG.md',
  'agentNewSolution5/steps/journeys20/agentNs5Journeys.test.ts',
  'agentNewSolution5/steps/journeys20/contracts.ts',
  'agentNewSolution5/steps/journeys20/gate.ts',
  'agentNewSolution5/steps/journeys20/prompt.md',
  'agentNewSolution5/steps/journeys20/readme.md',
  'agentNewSolution5/steps/journeys20/CHANGELOG.md',
  'agentNewSolution5/steps/module10/agentNs5Module.test.ts',
  'agentNewSolution5/steps/module10/contracts.ts',
  'agentNewSolution5/steps/module10/gate.ts',
  'agentNewSolution5/steps/module10/prompt.md',
  'agentNewSolution5/steps/module10/readme.md',
  'agentNewSolution5/steps/module10/CHANGELOG.md',
  'solution/types.ts',
  'solution/lib.ts',
  'solution/fs.ts',
  'solution/fs.test.ts',
];

void test('ns5 touched files stay English in comments and identifiers', () => {
  for (const relative of TOUCHED) {
    const abs = path.join(PROJECT_L2, relative);
    assert.equal(existsSync(abs), true, relative);
    const source = readFileSync(abs, 'utf8');
    assert.doesNotMatch(source, /portuguese\s*\?/, relative);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('<!--');
      if (!isComment) continue;
      assert.doesNotMatch(line, ACCENT, `${relative}: ${trimmed}`);
    }
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    assert.doesNotMatch(stripped, ACCENT, relative);
  }
});
