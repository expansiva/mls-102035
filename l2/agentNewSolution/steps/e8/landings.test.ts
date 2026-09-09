/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e8/landings.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { compileNs4AccessBindings, ns4DisclosureProjectionId, type Ns4E4BProposal } from '/_102035_/l2/agentNewSolution/steps/e4b/contracts.js';
import type { Ns4E8Sources } from '/_102035_/l2/agentNewSolution/steps/e8/contracts.js';
import { validateNs4E8Model } from '/_102035_/l2/agentNewSolution/steps/e8/modelGate.js';
import type { Ns4E8Landing, Ns4E8ModelWorkspace } from '/_102035_/l2/agentNewSolution/steps/e8/model.js';
import { buildLandings, deriveNs4E8Model } from '/_102035_/l2/agentNewSolution/steps/e8/tiers.js';

const HERE = new URL('.', import.meta.url);

function place(
  over: Pick<Ns4E8ModelWorkspace, 'workspaceId' | 'tier' | 'profileRefs'> & Partial<Ns4E8ModelWorkspace>,
): Ns4E8ModelWorkspace {
  return {
    title: over.workspaceId,
    purpose: over.workspaceId,
    kind: over.tier === 'hub' || over.tier === 'projection' || over.tier === 'contentPage' ? 'landing'
      : over.tier === 'journey' ? 'operation' : 'record',
    entity: 'Thing',
    actors: over.profileRefs,
    featureRefs: [],
    hostedStepRefs: [],
    categoryRef: 'entityRecordManagement',
    bffCalls: [],
    sections: [],
    ...over,
  };
}

function landingSources(
  profiles: Array<{ profileId: string; actorRefs?: string[]; landingIntent?: string }>,
  journeys: Array<{ journeyId: string; actorRef: string; stepId: string }> = [],
): Ns4E8Sources {
  return {
    access: {
      profiles: profiles.map(profile => ({
        profileId: profile.profileId,
        title: profile.profileId,
        kind: 'internal',
        description: profile.profileId,
        actorRefs: profile.actorRefs || [profile.profileId],
        landingIntent: profile.landingIntent || '',
      })),
    },
    journeys: {
      journeys: journeys.map(journey => ({
        journeyId: journey.journeyId,
        business: {
          actorRef: journey.actorRef,
          title: journey.journeyId,
          goal: journey.journeyId,
          entry: { mode: 'coldStart' },
          steps: [{ stepId: journey.stepId, kind: 'inspect', entity: 'Thing' }],
        },
      })),
    },
  } as unknown as Ns4E8Sources;
}

function byProfile(landings: Ns4E8Landing[]): Record<string, Ns4E8Landing> {
  return Object.fromEntries(landings.map(landing => [landing.profileRef, landing]));
}

test('ce01-like: exclusive projection of the second profile; the first falls to rank hub', () => {
  const workspaces = [
    place({ workspaceId: 'appointmentCatalogue', tier: 'recordCatalogue', profileRefs: ['profissional', 'recepcionista'] }),
    place({ workspaceId: 'dailyAgendaView', tier: 'projection', profileRefs: ['profissional'] }),
    place({ workspaceId: 'professionalHub', tier: 'hub', profileRefs: ['profissional', 'recepcionista'] }),
  ];
  const landings = byProfile(buildLandings(workspaces, landingSources([
    { profileId: 'recepcionista', landingIntent: 'the reception desk home' },
    { profileId: 'profissional', landingIntent: 'the clinic hub' },
  ])));
  assert.deepEqual(landings.profissional, { profileRef: 'profissional', workspaceId: 'dailyAgendaView', reason: 'exclusive' });
  assert.deepEqual(landings.recepcionista, { profileRef: 'recepcionista', workspaceId: 'professionalHub', reason: 'rank' });
});

test('ce10-like: exclusive panel of gerencia among three profiles', () => {
  const workspaces = [
    place({ workspaceId: 'alunoCatalogue', tier: 'recordCatalogue', profileRefs: ['recepcao', 'gerencia'] }),
    place({ workspaceId: 'alunoHub', tier: 'hub', profileRefs: ['recepcao', 'gerencia', 'aluno'] }),
    place({ workspaceId: 'painelGerencialMensalView', tier: 'projection', profileRefs: ['gerencia'] }),
  ];
  const landings = byProfile(buildLandings(workspaces, landingSources([
    { profileId: 'recepcao' },
    { profileId: 'gerencia' },
    { profileId: 'aluno' },
  ])));
  assert.deepEqual(landings.gerencia, { profileRef: 'gerencia', workspaceId: 'painelGerencialMensalView', reason: 'exclusive' });
  assert.deepEqual(landings.recepcao, { profileRef: 'recepcao', workspaceId: 'alunoHub', reason: 'rank' });
  assert.deepEqual(landings.aluno, { profileRef: 'aluno', workspaceId: 'alunoHub', reason: 'rank' });
});

