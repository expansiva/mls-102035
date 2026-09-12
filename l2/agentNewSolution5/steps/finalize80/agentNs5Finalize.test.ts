/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/finalize80/agentNs5Finalize.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102035_/l2/agentNewSolution5/agentNewSolution5.js';
import { markNs5Complete, nextNs5RunNn } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { NS5_STEP_HOOKS } from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import { loadNs5Defs, loadNs5FixtureJson, loadNs5OracleSources } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import { buildSolutionRegistryModuleBlock } from '/_102035_/l2/solution/lib.js';
import type {
  Ns5AccessArtifact,
  Ns5JourneyArtifact,
  Ns5OntologyEntityArtifact,
} from '/_102035_/l2/solution/types.js';
import { collectNs5LifecycleSignal } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  ensureConfigListsModule,
  NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION,
  NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF,
  NS5_FINALIZE_I7_ORPHAN_FILE,
  NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION,
  type Ns5OracleSources,
} from '/_102035_/l2/agentNewSolution5/steps/finalize80/contracts.js';
import { afterNs5FinalizePromptStep, beforeNs5FinalizePromptStep } from '/_102035_/l2/agentNewSolution5/steps/finalize80/agentNs5Finalize.js';
import { runNs5Oracle } from '/_102035_/l2/agentNewSolution5/steps/finalize80/gate.js';
import { ns5DefsOrphans } from '/_102035_/l2/solution/fs.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadSources(name: 'comandaRestaurante.json' | 'ordenServicio.json'): Ns5OracleSources {
  return loadNs5OracleSources(name === 'comandaRestaurante.json' ? 'comandaRestaurante5' : 'ordenServicio5');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withLiftedPainel(sources: Ns5OracleSources): Ns5OracleSources {
  const journey = clone(loadNs5Defs<Ns5JourneyArtifact>(
    'steps/finalize80/fixtures',
    'acompanharIndicadoresDaAcademia.defs.ts',
  ));
  const pipeline = loadNs5FixtureJson<{ liftedAggregateEntities: string[] }>(
    'steps/finalize80/fixtures',
    'mensalidadesAcademia-ontology30-pipeline.json',
  );
  const details = loadNs5FixtureJson<Record<string, string>>(
    'steps/finalize80/fixtures',
    'mensalidadesAcademia-module.details.json',
  );
  journey.business.actorRef = sources.access.actors[0].actorId;
  sources.journeys.push(journey);
  sources.journeyIndex.journeys.push({
    journeyId: journey.journeyId,
    actorRef: journey.business.actorRef,
    title: journey.business.title,
  });
  sources.liftedAggregateEntities = pipeline.liftedAggregateEntities;
  sources.module.details = details;
  return sources;
}

function withAcademiaEnrollment(
  sources: Ns5OracleSources,
  personStep: 'locate' | 'act',
): Ns5OracleSources {
  const aluno = clone(loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/finalize80/fixtures',
    'Aluno.defs.ts',
  ));
  const journey = clone(loadNs5Defs<Ns5JourneyArtifact>(
    'steps/finalize80/fixtures',
    'matricularAlunoEmPlano.defs.ts',
  ));
  const mesa = sources.entities.find(entity => entity.entityId === 'Mesa')!;
  const comanda = sources.entities.find(entity => entity.entityId === 'Comanda')!;
  const plano: Ns5OntologyEntityArtifact = {
    ...clone(mesa),
    entityId: 'Plano',
    party: 'none',
    mdmSubtype: 'Product',
    storage: { ...clone(mesa.storage), mdmType: 'mensalidadesAcademia.Plano' },
  };
  const matricula: Ns5OntologyEntityArtifact = {
    ...clone(comanda),
    entityId: 'Matricula',
    party: 'none',
    lifecycleStates: [],
    transitions: [],
  };
  const actor = sources.access.actors.find(item => item.kind === 'internal')!;
  journey.business.actorRef = actor.actorId;
  const locate = journey.business.steps.find(step => step.stepId === 'localizarOuCadastrarAluno');
  if (locate) locate.kind = personStep;
  sources.entities.push(aluno, plano, matricula);
  sources.ontologyIndex.entities.push('Aluno', 'Plano', 'Matricula');
  sources.journeys.push(journey);
  sources.journeyIndex.journeys.push({
    journeyId: journey.journeyId,
    actorRef: journey.business.actorRef,
    title: journey.business.title,
  });
  sources.access.grants.push({
    grantId: 'alunoCancelarPropriaMatricula',
    actorRef: sources.access.actors[0].actorId,
    title: sources.access.grants[0]?.title || 'Own student',
    description: sources.access.grants[0]?.description || 'Own student record.',
    entityRefs: ['Aluno'],
    dataScope: { mode: 'own', anchorEntity: 'Aluno', description: 'Own student record.' },
    disclosure: { mode: 'fullRecord', description: 'The student record.' },
  });
  return sources;
}

