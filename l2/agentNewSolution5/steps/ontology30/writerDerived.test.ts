/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/writerDerived.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadNs5FixtureJson, loadNs5OracleSources } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import { ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import type {
  Ns5AccessArtifact,
  Ns5JourneyArtifact,
  Ns5ModuleActor,
} from '/_102035_/l2/solution/types.js';
import {
  NS5_ONTOLOGY_WRITER_DERIVED,
  assembleNs5Ontology,
  normalizeNs5OntologyEntity,
  normalizeNs5OntologyPlan,
  ns5ResolveEntityWriter,
  type Ns5OntologyEntityDraft,
  type Ns5OntologyPlanDraft,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import { validateNs5OntologyEntity } from '/_102035_/l2/agentNewSolution5/steps/ontology30/gate.js';
import { runNs5Oracle } from '/_102035_/l2/agentNewSolution5/steps/finalize80/gate.js';
import { NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION } from '/_102035_/l2/agentNewSolution5/steps/finalize80/contracts.js';
import {
  NS5_INTEGRATION_DROP_TRANSITION_REF,
  normalizeNs5IntegrationPayload,
} from '/_102035_/l2/agentNewSolution5/steps/integration70/contracts.js';
import { validateNs5Integration } from '/_102035_/l2/agentNewSolution5/steps/integration70/gate.js';

const LEVA = ['steps/ontology30/fixtures/leva-final'] as const;

function loadLeva<T>(moduleName: string, file: string): T {
  return loadNs5FixtureJson<T>(...LEVA, moduleName, file);
}

function loadPlan(moduleName: string): Ns5OntologyPlanDraft {
  return loadLeva<Ns5OntologyPlanDraft>(moduleName, 'ontology30-plan-draft.json');
}

function loadDetail(moduleName: string, entityId: string): Ns5OntologyEntityDraft {
  return loadLeva<Ns5OntologyEntityDraft>(moduleName, `ontology30-entity-${entityId}-draft.json`);
}

function loadJourneys(moduleName: string): Ns5JourneyArtifact[] {
  return loadLeva<{ journeys: Ns5JourneyArtifact[] }>(moduleName, 'journeys20-draft.json').journeys;
}

function actorsFrom(journeys: Ns5JourneyArtifact[]): Ns5ModuleActor[] {
  const seen = new Set<string>();
  const actors: Ns5ModuleActor[] = [];
  for (const journey of journeys) {
    const actorId = journey.business.actorRef;
    if (!actorId || seen.has(actorId)) continue;
    seen.add(actorId);
    actors.push({
      actorId,
      kind: actorId === 'publico' || actorId === 'pagador' ? 'external' : 'internal',
      origin: 'named',
      title: actorId,
      description: actorId,
    });
  }
  return actors;
}

function gateEntity(moduleName: string, entityId: string) {
  const journeys = loadJourneys(moduleName);
  const plan = normalizeNs5OntologyPlan(loadPlan(moduleName), moduleName, journeys);
  const detail = normalizeNs5OntologyEntity(loadDetail(moduleName, entityId), entityId, journeys);
  const gate = validateNs5OntologyEntity(plan, detail, {
    moduleName,
    actors: actorsFrom(journeys),
    journeys,
  });
  const entity = plan.entities.find(item => item.entityId === entityId)!;
  const resolved = ns5ResolveEntityWriter(entity, plan, journeys);
  return { plan, detail, gate, resolved };
}

void test('leva-final drafts: child entities derive parent writer; TituloReceber is not a panel', () => {
  for (const [moduleName, entityId] of [
    ['ordenServicio', 'PiezaPresupuesto'],
    ['locacaoEquipamentos', 'ItemLocacao'],
    ['financeiro', 'Recebimento'],
    ['financeiro', 'EstornoRecebimento'],
  ] as const) {
    const { plan, gate, resolved } = gateEntity(moduleName, entityId);
    assert.equal(resolved.kind, 'parent', `${entityId}: ${JSON.stringify(resolved)}`);
    assert.ok(
      plan.normalizations?.some(item => (
        item.kind === NS5_ONTOLOGY_WRITER_DERIVED
        && item.entityId === entityId
        && item.writerKind === 'parent'
      )),
      `${entityId} missing WRITER_DERIVED parent`,
    );
    assert.equal(
      gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER'),
      false,
      `${entityId} WITHOUT_WRITER: ${gate.issues.map(issue => issue.code).join(', ')}`,
    );
    assert.equal(
      gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY'),
      false,
      `${entityId} AGGREGATE_ONLY`,
    );
    assert.equal(gate.ok, true, `${entityId}: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`);
  }

  const titulo = gateEntity('financeiro', 'TituloReceber');
  assert.equal(titulo.resolved.kind, 'inbound');
  assert.equal(titulo.gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY'), false);
  assert.equal(titulo.gate.ok, true, titulo.gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('Participante attaches via publico create on Inscricao; I8 passes', () => {
  const moduleName = 'inscricaoEvento';
  const journeys = loadJourneys(moduleName);
  const plan = normalizeNs5OntologyPlan(loadPlan(moduleName), moduleName, journeys);
  const { gate, resolved } = gateEntity(moduleName, 'Participante');
  assert.equal(resolved.kind, 'attach', JSON.stringify(resolved));
  assert.equal(resolved.via?.entityId, 'Inscricao');
  assert.equal(resolved.via?.relationshipId, 'inscricaoParticipante');
  assert.match(resolved.via?.stepRef || '', /criarInscricao/);
  assert.ok(plan.normalizations?.some(item => (
    item.kind === NS5_ONTOLOGY_WRITER_DERIVED
    && item.entityId === 'Participante'
    && item.writerKind === 'attach'
  )));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  const access = loadLeva<Ns5AccessArtifact>(moduleName, 'access60-draft.json');
  const details = plan.entities.map(entity => {
    if (entity.entityId === 'Participante' || entity.entityId === 'Inscricao') {
      return normalizeNs5OntologyEntity(loadDetail(moduleName, entity.entityId), entity.entityId, journeys);
    }
    return { entityId: entity.entityId, fields: [], lifecycleStates: [], transitions: [] };
  });
  const assembled = assembleNs5Ontology(plan, details);
  const sources = JSON.parse(JSON.stringify(loadNs5OracleSources('comandaRestaurante5'))) as ReturnType<typeof loadNs5OracleSources>;
  const publico = access.actors.find(actor => actor.actorId === 'publico')!;
  const own = access.grants.find(grant => grant.grantId === 'consultarEadministrarInscricaoPropria')!;
  sources.access.actors.push(publico);
  sources.access.grants.push(own);
  for (const entity of assembled.entities) {
    if (sources.entities.some(item => item.entityId === entity.entityId)) continue;
    sources.entities.push(...ns5OntologyEntityViews([entity]));
    sources.ontologyIndex.entities.push(entity.entityId);
  }
  sources.ontologyIndex.relationships.push(...assembled.index.relationships);
  for (const journey of journeys) sources.journeys.push(journey);
  const report = runNs5Oracle(sources);
  const i8 = report.errors.filter(issue => issue.code === NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION);
  assert.equal(i8.length, 0, i8.map(issue => issue.message).join('\n'));
});

void test('compras inbound transitionRef with effect create is dropped; gate ok', () => {
  const draft = loadLeva<unknown>('compras', 'integration70-draft.json');
  const { inbound, normalizations } = normalizeNs5IntegrationPayload(draft);
  assert.equal(inbound[0]?.effect, 'create');
  assert.equal(inbound[0]?.transitionRef, undefined);
  assert.ok(normalizations.some(item => (
    item.kind === NS5_INTEGRATION_DROP_TRANSITION_REF
    && item.inboundId === 'produtoMdmCreated'
  )));
  const plan = loadPlan('compras');
  const gate = validateNs5Integration(inbound, [], [], {
    actors: [{ actorId: 'comprador', kind: 'internal' }],
    entities: plan.entities.map(entity => ({ entityId: entity.entityId })),
    registryModuleNames: ['controleEstoque'],
    siblings: [{ moduleName: 'controleEstoque', roles: [], entities: [], events: [] }],
    sourcePrompt: 'compras',
    platformEventIds: ['mdmCreated'],
  });
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_TRANSITION_UNKNOWN'), false);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('child of a parent without a writer still fails WITHOUT_WRITER', () => {
  const journeys = [{
    journeyId: 'lookup',
    business: {
      actorRef: 'caixa',
      steps: [{ stepId: 'locate', kind: 'locate', entity: 'Parent' }],
    },
  }];
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Fees',
    entities: [
      {
        entityId: 'Parent',
        title: 'Parent',
        description: 'Parent record.',
        kind: 'core',
        party: 'none',
        displayField: 'id',
        storage: { target: 'moduleDatabase', scope: 'module', idField: 'id' },
      },
      {
        entityId: 'Child',
        title: 'Child',
        description: 'Child record.',
        kind: 'supporting',
        party: 'none',
        displayField: 'name',
        storage: { target: 'moduleDatabase', scope: 'module', idField: 'id' },
      },
    ],
    relationships: [{
      relationshipId: 'childParent',
      fromEntity: 'Child',
      toEntity: 'Parent',
      type: 'manyToOne',
      required: true,
      description: 'Each child belongs to a parent.',
      persistence: { mode: 'moduleReference' },
    }],
  }, 'fees', journeys);
  assert.equal(ns5ResolveEntityWriter(plan.entities[1], plan, journeys).kind, 'none');
  const detail: Ns5OntologyEntityDraft = {
    entityId: 'Child',
    fields: [
      { fieldId: 'id', title: 'Id', type: 'uuid', required: true, description: 'Id.' },
      { fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Name.' },
      { fieldId: 'parentId', title: 'Parent', type: 'uuid', required: true, description: 'Parent.' },
    ],
    lifecycleStates: [],
    transitions: [],
  };
  const gate = validateNs5OntologyEntity(plan, detail, {
    moduleName: 'fees',
    actors: [{ actorId: 'caixa', kind: 'internal', origin: 'named', title: 'Cashier', description: 'Looks up.' }],
    journeys,
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER' && /Child/.test(issue.message)));
});