test('ce05-like: external profile with only a journey lands on firstJourney', () => {
  const workspaces = [
    place({ workspaceId: 'ordenServicioCatalogue', tier: 'recordCatalogue', profileRefs: ['recepcionista', 'tecnico'] }),
    place({ workspaceId: 'ordenServicioHub', tier: 'hub', profileRefs: ['recepcionista', 'tecnico'] }),
    place({
      workspaceId: 'consultarMisOrdenes', tier: 'journey', profileRefs: ['cliente'],
      hostedStepRefs: ['consultarMisOrdenes.inspectOrden'],
    }),
  ];
  const landings = byProfile(buildLandings(workspaces, landingSources(
    [{ profileId: 'recepcionista' }, { profileId: 'tecnico' }, { profileId: 'cliente' }],
    [{ journeyId: 'consultarMisOrdenes', actorRef: 'cliente', stepId: 'inspectOrden' }],
  )));
  assert.deepEqual(landings.cliente, { profileRef: 'cliente', workspaceId: 'consultarMisOrdenes', reason: 'firstJourney' });
  assert.equal(landings.recepcionista.reason, 'rank');
  assert.equal(landings.tecnico.reason, 'rank');
});

test('when nothing is exclusive and there is no journey host, only rank remains', () => {
  const workspaces = [
    place({ workspaceId: 'itemCatalogue', tier: 'recordCatalogue', profileRefs: ['clerk', 'manager'] }),
    place({ workspaceId: 'itemHub', tier: 'hub', profileRefs: ['clerk', 'manager'] }),
  ];
  const landings = byProfile(buildLandings(workspaces, landingSources([
    { profileId: 'clerk' },
    { profileId: 'manager' },
  ])));
  assert.deepEqual(landings.clerk, { profileRef: 'clerk', workspaceId: 'itemHub', reason: 'rank' });
  assert.deepEqual(landings.manager, { profileRef: 'manager', workspaceId: 'itemHub', reason: 'rank' });
});

test('exclusive wins over firstJourney and over a shared hub', () => {
  const workspaces = [
    place({ workspaceId: 'dailyAgendaView', tier: 'projection', profileRefs: ['profissional'] }),
    place({ workspaceId: 'professionalHub', tier: 'hub', profileRefs: ['profissional', 'recepcionista'] }),
    place({
      workspaceId: 'seeOwnDay', tier: 'journey', profileRefs: ['profissional'],
      hostedStepRefs: ['seeOwnDay.inspectAgenda'],
    }),
  ];
  const [landing] = buildLandings(workspaces, landingSources(
    [{ profileId: 'profissional' }],
    [{ journeyId: 'seeOwnDay', actorRef: 'profissional', stepId: 'inspectAgenda' }],
  ));
  assert.deepEqual(landing, { profileRef: 'profissional', workspaceId: 'dailyAgendaView', reason: 'exclusive' });
});

test('exclusive among several singleton places prefers tierRank then id', () => {
  const workspaces = [
    place({ workspaceId: 'zetaCatalogue', tier: 'recordCatalogue', profileRefs: ['clerk'] }),
    place({ workspaceId: 'alphaCatalogue', tier: 'recordCatalogue', profileRefs: ['clerk'] }),
    place({ workspaceId: 'clerkHub', tier: 'hub', profileRefs: ['clerk'] }),
  ];
  const [landing] = buildLandings(workspaces, landingSources([{ profileId: 'clerk' }]));
  assert.deepEqual(landing, { profileRef: 'clerk', workspaceId: 'clerkHub', reason: 'exclusive' });
});

test('a profile with a workspace and no landing is NS4_E8_PROFILE_WITHOUT_LANDING', () => {
  const todo = JSON.parse(readFileSync(new URL('fixtures/todo-e8-sources.json', HERE), 'utf8'));
  const sources = {
    journeys: todo.journeys, access: todo.access, ontology: todo.ontology,
    useCases: todo.useCases, workflows: todo.workflows,
  } as Ns4E8Sources;
  const model = deriveNs4E8Model(sources);
  assert.ok(model.landings.length);
  const stripped = { ...model, landings: [] };
  const gate = validateNs4E8Model(stripped, sources);
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_PROFILE_WITHOUT_LANDING');
  assert.equal(hit.length, 1, gate.issues.map(issue => issue.code).join(','));
  assert.match(hit[0].message, /taskManager/);
  assert.notEqual(hit[0].severity, 'warning');
  assert.equal(validateNs4E8Model(model, sources).issues.some(issue => issue.code === 'NS4_E8_PROFILE_WITHOUT_LANDING'), false);
});