/** Live enrollment: `matricularAluno` + grant `alunoCancelaPropriaMatricula` (own, anchor Aluno). */
function withRealMatricularAluno(
  sources: Ns5OracleSources,
  affects?: string[],
): Ns5OracleSources {
  const aluno = clone(loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/finalize80/fixtures',
    'Aluno.defs.ts',
  ));
  const journey = clone(loadNs5Defs<Ns5JourneyArtifact>(
    'steps/finalize80/fixtures',
    'matricularAluno.defs.ts',
  ));
  const access = clone(loadNs5Defs<Ns5AccessArtifact>(
    'steps/finalize80/fixtures',
    'mensalidadesAcademia-access.defs.ts',
  ));
  const mesa = sources.entities.find(entity => entity.entityId === 'Mesa')!;
  const comanda = sources.entities.find(entity => entity.entityId === 'Comanda')!;
  const plano: Ns5OntologyEntityArtifact = {
    ...clone(mesa),
    entityId: 'Plano',
    party: 'none',
    mdmSubtype: 'Product',
    storage: { ...clone(mesa.storage), mdmType: 'mensalidadesAcademia.Plano' },
  };
  const matricula: Ns5OntologyEntityArtifact = {
    ...clone(comanda),
    entityId: 'Matricula',
    party: 'none',
    lifecycleStates: [],
    transitions: [],
  };
  const actor = sources.access.actors.find(item => item.kind === 'internal')!;
  journey.business.actorRef = actor.actorId;
  const registrar = journey.business.steps.find(step => step.stepId === 'registrarMatricula');
  if (registrar && affects !== undefined) registrar.affects = affects;
  sources.entities.push(aluno, plano, matricula);
  sources.ontologyIndex.entities.push('Aluno', 'Plano', 'Matricula');
  sources.journeys.push(journey);
  sources.journeyIndex.journeys.push({
    journeyId: journey.journeyId,
    actorRef: journey.business.actorRef,
    title: journey.business.title,
  });
  const grant = access.grants.find(item => item.grantId === 'alunoCancelaPropriaMatricula')!;
  sources.access.grants.push({
    ...grant,
    actorRef: sources.access.actors[0].actorId,
  });
  return sources;
}

/** Live clinic: `Profissional` crud + grant `recepcionistaGerirProfissionais` (I8 form b). */
function withAgendaClinicaProfissional(sources: Ns5OracleSources): Ns5OracleSources {
  const profissional = clone(loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/finalize80/fixtures',
    'Profissional.defs.ts',
  ));
  const access = clone(loadNs5Defs<Ns5AccessArtifact>(
    'steps/finalize80/fixtures',
    'agendaClinica-access.defs.ts',
  ));
  const internal = sources.access.actors.find(item => item.kind === 'internal')!;
  const own = access.grants.find(item => item.grantId === 'profissionalConsultarEatenderPropriasConsultas')!;
  const crudGrant = access.grants.find(item => item.grantId === 'recepcionistaGerirProfissionais')!;
  sources.entities.push(profissional);
  sources.ontologyIndex.entities.push('Profissional');
  sources.access.grants.push(
    { ...own, actorRef: internal.actorId },
    { ...crudGrant, actorRef: internal.actorId },
  );
  return sources;
}

/** Live event: `Participant` + public own grant + organizer grant covering Participant. */
function withInscricaoEventoParticipant(
  sources: Ns5OracleSources,
  opts?: { crud?: boolean; publicAffects?: string[] },
): Ns5OracleSources {
  const participant = clone(loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/finalize80/fixtures',
    'Participant.defs.ts',
  ));
  if (opts?.crud === false) delete participant.maintenance;
  const access = clone(loadNs5Defs<Ns5AccessArtifact>(
    'steps/finalize80/fixtures',
    'inscricaoEvento-access.defs.ts',
  ));
  const journey = clone(loadNs5Defs<Ns5JourneyArtifact>(
    'steps/finalize80/fixtures',
    'realizarInscricaoNoEvento.defs.ts',
  ));
  const internal = sources.access.actors.find(item => item.kind === 'internal')!;
  const publico = access.actors.find(item => item.actorId === 'publico')!;
  const own = access.grants.find(item => item.grantId === 'publicoGerenciaPropriaInscricao')!;
  const covering = access.grants.find(item => item.grantId === 'organizadorAcompanhaInscricoes')!;
  if (opts?.publicAffects !== undefined) {
    const registrar = journey.business.steps.find(step => step.stepId === 'registrarInscricao');
    if (registrar) registrar.affects = opts.publicAffects;
  }
  sources.access.actors.push(publico);
  sources.entities.push(participant);
  sources.ontologyIndex.entities.push('Participant');
  sources.journeys.push(journey);
  sources.journeyIndex.journeys.push({
    journeyId: journey.journeyId,
    actorRef: journey.business.actorRef,
    title: journey.business.title,
  });
  sources.access.grants.push(
    { ...own, actorRef: 'publico' },
    { ...covering, actorRef: internal.actorId },
  );
  return sources;
}

function i8Errors(report: { errors: Array<{ checkId: string; code: string; message: string }> }) {
  return report.errors.filter(issue => issue.code === NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION);
}

