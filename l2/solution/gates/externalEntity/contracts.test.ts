/// <mls fileReference="_102035_/l2/solution/gates/externalEntity/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { checkExternalEntities, parseCatalogOutputFields } from '/_102035_/l2/solution/gates/externalEntity/contracts.js';

const CATALOG_TEXT = `
export type CmAgentLimits = CmAgentLimit[];

/** What listAgents returns for one agent. */
export interface CmAgentCard {
  agentId: string;
  name: string;
  audience: CmAgentAudience;
  enabled: boolean;
  responsibleUserId?: string;
  /** Only on drafts. */
  draftStatus?: CmDraftStatus;
  // a brace in a comment should not close the interface: }
  refusedReason?: string;
}

export interface CmReadAgentOutput {
  agentId: string;
  name: string;
  /** Only for the Nora. */
  personal?: { role: string; state: string };
  version: string;
}

export interface CmChild extends CmAgentCard {
  extra: string;
}

export interface CmListAgentsOutput {
  agents: CmAgentCard[];
}
`;

test('parseCatalogOutputFields reads top-level interface properties', () => {
  const fields = parseCatalogOutputFields(CATALOG_TEXT);
  assert.deepEqual(fields.CmAgentCard, [
    'agentId',
    'name',
    'audience',
    'enabled',
    'responsibleUserId',
    'draftStatus',
    'refusedReason',
  ]);
  assert.deepEqual(fields.CmReadAgentOutput, ['agentId', 'name', 'personal', 'version']);
  assert.equal(fields.CmReadAgentOutput.includes('role'), false);
  assert.equal(fields.CmReadAgentOutput.includes('state'), false);
  assert.deepEqual(fields.CmAgentLimits, []);
  assert.equal(fields.CmChild.includes('name'), true);
  assert.equal(fields.CmChild.includes('extra'), true);
  assert.equal(fields.CmListAgentsOutput.includes('agents'), true);
  assert.equal(fields.CmListAgentsOutput.includes('name'), true);
  assert.equal(fields.CmListAgentsOutput.includes('role'), false);
});

test('external entity with no call operation is an error', () => {
  const result = checkExternalEntities({
    entities: [{ entityId: 'AgentDraft', kind: 'external', connectionId: 'cm', requiredFields: ['name'] }],
    connections: [{ connectionId: 'cm', operationId: 'readAgent', direction: 'serve', entityRefs: ['AgentDraft'] }],
    catalogs: {
      cm: {
        operations: [{ operationId: 'readAgent', outputType: 'CmAgentCard' }],
        fieldsByType: { CmAgentCard: ['name'] },
      },
    },
  });
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, 'EXTERNAL_ENTITY_NO_OPERATION');
  assert.equal(result.errors[0].entityId, 'AgentDraft');
  assert.match(result.errors[0].message, /cm/);
});

test('a call operation that cites the entity clears the error', () => {
  const result = checkExternalEntities({
    entities: [{ entityId: 'Agent', kind: 'external', connectionId: 'cm', requiredFields: [] }],
    connections: [{ connectionId: 'cm', operationId: 'listAgents', direction: 'call', entityRefs: ['Agent'] }],
    catalogs: {
      cm: {
        operations: [{ operationId: 'listAgents', outputType: 'CmAgentCard' }],
        fieldsByType: { CmAgentCard: ['name'] },
      },
    },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test('a required field missing from the output is a warning', () => {
  const result = checkExternalEntities({
    entities: [{
      entityId: 'AgentDraft',
      kind: 'external',
      connectionId: 'cm',
      requiredFields: ['prompt', 'name'],
    }],
    connections: [{ connectionId: 'cm', operationId: 'listAgents', direction: 'call', entityRefs: ['AgentDraft'] }],
    catalogs: {
      cm: {
        operations: [{ operationId: 'listAgents', outputType: 'Promise<CmAgentCard[]>' }],
        fieldsByType: { CmAgentCard: ['agentId', 'name'] },
      },
    },
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].code, 'EXTERNAL_FIELD_NOT_DELIVERED');
  assert.equal(result.warnings[0].path, 'ontology.AgentDraft.prompt');
  assert.match(result.warnings[0].message, /prompt/);
  assert.match(result.warnings[0].message, /listAgents/);
  assert.equal(result.warnings.some(issue => issue.message.includes('name is not')), false);
});

test('a connection the module declares is not checked', () => {
  const result = checkExternalEntities({
    entities: [{ entityId: 'Repo', kind: 'external', connectionId: 'repoHost', requiredFields: ['prompt'] }],
    connections: [],
    catalogs: {
      cm: { operations: [], fieldsByType: {} },
    },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test('an unresolved output type produces no field warning', () => {
  const result = checkExternalEntities({
    entities: [{ entityId: 'AgentDraft', kind: 'external', connectionId: 'cm', requiredFields: ['prompt'] }],
    connections: [{ connectionId: 'cm', operationId: 'listAgents', direction: 'call', entityRefs: ['AgentDraft'] }],
    catalogs: {
      cm: {
        operations: [{ operationId: 'listAgents' }],
        fieldsByType: {},
      },
    },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test('an optional field the connection does not deliver is a warning, never an error', () => {
  const result = checkExternalEntities({
    entities: [{ entityId: 'Agent', kind: 'external', connectionId: 'cm', requiredFields: ['name'], optionalFields: ['talksTo', 'definition'] }],
    connections: [{ connectionId: 'cm', operationId: 'readAgent', direction: 'call', entityRefs: ['Agent'] }],
    catalogs: { cm: { operations: [{ operationId: 'readAgent', outputType: 'ReadOut' }], fieldsByType: { ReadOut: ['name', 'definition'] } } },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings.map(item => `${item.code} ${item.path}`), ['EXTERNAL_FIELD_NOT_DELIVERED ontology.Agent.talksTo']);
  assert.match(result.warnings[0].message, /^Optional field talksTo/);
});
