/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/judge35/agentNs5Judge.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { buildNs5JudgeHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/judge35/agentNs5Judge.js';
import {
  NS5_JUDGE_MAX_REPAIRS,
  buildNs5JudgeTool,
  collectNs5JudgeCandidates,
  decideNs5JudgeAction,
  formatNs5JudgeFailMessage,
  normalizeNs5JudgePayload,
  ns5JudgeNormalizations,
  planNs5JudgeRepairSteps,
  type Ns5JudgeCandidate,
  type Ns5JudgeEntityView,
  type Ns5JudgeJourneyView,
  type Ns5JudgeProcessView,
  type Ns5JudgeRelationshipView,
  type Ns5JudgeVerdict,
} from '/_102035_/l2/agentNewSolution5/steps/judge35/contracts.js';
import {
  formatNs5JudgeGate,
  validateNs5JudgeVerdicts,
} from '/_102035_/l2/agentNewSolution5/steps/judge35/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface SliceModule {
  moduleName: string;
  journeys: Ns5JudgeJourneyView[];
  entities: Ns5JudgeEntityView[];
  processes: Ns5JudgeProcessView[];
  relationships?: Ns5JudgeRelationshipView[];
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, '../../schemas/judge.schema.json'), 'utf8')) as Record<string, unknown>;
}

function loadSlices(): SliceModule[] {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures/candidates-12.json'), 'utf8')) as SliceModule[];
}

function uncitedLabels(candidates: readonly Ns5JudgeCandidate[]): string[] {
  return candidates
    .filter((item): item is Extract<Ns5JudgeCandidate, { kind: 'uncitedHumanTransition' }> => item.kind === 'uncitedHumanTransition')
    .map(item => `${item.entityId}.${item.transitionId}`)
    .sort();
}

function decideLabels(candidates: readonly Ns5JudgeCandidate[]): string[] {
  return candidates
    .filter((item): item is Extract<Ns5JudgeCandidate, { kind: 'incompleteDecide' }> => item.kind === 'incompleteDecide')
    .map(item => `${item.entityId}.${item.origin}`)
    .sort();
}

void test('judge35 tool schema is provider-clean', () => {
  const tool = buildNs5JudgeTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Judge');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('twelve real modules: five named human orphans, Equipamento.registrarDevolucao, two single-branch decides', () => {
  const slices = loadSlices();
  assert.equal(slices.length, 12);
  const byModule = new Map<string, ReturnType<typeof collectNs5JudgeCandidates>>();
  for (const slice of slices) {
    byModule.set(slice.moduleName, collectNs5JudgeCandidates(slice.journeys, slice.entities, slice.processes, slice.relationships || []));
  }

  const namedOrphans = [
    'compras:PurchaseOrder.rejectPurchaseOrder',
    'reembolsoDespesas:Despesa.rejeitarDespesa',
    'locacaoEquipamentos:Equipamento.registrarLocacao',
    'locacaoEquipamentos:Equipamento.iniciarManutencao',
    'locacaoEquipamentos:Equipamento.concluirManutencao',
  ];
  for (const label of namedOrphans) {
    const [moduleName, rest] = label.split(':');
    assert.ok(
      uncitedLabels(byModule.get(moduleName) || []).includes(rest),
      `${label} must be an uncited human transition`,
    );
  }
  // Entity-qualified citation: the journey cites ContratoLocacao.registrarDevolucao, not Equipamento.
  assert.ok(
    uncitedLabels(byModule.get('locacaoEquipamentos') || []).includes('Equipamento.registrarDevolucao'),
  );

  assert.deepEqual(decideLabels(byModule.get('compras') || []), ['PurchaseOrder.sent']);
  assert.deepEqual(decideLabels(byModule.get('reembolsoDespesas') || []), ['Despesa.pendingApproval']);

  const withCandidates = slices.filter(slice => (byModule.get(slice.moduleName) || []).length > 0).map(slice => slice.moduleName);
  assert.deepEqual(withCandidates.sort(), ['compras', 'locacaoEquipamentos', 'reembolsoDespesas']);
});