void test('I7 fails on the captured comandaRestaurante5 disk (19 journeys / index 4) and passes after reconcile', () => {
  const before = JSON.parse(
    readFileSync(path.join(HERE, 'fixtures/comandaRestaurante5-disk-before.json'), 'utf8'),
  ) as { journeys: string[]; ontology: string[] };
  const sources = clone(loadSources('comandaRestaurante.json'));
  assert.equal(before.journeys.filter(name => name !== 'index').length, 19);
  assert.equal(sources.journeyIndex.journeys.length, 4);
  const failing = runNs5Oracle({
    ...sources,
    journeyDiskFiles: before.journeys,
    ontologyDiskFiles: before.ontology,
  });
  assert.equal(failing.finalStatus, 'failed');
  const i7 = failing.errors.filter(issue => issue.code === NS5_FINALIZE_I7_ORPHAN_FILE);
  assert.ok(i7.some(issue => issue.path === 'journeys/' && /abrirComandaMesa/.test(issue.message)));
  assert.ok(i7.some(issue => issue.path === 'ontology/' && /Cardapio/.test(issue.message)));
  const afterJourneys = [
    'index',
    ...sources.journeyIndex.journeys.map(entry => entry.journeyId),
  ];
  const afterOntology = ['index', ...sources.ontologyIndex.entities];
  assert.deepEqual(
    ns5DefsOrphans(before.journeys, sources.journeyIndex.journeys.map(entry => entry.journeyId)).length,
    15,
  );
  const passing = runNs5Oracle({
    ...sources,
    journeyDiskFiles: afterJourneys,
    ontologyDiskFiles: afterOntology,
  });
  assert.equal(passing.finalStatus, 'passed', passing.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'));
  assert.equal(passing.errors.filter(issue => issue.checkId === 'I7').length, 0);
  assert.equal(passing.checks.find(check => check.checkId === 'I7')?.status, 'passed');
});

void test('real comandaRestaurante5 sources pass I1–I10; I2 warns on acts without transitionRef', () => {
  const report = runNs5Oracle(loadSources('comandaRestaurante.json'));
  assert.equal(report.finalStatus, 'passed', report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(report.errors.length, 0);
  assert.ok(report.warnings.length > 0);
  assert.ok(report.warnings.every(issue => issue.code === NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF));
  assert.equal(report.checks.find(check => check.checkId === 'I2')?.status, 'warned');
  assert.ok(report.checks.filter(check => check.checkId !== 'I2').every(check => check.status === 'passed'));
  assert.equal(report.checks.find(check => check.checkId === 'I8')?.status, 'passed');
  assert.equal(report.checks.find(check => check.checkId === 'I9')?.status, 'passed');
  assert.equal(report.checks.find(check => check.checkId === 'I10')?.status, 'passed');
});

void test('real ordenServicio5 sources pass I1–I10: Cliente in capturarDatosRecepcion.affects is an internal write', () => {
  const sources = loadSources('ordenServicio.json');
  const reception = sources.journeys.find(journey => journey.journeyId === 'registrarRecepcionAparato')!;
  assert.equal(reception.business.steps[0].entity, 'OrdenServicio');
  assert.ok(reception.business.steps[0].affects?.includes('Cliente'));
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'passed', report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(report.errors.length, 0);
  assert.ok(report.warnings.every(issue => issue.code === NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF));
  assert.equal(report.checks.find(check => check.checkId === 'I8')?.status, 'passed');
});

void test('I1 fails when a journey step names an unknown entity', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  sources.journeys[0].business.steps[0].entity = 'Ghost';
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I1' && /Ghost/.test(issue.message)));
});

void test('I1 accepts PainelGerencial when ontology30 lifted it into module.details', () => {
  const sources = withLiftedPainel(clone(loadSources('comandaRestaurante.json')));
  const report = runNs5Oracle(sources);
  assert.equal(
    report.errors.filter(issue => issue.checkId === 'I1' && /PainelGerencial/.test(issue.message)).length,
    0,
    report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'),
  );
  sources.journeys[0].business.steps[0].affects = ['PainelGerencial'];
  const withAffects = runNs5Oracle(sources);
  assert.equal(
    withAffects.errors.filter(issue => issue.checkId === 'I1' && /PainelGerencial/.test(issue.message)).length,
    0,
    withAffects.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'),
  );
});

void test('I1 still fails an unknown entity that was not lifted', () => {
  const sources = withLiftedPainel(clone(loadSources('comandaRestaurante.json')));
  sources.journeys[0].business.steps[0].entity = 'Ghost';
  const report = runNs5Oracle(sources);
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I1' && /Ghost/.test(issue.message)));
});

void test('I1 still fails a lifted id when module.details has no keys', () => {
  const sources = withLiftedPainel(clone(loadSources('comandaRestaurante.json')));
  delete sources.module.details;
  const report = runNs5Oracle(sources);
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I1' && /PainelGerencial/.test(issue.message)));
});

void test('I1 still fails PainelGerencial when it was not recorded as lifted', () => {
  const sources = withLiftedPainel(clone(loadSources('comandaRestaurante.json')));
  sources.liftedAggregateEntities = [];
  const report = runNs5Oracle(sources);
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I1' && /PainelGerencial/.test(issue.message)));
});

void test('loadSources reads ontology30 liftedAggregateEntities from pipeline.json', () => {
  const source = readFileSync(path.join(HERE, 'agentNs5Finalize.ts'), 'utf8');
  const load = source.slice(source.indexOf('async function loadSources'));
  assert.match(load, /liftedAggregateEntities/);
  assert.match(load, /ontology30/);
});

void test('I2 uses ontology30 collectNs5LifecycleSignal without changing messages', () => {
  const sources = loadSources('comandaRestaurante.json');
  assert.equal(collectNs5LifecycleSignal(sources.journeys, 'Comanda').requiresTransitions, true);
  assert.equal(collectNs5LifecycleSignal(sources.journeys, 'ItemComanda').requiresTransitions, true);
  const report = runNs5Oracle(sources);
  assert.equal(report.errors.filter(issue => issue.code === 'NS5_FINALIZE_I2').length, 0);
});

void test('I2 warns when an act on a lifecycle entity omits transitionRef', () => {
  const sources = loadSources('comandaRestaurante.json');
  const report = runNs5Oracle(sources);
  assert.equal(report.errors.filter(issue => issue.checkId === 'I2').length, 0);
  assert.ok(report.warnings.some(issue =>
    issue.code === NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF && /fecharComanda/.test(issue.message + issue.path),
  ));
});

void test('I2 fails a decide without two transitions from the same origin (task_6da10605 shape)', () => {
  const sources = clone(loadSources('ordenServicio.json'));
  const quote = sources.entities.find(entity => entity.entityId === 'Presupuesto')!;
  quote.lifecycleStates = [];
  quote.transitions = [];
  quote.mutability = 'appendOnly';
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I2'), report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  const decide = report.errors.find(issue => /decidirRespuestaPresupuesto/.test(issue.message));
  assert.ok(decide, report.errors.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  assert.match(decide.message, /two transitions from the same origin state/);
});

void test('I2 does not apply to consultarMisOrdenes when it is locate then inspect', () => {
  const sources = clone(loadSources('ordenServicio.json'));
  const consult = loadNs5Defs<Ns5JourneyArtifact>('steps/finalize80/fixtures', 'consultarMisOrdenes.defs.ts');
  assert.equal(consult.business.steps.some(step => step.kind === 'act' || step.kind === 'decide'), false);
  sources.journeys.push(consult);
  sources.journeyIndex.journeys.push({
    journeyId: consult.journeyId,
    actorRef: consult.business.actorRef,
    title: consult.business.title,
  });
  const report = runNs5Oracle(sources);
  assert.equal(report.errors.filter(issue => issue.checkId === 'I2').length, 0, report.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'));
});

function levaDefs<T>(name: string): T {
  return loadNs5Defs<T>('steps/finalize80/fixtures/leva', name);
}

function withStepIntent(
  journey: Ns5JourneyArtifact,
  stepId: string,
  patch: { creates?: true; transitionRef?: string },
): Ns5JourneyArtifact {
  const next = clone(journey);
  const step = next.business.steps.find(item => item.stepId === stepId);
  if (!step) throw new Error(`missing step ${stepId}`);
  Object.assign(step, patch);
  return next;
}

function i2OnlySources(
  moduleName: string,
  journeys: Ns5JourneyArtifact[],
  entities: Ns5OntologyEntityArtifact[],
): Ns5OracleSources {
  const actors = new Set<string>();
  for (const journey of journeys) {
    if (journey.business.actorRef) actors.add(journey.business.actorRef);
  }
  for (const entity of entities) {
    for (const transition of entity.transitions) {
      if (!Array.isArray(transition.by)) continue;
      for (const actor of transition.by) if (actor) actors.add(actor);
    }
  }
  return {
    module: {
      schemaVersion: '2026-09-10-ns5-module-v2',
      moduleName,
      title: moduleName,
      userLanguage: 'pt',
      productLanguages: ['pt'],
      defaultLanguage: 'pt',
      sourcePrompt: moduleName,
    },
    journeys,
    journeyIndex: {
      schemaVersion: '2026-09-10-ns5-journey-v1',
      moduleName,
      journeys: journeys.map(journey => ({
        journeyId: journey.journeyId,
        actorRef: journey.business.actorRef,
        title: journey.business.title,
      })),
      systemDecisions: [],
    },
    entities,
    ontologyIndex: {
      schemaVersion: '2026-09-11-ns5-ontology-v2',
      moduleName,
      businessDomain: moduleName,
      entities: entities.map(entity => entity.entityId),
      relationships: [],
      systemDecisions: [],
    },
    rules: { schemaVersion: '2026-09-10-ns5-rules-v1', moduleName, rules: [] },
    workflows: { schemaVersion: '2026-09-10-ns5-workflows-v1', moduleName, processes: [] },
    access: {
      schemaVersion: '2026-09-12-ns5-access-v3',
      moduleName,
      actors: [...actors].map(actorId => ({
        actorId,
        kind: 'internal' as const,
        origin: 'named' as const,
        title: actorId,
        description: actorId,
      })),
      grants: [],
    },
    integration: {
      schemaVersion: '2026-09-10-ns5-integration-v1',
      moduleName,
      inbound: [],
      outbound: [],
      plugins: [],
    },
  };
}

function i2Issues(report: ReturnType<typeof runNs5Oracle>, bucket: 'errors' | 'warnings') {
  return report[bucket].filter(issue => issue.checkId === 'I2');
}

void test('I1 fails an unknown transitionRef; I2 ignores it', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const step = sources.journeys.flatMap(journey => journey.business.steps).find(item => item.kind === 'act');
  assert.ok(step);
  step.transitionRef = 'ghostTransition';
  const report = runNs5Oracle(sources);
  assert.ok(report.errors.some(issue => issue.checkId === 'I1' && /ghostTransition/.test(issue.message)));
  assert.equal(report.errors.filter(issue => issue.code === NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION).length, 0);
});

void test('I2 passes leva acts with hand-placed transitionRef or creates', () => {
  const orden = runNs5Oracle(i2OnlySources(
    'ordenServicio',
    [withStepIntent(levaDefs('entregarYfinalizarOrden.defs.ts'), 'registrarEntregaYfinalizacion', {
      transitionRef: 'registrarEntregaYfinalizacion',
    })],
    [levaDefs('OrdenServicio.defs.ts')],
  ));
  assert.equal(i2Issues(orden, 'errors').length, 0, i2Issues(orden, 'errors').map(issue => issue.message).join('\n'));

  const clinica = runNs5Oracle(i2OnlySources(
    'agendaClinica',
    [withStepIntent(levaDefs('registrarAtendimento.defs.ts'), 'registrarAtendimentoRealizado', {
      transitionRef: 'recordAppointmentAttendance',
    })],
    [levaDefs('Consulta.defs.ts')],
  ));
  assert.equal(i2Issues(clinica, 'errors').length, 0, i2Issues(clinica, 'errors').map(issue => issue.message).join('\n'));

  const reembolso = runNs5Oracle(i2OnlySources(
    'reembolsoDespesas',
    [
      withStepIntent(levaDefs('corrigirEreenviarDespesa.defs.ts'), 'reenviarParaAprovacao', {
        transitionRef: 'resubmitForApproval',
      }),
      withStepIntent(levaDefs('registrarPagamentoDeDespesa.defs.ts'), 'registrarDataDePagamento', {
        transitionRef: 'recordPayment',
      }),
    ],
    [levaDefs('Despesa.defs.ts')],
  ));
  assert.equal(i2Issues(reembolso, 'errors').length, 0, i2Issues(reembolso, 'errors').map(issue => issue.message).join('\n'));
  assert.ok(i2Issues(reembolso, 'warnings').some(issue =>
    issue.code === NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF && /corrigirDespesa/.test(issue.message),
  ));

  const frota = runNs5Oracle(i2OnlySources(
    'manutencaoFrota',
    [withStepIntent(levaDefs('tratarAlertaPreventivaVencida.defs.ts'), 'abrirOrdemPorAlerta', { creates: true })],
    [levaDefs('OrdemManutencao.defs.ts')],
  ));
  assert.equal(i2Issues(frota, 'errors').length, 0, i2Issues(frota, 'errors').map(issue => issue.message).join('\n'));
  assert.equal(i2Issues(frota, 'warnings').length, 0);

  const evento = runNs5Oracle(i2OnlySources(
    'inscricaoEvento',
    [levaDefs('acompanharEexportarInscricoes.defs.ts')],
    [levaDefs('Evento.defs.ts')],
  ));
  assert.equal(i2Issues(evento, 'errors').length, 0, i2Issues(evento, 'errors').map(issue => issue.message).join('\n'));
  assert.ok(i2Issues(evento, 'warnings').some(issue =>
    issue.code === NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF && /baixarListaCsv/.test(issue.message),
  ));
});

void test('I2 fails a transitionRef whose from is unreachable from source-SCC births', () => {
  const journey = withStepIntent(
    levaDefs('registrarPagamentoDeDespesa.defs.ts'),
    'registrarDataDePagamento',
    { transitionRef: 'recordPayment' },
  );
  const entity = clone(levaDefs<Ns5OntologyEntityArtifact>('Despesa.defs.ts'));
  entity.lifecycleStates = [...entity.lifecycleStates, { state: 'voided', reachedBy: 'time' }];
  const payment = entity.transitions.find(item => item.transitionId === 'recordPayment');
  assert.ok(payment);
  payment.from = ['voided'];
  const report = runNs5Oracle(i2OnlySources('reembolsoDespesas', [journey], [entity]));
  assert.ok(
    i2Issues(report, 'errors').some(issue =>
      issue.code === NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION && /registrarDataDePagamento/.test(issue.message),
    ),
    i2Issues(report, 'errors').map(issue => issue.message).join('\n'),
  );
});

void test('I3 fails when an actor has no grant', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  sources.access.grants = sources.access.grants.filter(grant => grant.actorRef !== 'caixa');
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I3' && /caixa/.test(issue.message)));
});

void test('I4 ignores an uncited rule and fails an unknown ruleRef on a transition', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  sources.rules.rules.push({
    ruleId: 'orphanHint',
    description: 'Not cited by any transition.',
  });
  const silent = runNs5Oracle(sources);
  assert.equal(silent.finalStatus, 'passed');
  assert.equal(silent.warnings.filter(issue => issue.checkId === 'I4').length, 0);
  const comanda = sources.entities.find(entity => entity.entityId === 'Comanda')!;
  comanda.transitions[0] = { ...comanda.transitions[0], ruleRefs: ['ghostRule'] };
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I4' && /ghostRule/.test(issue.message)));
});

