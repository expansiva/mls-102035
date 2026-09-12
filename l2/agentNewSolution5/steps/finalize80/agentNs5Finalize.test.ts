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
import type { Ns5JourneyArtifact, Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';
import { collectNs5LifecycleSignal } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  ensureConfigListsModule,
  NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION,
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
  journey.business.actorRef = sources.module.actors[0].actorId;
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
  const actor = sources.module.actors.find(item => item.kind === 'internal')!;
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
    profileRef: sources.access.profiles[0].profileId,
    authorityRef: sources.access.authorities[0].authorityId,
    entityRefs: ['Aluno'],
    dataScope: { mode: 'own', anchorEntity: 'Aluno', description: 'Own student record.' },
    disclosure: { mode: 'fullRecord', description: 'The student record.' },
  });
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

void test('real comandaRestaurante5 sources pass I1–I8 with no warnings', () => {
  const report = runNs5Oracle(loadSources('comandaRestaurante.json'));
  assert.equal(report.finalStatus, 'passed', report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(report.errors.length, 0);
  assert.equal(report.warnings.length, 0);
  assert.ok(report.checks.every(check => check.status === 'passed'));
  assert.equal(report.checks.find(check => check.checkId === 'I8')?.status, 'passed');
});

void test('real ordenServicio5 sources pass I1–I7 and fail I8: Cliente is only in affects', () => {
  const report = runNs5Oracle(loadSources('ordenServicio.json'));
  assert.equal(report.finalStatus, 'failed');
  assert.equal(report.errors.filter(issue => issue.checkId !== 'I8').length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(report.warnings.length, 0);
  const i8 = i8Errors(report);
  assert.equal(i8.length, 1);
  assert.match(i8[0].message, /Cliente/);
  assert.match(i8[0].message, /clienteConsultaYrespondePresupuesto/);
  const reception = loadSources('ordenServicio.json').journeys.find(journey => journey.journeyId === 'registrarRecepcionAparato')!;
  assert.equal(reception.business.steps[0].entity, 'OrdenServicio');
  assert.ok(reception.business.steps[0].affects?.includes('Cliente'));
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

void test('I2 fails when a later act has no matching transition', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const comanda = sources.entities.find(entity => entity.entityId === 'Comanda')!;
  comanda.transitions = [];
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION && /fecharComanda/.test(issue.message)));
  assert.equal(
    report.errors.every(issue => issue.code === NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION),
    true,
    report.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'),
  );
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

void test('I3 fails when an actor has no profile', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const dropped = sources.access.profiles.filter(profile => profile.actorRefs.includes('caixa')).map(profile => profile.profileId);
  sources.access.profiles = sources.access.profiles.filter(profile => !dropped.includes(profile.profileId));
  sources.access.grants = sources.access.grants.filter(grant => !dropped.includes(grant.profileRef));
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

void test('I8 fails mensalidadesAcademia when localizarOuCadastrarAluno is locate', () => {
  const journey = loadNs5Defs<Ns5JourneyArtifact>(
    'steps/finalize80/fixtures',
    'matricularAlunoEmPlano.defs.ts',
  );
  assert.equal(journey.business.steps.find(step => step.stepId === 'localizarOuCadastrarAluno')?.kind, 'locate');
  assert.equal(journey.business.steps.find(step => step.stepId === 'registrarMatricula')?.affects?.includes('Aluno'), true);
  const report = runNs5Oracle(withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'locate'));
  assert.equal(report.finalStatus, 'failed');
  const i8 = i8Errors(report);
  assert.equal(i8.length, 1, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.match(i8[0].message, /Aluno/);
  assert.match(i8[0].message, /alunoCancelarPropriaMatricula/);
});

void test('I8 passes when localizarOuCadastrarAluno is act Aluno', () => {
  const report = runNs5Oracle(withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'act'));
  assert.equal(i8Errors(report).length, 0, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
});

void test('I8 passes when a cadastrarAluno act Aluno is added beside the locate', () => {
  const sources = withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'locate');
  const journey = sources.journeys.find(item => item.journeyId === 'matricularAlunoEmPlano')!;
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

void test('I8 also applies to related scope and ignores organization even with a stray person anchor', () => {
  const related = withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'locate');
  related.access.grants[related.access.grants.length - 1].dataScope.mode = 'related';
  const relatedReport = runNs5Oracle(related);
  assert.equal(i8Errors(relatedReport).length, 1);
  const org = withAcademiaEnrollment(clone(loadSources('comandaRestaurante.json')), 'locate');
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
    actors: sources.module.actors,
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