void test('empty candidates skip the model — no prompt_ready on that path', () => {
  const action = decideNs5JudgeAction({ candidates: [], verdicts: [], repairAttempt: 0 });
  assert.equal(action.type, 'approveWithoutModel');
  const source = readFileSync(path.join(HERE, 'agentNs5Judge.ts'), 'utf8');
  const before = source.slice(source.indexOf('export async function beforeNs5JudgePromptStep'));
  const afterCallModel = before.slice(0, before.indexOf('export async function afterNs5JudgePromptStep'));
  assert.match(afterCallModel, /decideNs5JudgeAction/);
  assert.match(afterCallModel, /approveWithoutModel/);
  assert.match(afterCallModel, /noJudgeSignal/);
  const approveBranch = afterCallModel.slice(
    afterCallModel.indexOf("action.type === 'approveWithoutModel'"),
    afterCallModel.indexOf("action.type === 'repairJourneys'"),
  );
  assert.match(approveBranch, /doneAnchor/);
  assert.doesNotMatch(approveBranch, /promptReady/);
  assert.match(afterCallModel, /return \[promptReady/);
});

void test('missingJourney schedules a nested journeys20 repair; unjustified is a warning; leftovers fail', () => {
  const candidates: Ns5JudgeCandidate[] = [{
    kind: 'uncitedHumanTransition',
    candidateId: 'uncited:Equipamento.iniciarManutencao',
    entityId: 'Equipamento',
    transitionId: 'iniciarManutencao',
    by: ['gerente'],
    from: ['available'],
    to: 'maintenance',
    description: 'Puts the equipment in maintenance.',
    likelyCoveredBy: [],
  }];
  const missing: Ns5JudgeVerdict = {
    candidateId: 'uncited:Equipamento.iniciarManutencao',
    verdict: 'missingJourney',
    journeyBrief: {
      actor: 'gerente',
      title: 'Start equipment maintenance',
      goal: 'Put an available equipment into maintenance so it cannot be rented.',
      transitionRef: 'Equipamento.iniciarManutencao',
    },
    coveredBy: '',
  };
  const first = decideNs5JudgeAction({ candidates, verdicts: [missing], repairAttempt: 0 });
  assert.equal(first.type, 'repairJourneys');
  if (first.type !== 'repairJourneys') return;
  assert.equal(first.attempt, 1);
  assert.match(first.briefs, /Equipamento\.iniciarManutencao/);
  assert.match(first.briefs, /Do not change the ontology/);

  const planned = planNs5JudgeRepairSteps('locacaoEquipamentos', first.attempt, first.briefs);
  assert.equal(planned.repair.planning?.planId, 'journeys20-repair-1');
  assert.equal(ownerStepId(String(planned.repair.planning?.planId)), 'journeys20');
  assert.match(String(planned.repair.prompt), /gateFeedback/);
  assert.equal(planned.revalidate.planning?.planId, 'judge35-revalidate-1');
  assert.deepEqual(planned.revalidate.planning?.dependsOn, ['journeys20-repair-1']);
  assert.equal(ownerStepId('judge35-revalidate-1'), 'judge35');

  const last = decideNs5JudgeAction({
    candidates,
    verdicts: [missing],
    repairAttempt: NS5_JUDGE_MAX_REPAIRS,
  });
  assert.equal(last.type, 'fail');
  if (last.type !== 'fail') return;
  assert.match(last.message, /Equipamento\.iniciarManutencao/);
  assert.equal(last.message, formatNs5JudgeFailMessage(candidates));

  const unjustified: Ns5JudgeVerdict = {
    candidateId: 'uncited:Equipamento.iniciarManutencao',
    verdict: 'transitionUnjustified',
    journeyBrief: { actor: '', title: '', goal: '', transitionRef: '' },
    coveredBy: '',
  };
  const keep = decideNs5JudgeAction({ candidates, verdicts: [unjustified], repairAttempt: 0 });
  assert.equal(keep.type, 'approveWithWarnings');
  if (keep.type !== 'approveWithWarnings') return;
  assert.deepEqual(keep.warnings, ['transitionUnjustified Equipamento.iniciarManutencao']);
});

void test('normalize plus gate: one verdict per candidate, brief required on missingJourney', () => {
  const candidates: Ns5JudgeCandidate[] = [{
    kind: 'uncitedHumanTransition',
    candidateId: 'uncited:Despesa.rejeitarDespesa',
    entityId: 'Despesa',
    transitionId: 'rejeitarDespesa',
    by: ['gestorEquipe'],
    from: ['pendingApproval'],
    to: 'rejected',
    description: 'Rejects the expense.',
    likelyCoveredBy: [],
  }];
  const normalized = normalizeNs5JudgePayload({
    verdicts: [{
      candidateId: 'uncited:Despesa.rejeitarDespesa',
      verdict: 'missingJourney',
      journeyBrief: {
        actor: 'gestorEquipe',
        title: 'Reject a team expense',
        goal: 'Record the rejection with a reason.',
        transitionRef: 'Despesa.rejeitarDespesa',
      },
    }],
  });
  const gate = validateNs5JudgeVerdicts(normalized, candidates);
  assert.equal(gate.ok, true, formatNs5JudgeGate(gate.issues));

  const emptyBrief = validateNs5JudgeVerdicts([{
    candidateId: 'uncited:Despesa.rejeitarDespesa',
    verdict: 'missingJourney',
    journeyBrief: { actor: '', title: '', goal: '', transitionRef: '' },
    coveredBy: '',
  }], candidates);
  assert.equal(emptyBrief.ok, false);
  assert.ok(emptyBrief.issues.some(issue => issue.code === 'NS5_JUDGE_BRIEF'));

  const extra = validateNs5JudgeVerdicts([
    ...normalized,
    { candidateId: 'uncited:Ghost.nope', verdict: 'missingJourney', journeyBrief: { actor: 'a', title: 't', goal: 'g', transitionRef: 'Ghost.nope' }, coveredBy: '' },
  ], candidates);
  assert.ok(extra.issues.some(issue => issue.code === 'NS5_JUDGE_UNKNOWN_CANDIDATE'));
});

void test('human prompt lists only the candidates it was given', () => {
  const prompt = buildNs5JudgeHumanPrompt({
    journeys: [],
    entities: [],
    processes: [],
    candidates: [{
      kind: 'uncitedHumanTransition',
      candidateId: 'uncited:Equipamento.iniciarManutencao',
      entityId: 'Equipamento',
      transitionId: 'iniciarManutencao',
      by: ['gerente'],
      from: ['available'],
      to: 'maintenance',
      description: 'Puts the equipment in maintenance.',
      likelyCoveredBy: [],
    }],
  });
  assert.match(prompt, /Candidates \(judge only these\)/);
  assert.match(prompt, /likelyCoveredBy is a deterministic hint/);
  assert.match(prompt, /iniciarManutencao/);
  assert.doesNotMatch(prompt, /CPF|CNPJ|SSN/);
});

void test('nested journeys20 repair from the judge does not emit a second done-anchor', () => {
  const source = readFileSync(path.join(HERE, '../journeys20/agentNs5Journeys.ts'), 'utf8');
  assert.match(source, /hasPlanId\(context, 'journeys20-done'\)/);
});

void test('locacaoEquipamentos before fixture is the v4 slice the ns5_63 after will compare', () => {
  const before = JSON.parse(readFileSync(path.join(HERE, 'fixtures/locacaoEquipamentos-before.json'), 'utf8')) as SliceModule;
  assert.equal(before.moduleName, 'locacaoEquipamentos');
  const candidates = collectNs5JudgeCandidates(before.journeys, before.entities, before.processes, before.relationships || []);
  assert.deepEqual(uncitedLabels(candidates), [
    'Equipamento.concluirManutencao',
    'Equipamento.iniciarManutencao',
    'Equipamento.registrarDevolucao',
    'Equipamento.registrarLocacao',
  ]);
});

function loadLocacao(): SliceModule {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures/locacaoEquipamentos-before.json'), 'utf8')) as SliceModule;
}

function locacaoUncited(): Extract<Ns5JudgeCandidate, { kind: 'uncitedHumanTransition' }>[] {
  const slice = loadLocacao();
  return collectNs5JudgeCandidates(slice.journeys, slice.entities, slice.processes, slice.relationships || [])
    .filter((item): item is Extract<Ns5JudgeCandidate, { kind: 'uncitedHumanTransition' }> => item.kind === 'uncitedHumanTransition');
}

void test('locacaoEquipamentos: likelyCoveredBy is registrarDevolucao only; locacao and maintenance have none', () => {
  const slice = loadLocacao();
  const byLabel = new Map(locacaoUncited().map(item => [`${item.entityId}.${item.transitionId}`, item.likelyCoveredBy]));
  assert.deepEqual(byLabel.get('Equipamento.registrarDevolucao'), ['registrarDevolucao.confirmarDevolucao']);
  assert.deepEqual(byLabel.get('Equipamento.registrarLocacao'), []);
  assert.deepEqual(byLabel.get('Equipamento.iniciarManutencao'), []);
  assert.deepEqual(byLabel.get('Equipamento.concluirManutencao'), []);
  const withoutNn = collectNs5JudgeCandidates(
    slice.journeys,
    slice.entities,
    slice.processes,
    (slice.relationships || []).filter(edge => edge.relationshipId !== 'contratoLocacaoEquipamentos'),
  ).find(item => item.kind === 'uncitedHumanTransition' && item.transitionId === 'registrarDevolucao');
  assert.deepEqual(withoutNn && withoutNn.kind === 'uncitedHumanTransition' ? withoutNn.likelyCoveredBy : undefined, []);
});

void test('coveredByAct: locacao Devolucao passes; create-without-transitionRef and other defects are named refusals', () => {
  const slice = loadLocacao();
  const candidates = locacaoUncited();
  const context = { journeys: slice.journeys, relationships: slice.relationships || [] };
  const emptyBrief = { actor: '', title: '', goal: '', transitionRef: '' };

  const covered: Ns5JudgeVerdict = {
    candidateId: 'uncited:Equipamento.registrarDevolucao',
    verdict: 'coveredByAct',
    journeyBrief: emptyBrief,
    coveredBy: 'registrarDevolucao.confirmarDevolucao',
  };
  const ok = validateNs5JudgeVerdicts(
    candidates.map(candidate => candidate.candidateId === covered.candidateId
      ? covered
      : { candidateId: candidate.candidateId, verdict: 'transitionUnjustified' as const, journeyBrief: emptyBrief, coveredBy: '' }),
    candidates,
    context,
  );
  assert.equal(ok.ok, true, formatNs5JudgeGate(ok.issues));

  const refusals: Array<{ coveredBy: string; candidateId: string; code: string }> = [
    { coveredBy: 'ghost.nope', candidateId: 'uncited:Equipamento.registrarDevolucao', code: 'NS5_JUDGE_COVERED_STEP' },
    { coveredBy: 'criarContratoLocacao.registrarContrato', candidateId: 'uncited:Equipamento.registrarLocacao', code: 'NS5_JUDGE_COVERED_TRANSITION' },
    { coveredBy: 'acompanharSituacaoEquipamentos.consultarSituacaoEquipamento', candidateId: 'uncited:Equipamento.iniciarManutencao', code: 'NS5_JUDGE_COVERED_ACT' },
    { coveredBy: 'registrarDevolucao.confirmarDevolucao', candidateId: 'uncited:Equipamento.iniciarManutencao', code: 'NS5_JUDGE_COVERED_ACTOR' },
  ];
  for (const row of refusals) {
    const gate = validateNs5JudgeVerdicts([{
      candidateId: row.candidateId,
      verdict: 'coveredByAct',
      journeyBrief: emptyBrief,
      coveredBy: row.coveredBy,
    }], candidates.filter(item => item.candidateId === row.candidateId), context);
    assert.equal(gate.ok, false, row.code);
    assert.ok(gate.issues.some(issue => issue.code === row.code), `expected ${row.code}, got ${gate.issues.map(issue => issue.code).join(',')}`);
  }

  const unlink = validateNs5JudgeVerdicts([{
    candidateId: 'uncited:Equipamento.registrarDevolucao',
    verdict: 'coveredByAct',
    journeyBrief: emptyBrief,
    coveredBy: 'registrarDevolucao.confirmarDevolucao',
  }], candidates.filter(item => item.candidateId === 'uncited:Equipamento.registrarDevolucao'), {
    journeys: slice.journeys,
    relationships: (slice.relationships || []).filter(edge => edge.relationshipId !== 'contratoLocacaoEquipamentos'),
  });
  assert.equal(unlink.ok, false);
  assert.ok(unlink.issues.some(issue => issue.code === 'NS5_JUDGE_COVERED_LINK'));

  const emptyCovered = validateNs5JudgeVerdicts([{
    candidateId: 'uncited:Equipamento.registrarDevolucao',
    verdict: 'coveredByAct',
    journeyBrief: emptyBrief,
    coveredBy: '',
  }], candidates.filter(item => item.candidateId === 'uncited:Equipamento.registrarDevolucao'), context);
  assert.ok(emptyCovered.issues.some(issue => issue.code === 'NS5_JUDGE_COVERED_BY'));
});

void test('coveredByAct settles without a journeys20 repair and records transitionCoveredByAct', () => {
  const candidates = locacaoUncited().filter(item => item.transitionId === 'registrarDevolucao');
  const covered: Ns5JudgeVerdict = {
    candidateId: 'uncited:Equipamento.registrarDevolucao',
    verdict: 'coveredByAct',
    journeyBrief: { actor: '', title: '', goal: '', transitionRef: '' },
    coveredBy: 'registrarDevolucao.confirmarDevolucao',
  };
  const action = decideNs5JudgeAction({ candidates, verdicts: [covered], repairAttempt: 0 });
  assert.equal(action.type, 'approveWithoutModel');
  assert.deepEqual(ns5JudgeNormalizations(candidates, [covered]), [{
    kind: 'transitionCoveredByAct',
    detail: 'Equipamento.registrarDevolucao coveredBy registrarDevolucao.confirmarDevolucao',
    entityId: 'Equipamento',
    journeyId: 'registrarDevolucao',
    stepId: 'confirmarDevolucao',
  }]);
});