void test('I8 passes live matricularAluno + access (registrarMatricula affects Aluno)', () => {
  const journey = loadNs5Defs<Ns5JourneyArtifact>(
    'steps/finalize80/fixtures',
    'matricularAluno.defs.ts',
  );
  const access = loadNs5Defs<Ns5AccessArtifact>(
    'steps/finalize80/fixtures',
    'mensalidadesAcademia-access.defs.ts',
  );
  assert.equal(journey.business.actorRef, 'recepcao');
  const registrar = journey.business.steps.find(step => step.stepId === 'registrarMatricula');
  assert.equal(registrar?.kind, 'act');
  assert.equal(registrar?.entity, 'Matricula');
  assert.deepEqual(registrar?.affects, ['Aluno']);
  const grant = access.grants.find(item => item.grantId === 'alunoCancelaPropriaMatricula');
  assert.equal(grant?.dataScope.mode, 'own');
  assert.equal(grant?.dataScope.anchorEntity, 'Aluno');
  const report = runNs5Oracle(withRealMatricularAluno(clone(loadSources('comandaRestaurante.json'))));
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 fails the same matricularAluno journey when affects is empty', () => {
  const report = runNs5Oracle(withRealMatricularAluno(clone(loadSources('comandaRestaurante.json')), []));
  const i8 = i8Errors(report);
  assert.equal(i8.length, 1, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.match(i8[0].message, /Aluno/);
  assert.match(i8[0].message, /alunoCancelaPropriaMatricula/);
  assert.match(i8[0].message, /act entity or affects/);
  assert.match(i8[0].message, /maintenance: 'crud'/);
  assert.match(i8[0].message, /self-registration/);
});

void test('I8 passes when localizarOuCadastrarAluno is act Aluno', () => {
  const report = runNs5Oracle(withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'act'));
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 passes when a cadastrarAluno act Aluno is added beside the locate', () => {
  const sources = withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'locate');
  const journey = sources.journeys.find(item => item.journeyId === 'matricularAlunoEmPlano')!;
  const registrar = journey.business.steps.find(step => step.stepId === 'registrarMatricula');
  if (registrar) registrar.affects = [];
  journey.business.steps.unshift({
    stepId: 'cadastrarAluno',
    kind: 'act',
    entity: 'Aluno',
    title: 'Cadastrar aluno',
    description: 'A recepção cadastra a pessoa que vai logar.',
  });
  const report = runNs5Oracle(sources);
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 fails when only an external actor writes the login person', () => {
  const sources = withRealMatricularAluno(clone(loadSources('comandaRestaurante.json')), []);
  sources.access.actors.push({
    actorId: 'alunoExterno',
    kind: 'external',
    origin: 'inferred',
    title: 'Aluno',
    description: 'External student.',
  });
  const enroll = sources.journeys.find(item => item.journeyId === 'matricularAluno')!;
  sources.journeys.push({
    ...clone(enroll),
    journeyId: 'alunoTocaAluno',
    business: {
      ...clone(enroll.business),
      actorRef: 'alunoExterno',
      steps: [{
        stepId: 'cancelarPropria',
        kind: 'act',
        entity: 'Aluno',
        title: 'Cancel own enrollment',
        description: 'The student writes the person record.',
      }],
    },
  });
  const report = runNs5Oracle(sources);
  const i8 = i8Errors(report);
  assert.equal(i8.length, 1, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 also applies to related scope and ignores organization even with a stray person anchor', () => {
  const related = withRealMatricularAluno(clone(loadSources('comandaRestaurante.json')), []);
  related.access.grants[related.access.grants.length - 1].dataScope.mode = 'related';
  const relatedReport = runNs5Oracle(related);
  assert.equal(i8Errors(relatedReport).length, 1);
  const org = withRealMatricularAluno(clone(loadSources('comandaRestaurante.json')), []);
  org.access.grants[org.access.grants.length - 1].dataScope.mode = 'organization';
  const orgReport = runNs5Oracle(org);
  assert.equal(i8Errors(orgReport).length, 0, orgReport.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'));
});

void test('I8 on ordenServicio5 passes when the reception act is on Cliente', () => {
  const sources = clone(loadSources('ordenServicio.json'));
  const reception = sources.journeys.find(journey => journey.journeyId === 'registrarRecepcionAparato')!;
  reception.business.steps.unshift({
    stepId: 'cadastrarCliente',
    kind: 'act',
    entity: 'Cliente',
    title: 'Registrar al cliente',
    description: 'La recepción registra a la persona que va a entrar al portal.',
  });
  const report = runNs5Oracle(sources);
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 passes live agendaClinica Profissional (crud + recepcionistaGerirProfissionais)', () => {
  const profissional = loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/finalize80/fixtures',
    'Profissional.defs.ts',
  );
  const access = loadNs5Defs<Ns5AccessArtifact>(
    'steps/finalize80/fixtures',
    'agendaClinica-access.defs.ts',
  );
  assert.equal(profissional.maintenance, 'crud');
  assert.equal(profissional.party, 'person');
  const crudGrant = access.grants.find(item => item.grantId === 'recepcionistaGerirProfissionais');
  assert.equal(crudGrant?.actorRef, 'recepcionista');
  assert.deepEqual(crudGrant?.entityRefs, ['Profissional']);
  const own = access.grants.find(item => item.grantId === 'profissionalConsultarEatenderPropriasConsultas');
  assert.equal(own?.dataScope.mode, 'own');
  assert.equal(own?.dataScope.anchorEntity, 'Profissional');
  const sources = withAgendaClinicaProfissional(clone(loadSources('comandaRestaurante.json')));
  assert.equal(
    sources.journeys.some(journey =>
      journey.business.steps.some(step =>
        step.kind === 'act' && (step.entity === 'Profissional' || (step.affects || []).includes('Profissional')))),
    false,
  );
  const report = runNs5Oracle(sources);
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 passes live inscricaoEvento Participant (crud + organizador grant)', () => {
  const participant = loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/finalize80/fixtures',
    'Participant.defs.ts',
  );
  const access = loadNs5Defs<Ns5AccessArtifact>(
    'steps/finalize80/fixtures',
    'inscricaoEvento-access.defs.ts',
  );
  const journey = loadNs5Defs<Ns5JourneyArtifact>(
    'steps/finalize80/fixtures',
    'realizarInscricaoNoEvento.defs.ts',
  );
  assert.equal(participant.maintenance, 'crud');
  assert.equal(participant.party, 'person');
  const covering = access.grants.find(item => item.grantId === 'organizadorAcompanhaInscricoes');
  assert.ok(covering?.entityRefs.includes('Participant'));
  assert.equal(access.actors.find(item => item.actorId === covering?.actorRef)?.kind, 'internal');
  const own = access.grants.find(item => item.grantId === 'publicoGerenciaPropriaInscricao');
  assert.equal(own?.dataScope.mode, 'own');
  assert.equal(own?.dataScope.anchorEntity, 'Participant');
  assert.equal(journey.business.actorRef, 'publico');
  const registrar = journey.business.steps.find(step => step.stepId === 'registrarInscricao');
  assert.equal(registrar?.kind, 'act');
  assert.equal(registrar?.entity, 'Inscricao');
  assert.equal((registrar?.affects || []).includes('Participant'), false);
  const report = runNs5Oracle(withInscricaoEventoParticipant(clone(loadSources('comandaRestaurante.json'))));
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 passes when the public act affects Participant (self-registration, no crud)', () => {
  const report = runNs5Oracle(withInscricaoEventoParticipant(
    clone(loadSources('comandaRestaurante.json')),
    { crud: false, publicAffects: ['Participant'] },
  ));
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 fails inscricaoEvento without crud and without public affects on Participant', () => {
  const report = runNs5Oracle(withInscricaoEventoParticipant(
    clone(loadSources('comandaRestaurante.json')),
    { crud: false, publicAffects: [] },
  ));
  const i8 = i8Errors(report);
  assert.equal(i8.length, 1, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.match(i8[0].message, /Participant/);
  assert.match(i8[0].message, /publicoGerenciaPropriaInscricao/);
  assert.match(i8[0].message, /act entity or affects/);
  assert.match(i8[0].message, /maintenance: 'crud'/);
  assert.match(i8[0].message, /self-registration/);
});