test('a profile with no workspace is not this gate (n12 owns that case)', () => {
  const todo = JSON.parse(readFileSync(new URL('fixtures/todo-e8-sources.json', HERE), 'utf8'));
  const sources = {
    journeys: todo.journeys,
    access: {
      ...todo.access,
      profiles: [
        ...todo.access.profiles,
        { profileId: 'ghost', title: 'Ghost', kind: 'internal', description: '', actorRefs: [], landingIntent: '' },
      ],
    },
    ontology: todo.ontology, useCases: todo.useCases, workflows: todo.workflows,
  } as Ns4E8Sources;
  const model = deriveNs4E8Model(sources);
  const gate = validateNs4E8Model(model, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_PROFILE_WITHOUT_LANDING' && issue.message.includes('ghost')), false);
});

const ce05 = JSON.parse(readFileSync(new URL('../e4b/fixtures/ce05-like.json', HERE), 'utf8'));

function ce05DisclosureProposal(): Ns4E4BProposal {
  return {
    profileRef: 'cliente', authorityRef: 'svc:own-orders', entityRef: 'OrdenServicio', hops: [],
    projection: { fields: ['ordenServicioId', 'clienteId', 'estado'], excludedFields: ['costoInterno'] },
  };
}

test('ce05-like derived model: cliente firstJourney is consultarMisOrdenes', async () => {
  const compiled = await compileNs4AccessBindings({
    moduleName: ce05.moduleName, access: ce05.access, ontology: ce05.ontology, journeys: ce05.journeys,
    accessHash: ce05.accessHash, ontologyHash: ce05.ontologyHash, rules: ce05.rules,
  }, [ce05DisclosureProposal()]);
  const input = {
    journeys: {
      ...ce05.journeys, features: [], userLanguage: 'es', planId: 'e2-review', title: 'J', reviewRound: 1,
      journeys: ce05.journeys.journeys.map((journey: any) => ({
        ...journey,
        business: {
          ...journey.business, title: journey.journeyId, goal: journey.journeyId,
          steps: journey.business.steps.map((step: any) => ({
            ...step, title: step.stepId, description: step.stepId, featureRefs: [],
          })),
        },
      })),
    },
    access: { ...ce05.access, planId: 'e3-access-review', title: 'A', reviewRound: 1, changeSummary: [] },
    ontology: {
      ...ce05.ontology, planId: 'e4-ontology-review', title: 'O', reviewRound: 1, userLanguage: 'es', changeSummary: [],
      entities: ce05.ontology.entities.map((entity: any) => ({
        ...entity, description: entity.title, ownership: entity.ownership || 'moduleOwned',
        sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: [] },
        lifecycleStates: entity.lifecycleStates || [], lifecyclePredicates: entity.lifecyclePredicates || [],
        useRules: entity.useRules || [],
      })),
    },
    useCases: ce05.useCases,
    workflows: [],
    accessBindings: compiled.artifact,
    disclosureProjections: compiled.projections,
  } as unknown as Ns4E8Sources;
  const model = deriveNs4E8Model(input);
  const cliente = model.landings.find(landing => landing.profileRef === 'cliente');
  assert.ok(cliente, model.landings.map(landing => `${landing.profileRef}:${landing.workspaceId}:${landing.reason}`).join(','));
  assert.equal(cliente!.reason, 'firstJourney');
  assert.equal(cliente!.workspaceId, 'consultarMisOrdenes');
  const workspace = model.workspaces.find(item => item.workspaceId === cliente!.workspaceId);
  assert.equal(workspace?.tier, 'journey');
  assert.ok(model.operations.some(operation => operation.entityRef === ns4DisclosureProjectionId('OrdenServicio', 'cliente')));
});

test('buildLandings and the landing gate stay English; landingIntent is not read', () => {
  const files = [
    readFileSync(new URL('tiers.ts', HERE), 'utf8'),
    readFileSync(new URL('model.ts', HERE), 'utf8'),
    readFileSync(new URL('modelGate.ts', HERE), 'utf8'),
    readFileSync(new URL('landings.test.ts', HERE), 'utf8'),
  ];
  assert.doesNotMatch(files[0], /\.landingIntent/);
  for (const source of files) {
    assert.doesNotMatch(source, /portuguese\s*\?/);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
      if (!isComment) continue;
      assert.doesNotMatch(line, /[À-ÿ]/, trimmed);
    }
  }
});
