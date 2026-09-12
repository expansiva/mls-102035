/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e7/mdmIdField.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveNs4Contexts } from '/_102035_/l2/agentNewSolution/helpers/ns4Context.js';
import { normalizeNs4E2Review } from '/_102035_/l2/agentNewSolution/steps/e2/contracts.js';
import { normalizeNs4E3Review } from '/_102035_/l2/agentNewSolution/steps/e3/contracts.js';
import { normalizeNs4E4Review } from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102035_/l2/agentNewSolution/steps/e5/contracts.js';
import { buildNs4E7Plan, normalizeNs4UseCaseDraft } from '/_102035_/l2/agentNewSolution/steps/e7/contracts.js';
import { validateNs4UseCaseDraft } from '/_102035_/l2/agentNewSolution/steps/e7/gate.js';

const journeys = normalizeNs4E2Review({
  moduleName: 'mod', userLanguage: 'en', reviewRound: 1,
  journeys: [{
    journeyId: 'openTab',
    business: {
      actorRef: 'waiter', title: 'Open tab', goal: 'Open a tab.',
      entry: { mode: 'coldStart' }, useRules: [],
      steps: [
        { stepId: 'locateMesa', kind: 'locate', entity: 'Mesa', title: 'Find table.', description: 'Selected.', featureRefs: ['openTab'] },
        { stepId: 'openComanda', kind: 'act', entity: 'Comanda', title: 'Open.', description: 'Opened.', featureRefs: ['openTab'] },
      ],
      outcome: { statement: 'Opened.', evidence: ['Opened.'] },
    },
  }],
  features: [{ featureId: 'openTab', title: 'Open', priority: 'now', journeyStepRefs: ['openTab.locateMesa', 'openTab.openComanda'] }],
});

const access = normalizeNs4E3Review({
  moduleName: 'mod', userLanguage: 'en', reviewRound: 1,
  profiles: [{ profileId: 'waiter', title: 'Waiter', kind: 'internal', description: 'Waiter.', actorRefs: ['waiter'], landingIntent: 'Tables.' }],
  authorities: [
    { authorityRef: 'tab:open', title: 'Open', description: 'Open a tab.', journeyStepRefs: ['openTab.locateMesa', 'openTab.openComanda'], informationNeeds: [] },
  ],
  grants: [{
    profileRef: 'waiter', authorityRef: 'tab:open', reason: 'Open a tab.',
    dataScope: { mode: 'organization', description: 'All tables.' },
    disclosure: { mode: 'fullRecord', description: 'Full.', allowedInformation: [], deniedInformation: [] },
    useRules: [],
  }],
});

const ontology = normalizeNs4E4Review({
  moduleName: 'mod', userLanguage: 'en', title: 'Ontology', reviewRound: 1, solutionMode: 'new', businessDomain: 'Tabs',
  entities: [
    {
      entityId: 'Mesa', title: 'Table', description: 'Table.', kind: 'mdm', ownership: 'moduleOwned',
      sourceRefs: { journeyIds: ['openTab'], featureIds: ['openTab'], authorityRefs: ['tab:open'] },
      fields: [], lifecycleStates: [], lifecyclePredicates: [], useRules: [],
      storage: { target: 'mdm', scope: 'organization', idField: 'mesaId', mdmType: 'mod.Mesa', notes: 'Location.' },
    },
    {
      entityId: 'Comanda', title: 'Tab', description: 'Tab.', kind: 'core', ownership: 'moduleOwned',
      sourceRefs: { journeyIds: ['openTab'], featureIds: ['openTab'], authorityRefs: ['tab:open'] },
      fields: [
        { fieldId: 'comandaId', title: 'Id', type: 'uuid', required: true, description: 'Id.', constraints: [] },
        { fieldId: 'mesaId', title: 'Table', type: 'uuid', required: true, description: 'Table.', constraints: [] },
      ],
      lifecycleStates: ['open'], initialState: 'open', terminalStates: [], lifecyclePredicates: [], useRules: [],
      storage: { target: 'moduleDatabase', scope: 'module', idField: 'comandaId', notes: 'Tab.' },
    },
  ],
  relationships: [{
    relationshipId: 'comandaBelongsToMesa', fromEntity: 'Comanda', toEntity: 'Mesa', type: 'manyToOne', required: true,
    description: 'Tab belongs to a table.', persistence: { mode: 'crossStoreReference' },
    realization: {
      kind: 'fieldReference', ownerEntity: 'Comanda',
      from: { entityId: 'Comanda', fieldIds: ['mesaId'] },
      to: { entityId: 'Mesa', fieldIds: ['mesaId'] },
      description: 'Reference.',
    },
  }],
  changeSummary: [],
});

const rules: Ns4RulesArtifact = {
  schemaVersion: '2026-08-09-ns4-rules-v2', moduleName: 'mod', userLanguage: 'en',
  rules: [], rulesHash: 'sha256:rules', approvedBy: 'auto', approvedAt: '2026-09-09T00:00:00.000Z',
  realization: { status: 'pending', compiledFromRulesHash: 'sha256:rules' },
};
const sources = { journeys, access, ontology, rules };
const derived = deriveNs4Contexts(sources);
const hashes = { journeys: journeys.journeys.map(journey => ({ journeyId: journey.journeyId, businessHash: `sha256:${journey.journeyId}` })), ontologyHash: 'sha256:ontology', rulesHash: rules.rulesHash };

test('mdm storage.idField is a resolvable write fieldRef even when absent from fields[]', () => {
  const plan = buildNs4E7Plan('mod', 'en', journeys, hashes, derived);
  const target = plan.useCases.find(item => item.useCaseId === 'openComanda')!;
  const draft = normalizeNs4UseCaseDraft({
    title: target.title, description: 'Opens a tab for a table.',
    contexts: target.contexts,
    entityRefs: ['Comanda', 'Mesa'],
    writes: [{ entityId: 'Comanda' }, { entityId: 'Mesa', fieldRefs: ['mesaId'] }],
    useRules: [], transitions: [],
  }, plan, 'openComanda');
  const gate = validateNs4UseCaseDraft(plan, draft, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E7_WRITE_FIELD'), false, JSON.stringify(gate.issues));
});

test('a write fieldRef that is neither a real field nor storage.idField still fails NS4_E7_WRITE_FIELD', () => {
  const plan = buildNs4E7Plan('mod', 'en', journeys, hashes, derived);
  const target = plan.useCases.find(item => item.useCaseId === 'openComanda')!;
  const draft = normalizeNs4UseCaseDraft({
    title: target.title, description: 'Opens a tab for a table.',
    contexts: target.contexts,
    entityRefs: ['Comanda', 'Mesa'],
    writes: [{ entityId: 'Comanda' }, { entityId: 'Mesa', fieldRefs: ['noSuchField'] }],
    useRules: [], transitions: [],
  }, plan, 'openComanda');
  const gate = validateNs4UseCaseDraft(plan, draft, sources);
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E7_WRITE_FIELD');
  assert.equal(hit.length, 1, JSON.stringify(gate.issues));
  assert.match(hit[0].message, /Mesa\.noSuchField/);
});