void test('I5 fails an mdm entity without mdmSubtype', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const mesa = sources.entities.find(entity => entity.entityId === 'Mesa')!;
  delete mesa.mdmSubtype;
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I5' && /Mesa/.test(issue.message)));
});

void test('I5 fails an own grant whose non-mdm entity does not reach a person', () => {
  const sources = clone(loadSources('ordenServicio.json'));
  sources.ontologyIndex.relationships = [];
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I5' && /party:person/.test(issue.message)));
});

void test('I10 fails Plano without a writer; crud plus Aluno act passes; crud without internal grant fails', () => {
  const sources = withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'act');
  const plano = sources.entities.find(entity => entity.entityId === 'Plano')!;
  plano.fields = [
    { fieldId: 'periodicidade', title: 'Period', type: 'string', required: true, description: 'Period.' },
    { fieldId: 'valor', title: 'Price', type: 'money', required: true, description: 'Price.' },
    { fieldId: 'diaVencimento', title: 'Due day', type: 'integer', required: true, description: 'Due day.' },
  ];
  const withoutWriter = runNs5Oracle(sources);
  assert.ok(
    withoutWriter.errors.some(issue => issue.checkId === 'I10' && /Plano/.test(issue.message) && /writer/.test(issue.message)),
    withoutWriter.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'),
  );

  const viaAffects = clone(sources);
  const enroll = viaAffects.journeys.find(journey => journey.journeyId === 'matricularAlunoEmPlano');
  const act = enroll?.business.steps.find(step => step.kind === 'act');
  if (act) act.affects = [...(act.affects || []), 'Plano'];
  const affectsReport = runNs5Oracle(viaAffects);
  assert.equal(
    affectsReport.errors.filter(issue => issue.checkId === 'I10' && /Plano/.test(issue.message)).length,
    0,
    affectsReport.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'),
  );

  const withCrud = clone(sources);
  const crudPlano = withCrud.entities.find(entity => entity.entityId === 'Plano')!;
  crudPlano.maintenance = 'crud';
  crudPlano.fields = plano.fields;
  const internal = withCrud.access.actors.find(actor => actor.kind === 'internal')!;
  withCrud.access.grants.push({
    grantId: 'recepcaoPlanos',
    actorRef: internal.actorId,
    title: 'Plans',
    description: 'Plan catalog.',
    entityRefs: ['Plano'],
    dataScope: { mode: 'organization', description: 'All plans.' },
    disclosure: { mode: 'fullRecord', description: 'Plan catalog.' },
  });
  const passing = runNs5Oracle(withCrud);
  assert.equal(
    passing.errors.filter(issue => issue.checkId === 'I10').length,
    0,
    passing.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'),
  );

  const noGrant = clone(withCrud);
  noGrant.access.grants = noGrant.access.grants.filter(grant => !grant.entityRefs.includes('Plano'));
  const missingGrant = runNs5Oracle(noGrant);
  assert.ok(missingGrant.errors.some(issue => issue.checkId === 'I10' && /internal actor/.test(issue.message)));
});

void test('I9 fails uniqueKeys that cite an unknown field and passes a real composite key', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const comanda = sources.entities.find(entity => entity.entityId === 'Comanda')!;
  comanda.uniqueKeys = [['ghostField', 'status']];
  const failing = runNs5Oracle(sources);
  assert.equal(failing.finalStatus, 'failed');
  assert.ok(failing.errors.some(issue => issue.checkId === 'I9' && /ghostField/.test(issue.message)));

  const passingSources = clone(loadSources('comandaRestaurante.json'));
  const item = passingSources.entities.find(entity => entity.entityId === 'ItemComanda')!;
  item.uniqueKeys = [['comanda', 'itemCardapio']];
  const passing = runNs5Oracle(passingSources);
  assert.equal(passing.errors.filter(issue => issue.checkId === 'I9').length, 0, passing.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'));
});

void test('I6 warns when a handoff has no covering process', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const journey = sources.journeys[0];
  journey.business.steps.push({
    stepId: 'handToCashier',
    kind: 'handoff',
    entity: 'Comanda',
    handoffTo: 'caixa',
    title: 'Hand off',
    description: 'Pass the tab to the cashier.',
  });
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'passed');
  assert.ok(report.warnings.some(issue => issue.code === 'NS5_FINALIZE_I6' && /handToCashier/.test(issue.message)));
});

void test('registry module block maps mdmSubtype to <mod>.<Entity>', () => {
  const sources = loadSources('comandaRestaurante.json');
  const block = buildSolutionRegistryModuleBlock({
    moduleName: sources.module.moduleName,
    actors: sources.access.actors,
    entities: sources.entities,
    updatedAt: '2026-09-10T00:00:00.000Z',
  });
  assert.deepEqual(
    block.roles.map(role => `${role.mdmSubtype} <- ${role.role}`).sort(),
    ['Location <- comandaRestaurante5.Mesa', 'Product <- comandaRestaurante5.ItemCardapio'],
  );
  assert.deepEqual(block.actors.map(actor => actor.actorId), ['garcom', 'caixa']);
});

void test('ensureConfigListsModule writes moduleId without inventing navigation', () => {
  const config = ensureConfigListsModule({}, 'comandaRestaurante', 'pt-BR', 102047);
  const modules = config.modules as Array<{ moduleId: string; navigation: unknown[] }>;
  assert.equal(modules.length, 1);
  assert.equal(modules[0].moduleId, 'comandaRestaurante');
  assert.deepEqual(modules[0].navigation, []);
});

void test('nextNs5RunNn increments the newsolution5 slug', () => {
  assert.equal(nextNs5RunNn(['pipeline', 'finalize-report', 'run01_newsolution5']), '02');
  assert.equal(nextNs5RunNn(['run01_newsolution']), '01');
});

void test('markNs5Complete sets status complete and refuses a failed pipeline', () => {
  const now = '2026-09-10T12:00:00.000Z';
  const complete = markNs5Complete({
    schemaVersion: '2026-09-10-ns5-pipeline-v1',
    flowId: 'agentNewSolution5',
    moduleName: 'comandaRestaurante',
    status: 'inProgress',
    steps: {},
    sourcePrompt: 'x',
    invocation: { fast: true, module: 'comandaRestaurante', rebuildAll: false },
    updatedAt: now,
  }, now);
  assert.equal(complete.status, 'complete');
  assert.equal(complete.awaitingStep, undefined);
  const failed = markNs5Complete({ ...complete, status: 'failed' }, now);
  assert.equal(failed.status, 'failed');
});

void test('finalize80 is hooked and never mentions a CB/CF handoff', () => {
  assert.equal(typeof NS5_STEP_HOOKS.finalize80?.beforePromptStep, 'function');
  assert.equal(typeof NS5_STEP_HOOKS.finalize80?.afterPromptStep, 'function');
  const source = readFileSync(path.join(HERE, 'agentNs5Finalize.ts'), 'utf8');
  assert.doesNotMatch(source, /dispatchChangeBackendHandoff|agentChangeBackend|agentChangeFrontend|\/nochain/);
});

void test('afterPromptStep fails because finalize80 is deterministic', async () => {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentNewSolution5',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 80,
    interaction: { input: [], payload: [{ result: 'model reply' }] } as mls.msg.AIAgentStep['interaction'],
    stepTitle: 'Finalize',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentNewSolution5',
    prompt: JSON.stringify({ planId: 'finalize80', moduleName: 'comandaRestaurante' }),
    rags: [],
    planning: { planId: 'finalize80', dependsOn: ['integration70-done'], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { moduleName: 'comandaRestaurante' } } },
  } as mls.msg.ExecutionContext;
  const intents = await afterNs5FinalizePromptStep(
    { agentName: 'agentNewSolution5' } as IAgentMeta,
    context,
    root,
    step,
    1,
  );
  const status = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.ok(status);
  assert.equal(status.status, 'failed');
  assert.match(String(status.traceMsg || ''), /deterministic/);
  assert.equal(status.cleaner, 'input_output');
});

void test('createAgent graph includes the finalize80 hook', () => {
  const agent = createAgent();
  assert.equal(typeof agent.beforePromptStep, 'function');
  assert.equal(NS5_STEP_HOOKS.finalize80?.beforePromptStep, beforeNs5FinalizePromptStep);
});

void test('fixture entities stay typed as ontology artifacts when cloned', () => {
  const sources = loadSources('comandaRestaurante.json');
  const entity: Ns5OntologyEntityArtifact = sources.entities[0];
  const journey: Ns5JourneyArtifact = sources.journeys[0];
  assert.equal(entity.kind, 'mdm');
  assert.equal(journey.business.steps[1].kind, 'act');
});
