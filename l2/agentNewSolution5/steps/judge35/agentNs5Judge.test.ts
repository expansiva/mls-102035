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
  NS5_JUDGE_COMMENT_CODES,
  NS5_JUDGE_MAX_ONTOLOGY_REPAIRS,
  NS5_JUDGE_MAX_REPAIRS,
  NS5_JUDGE_ONTOLOGY_REPAIR_ROUND,
  actionableNs5JudgeCandidates,
  buildNs5JudgeTool,
  collectNs5JudgeCandidates,
  decideNs5JudgeAction,
  foldNs5JudgeText,
  formatNs5JudgeFailMessage,
  formatNs5JudgeOntologyFeedback,
  normalizeNs5JudgePayload,
  ns5JudgeCommentNormalizations,
  ns5JudgeFieldsOf,
  ns5JudgeLeftoverComments,
  ns5JudgeNormalizations,
  ns5JudgeSkipComment,
  planNs5JudgeOntologyRevalidate,
  planNs5JudgeRepairSteps,
  type Ns5JudgeCandidate,
  type Ns5JudgeEntityView,
  type Ns5JudgeJourneyView,
  type Ns5JudgeProcessView,
  type Ns5JudgeRelationshipView,
  type Ns5JudgeRuleView,
  type Ns5JudgeVerdict,
} from '/_102035_/l2/agentNewSolution5/steps/judge35/contracts.js';
import {
  formatNs5JudgeGate,
  partitionNs5JudgeVerdicts,
  validateNs5JudgeVerdicts,
} from '/_102035_/l2/agentNewSolution5/steps/judge35/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface SliceModule {
  moduleName: string;
  journeys: Ns5JudgeJourneyView[];
  entities: Ns5JudgeEntityView[];
  processes: Ns5JudgeProcessView[];
  relationships?: Ns5JudgeRelationshipView[];
  rules?: Ns5JudgeRuleView[];
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

void test('missingJourney schedules a nested journeys20 repair; unjustified is a warning; leftovers are commented', () => {
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
  assert.equal(last.type, 'commentLeftovers');
  if (last.type !== 'commentLeftovers') return;
  assert.match(last.message, /Equipamento\.iniciarManutencao/);
  assert.equal(last.message, formatNs5JudgeFailMessage(candidates));
  assert.deepEqual(last.leftovers.map(item => item.candidateId), [candidates[0].candidateId]);

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

void test('promptEntity states the switch criterion in place of lifecycle-only-for-what-somebody-moves', () => {
  const source = readFileSync(path.join(HERE, '../ontology30/promptEntity.md'), 'utf8');
  assert.match(source, /A lifecycle is for what somebody moves AND the system reacts to/);
  assert.match(source, /a switch with no such consequence is a field, not a state/);
  assert.doesNotMatch(source, /A lifecycle is only for what \*\*somebody moves\*\*/);
});

function switchLabels(candidates: readonly Ns5JudgeCandidate[]): string[] {
  return candidates
    .filter((item): item is Extract<Ns5JudgeCandidate, { kind: 'writtenSwitch' }> => item.kind === 'writtenSwitch')
    .map(item => `${item.entityId}.${item.fieldId}`)
    .sort();
}

void test('locacaoEquipamentos after: one written switch emManutencao cited by the maintenance rule', () => {
  const after = JSON.parse(readFileSync(path.join(HERE, 'fixtures/locacaoEquipamentos-after.json'), 'utf8')) as SliceModule;
  const candidates = collectNs5JudgeCandidates(
    after.journeys,
    after.entities,
    after.processes,
    after.relationships || [],
    after.rules || [],
  );
  assert.deepEqual(uncitedLabels(candidates), []);
  assert.deepEqual(switchLabels(candidates), ['Equipamento.emManutencao']);
  const row = candidates.find((item): item is Extract<Ns5JudgeCandidate, { kind: 'writtenSwitch' }> => item.kind === 'writtenSwitch');
  assert.ok(row);
  assert.ok(row.citedBy.includes('rule:equipamentoEmManutencaoIndisponivel'), String(row.citedBy));
  assert.equal(row.type, 'boolean');
});

void test('written switch match is folded id and title, not raw fieldId in accented prose', () => {
  const field = { fieldId: 'emManutencao', title: 'Em manutenção', type: 'boolean' as const };
  const entity: Ns5JudgeEntityView = {
    entityId: 'Equipamento',
    transitions: [],
    lifecycleStates: [],
    fields: [field],
    derivedFields: [],
  };
  const miss = collectNs5JudgeCandidates([], [entity], [], [], [
    { ruleId: 'foo', description: 'Um equipamento em manutenção não pode ser incluído.' },
  ]);
  assert.deepEqual(switchLabels(miss), ['Equipamento.emManutencao']);
  const byTitle = miss[0];
  assert.equal(byTitle.kind, 'writtenSwitch');
  if (byTitle.kind === 'writtenSwitch') {
    assert.deepEqual(byTitle.citedBy, ['rule:foo']);
  }
  assert.equal(foldNs5JudgeText('Em manutenção'), 'em manutencao');
  assert.equal('Um equipamento em manutenção'.includes('emManutencao'), false);

  const byRuleId = collectNs5JudgeCandidates([], [entity], [], [], [
    { ruleId: 'equipamentoEmManutencaoIndisponivel', description: 'Something unrelated.' },
  ]);
  assert.deepEqual(switchLabels(byRuleId), ['Equipamento.emManutencao']);

  const none = collectNs5JudgeCandidates([], [entity], [], [], [
    { ruleId: 'codigoUnico', description: 'The equipment code is unique.' },
  ]);
  assert.deepEqual(switchLabels(none), []);
});

void test('a written switch on an entity that already has a lifecycle is not a candidate', () => {
  const candidates = collectNs5JudgeCandidates([], [{
    entityId: 'Equipamento',
    transitions: [],
    lifecycleStates: [{ state: 'available' }],
    fields: [{ fieldId: 'emManutencao', title: 'Em manutenção', type: 'boolean' }],
  }], [], [], [{ ruleId: 'equipamentoEmManutencaoIndisponivel', description: 'Um equipamento em manutenção não pode.' }]);
  assert.deepEqual(switchLabels(candidates), []);
});

void test('switchNeedsLifecycle: gate wants two states; ontology repair then leftover comments; keep-as-field records switchKeptAsField', () => {
  const candidate: Ns5JudgeCandidate = {
    kind: 'writtenSwitch',
    candidateId: 'switch:Equipamento.emManutencao',
    entityId: 'Equipamento',
    fieldId: 'emManutencao',
    title: 'Em manutenção',
    type: 'boolean',
    citedBy: ['rule:equipamentoEmManutencaoIndisponivel'],
  };
  const needs: Ns5JudgeVerdict = {
    candidateId: candidate.candidateId,
    verdict: 'switchNeedsLifecycle',
    journeyBrief: { actor: '', title: '', goal: '', transitionRef: '' },
    coveredBy: '',
    states: ['maintenance', 'available'],
  };
  const gate = validateNs5JudgeVerdicts([needs], [candidate]);
  assert.equal(gate.ok, true, formatNs5JudgeGate(gate.issues));

  const noStates = validateNs5JudgeVerdicts([{ ...needs, states: [] }], [candidate]);
  assert.equal(noStates.ok, false);
  assert.ok(noStates.issues.some(issue => issue.code === 'NS5_JUDGE_SWITCH_STATES'));

  const wrongKind = validateNs5JudgeVerdicts([needs], [{
    kind: 'uncitedHumanTransition',
    candidateId: candidate.candidateId,
    entityId: 'Equipamento',
    transitionId: 'iniciarManutencao',
    by: ['gerente'],
    from: ['available'],
    to: 'maintenance',
    description: '',
    likelyCoveredBy: [],
  }]);
  assert.ok(wrongKind.issues.some(issue => issue.code === 'NS5_JUDGE_SWITCH_KIND'));

  const first = decideNs5JudgeAction({ candidates: [candidate], verdicts: [needs], repairAttempt: 0 });
  assert.equal(first.type, 'repairOntology');
  if (first.type !== 'repairOntology') return;
  assert.equal(first.attempt, 1);
  assert.deepEqual(first.entityIds, ['Equipamento']);
  assert.match(first.entityFeedback.Equipamento, /model `emManutencao` as a lifecycle state/);
  assert.match(first.entityFeedback.Equipamento, /keep the derived availability/);
  assert.deepEqual(formatNs5JudgeOntologyFeedback([candidate], [needs]), first.entityFeedback);

  const revalidate = planNs5JudgeOntologyRevalidate('locacaoEquipamentos', first.attempt, 0, `ontology30-finalize-${NS5_JUDGE_ONTOLOGY_REPAIR_ROUND}`);
  assert.equal(revalidate.planning?.planId, 'judge35-revalidate-ontology-1');
  assert.deepEqual(revalidate.planning?.dependsOn, [`ontology30-finalize-${NS5_JUDGE_ONTOLOGY_REPAIR_ROUND}`]);
  assert.equal(ownerStepId(String(revalidate.planning?.planId)), 'judge35');

  const last = decideNs5JudgeAction({
    candidates: [candidate],
    verdicts: [needs],
    repairAttempt: 0,
    ontologyRepairAttempt: NS5_JUDGE_MAX_ONTOLOGY_REPAIRS,
  });
  assert.equal(last.type, 'commentLeftovers');
  if (last.type !== 'commentLeftovers') return;
  assert.match(last.message, /Equipamento\.emManutencao/);

  const keep: Ns5JudgeVerdict = {
    candidateId: candidate.candidateId,
    verdict: 'transitionUnjustified',
    journeyBrief: { actor: '', title: '', goal: '', transitionRef: '' },
    coveredBy: '',
    states: [],
  };
  const kept = decideNs5JudgeAction({ candidates: [candidate], verdicts: [keep], repairAttempt: 0 });
  assert.equal(kept.type, 'approveWithoutModel');
  assert.deepEqual(ns5JudgeNormalizations([candidate], [keep]), [{
    kind: 'switchKeptAsField',
    detail: 'switchKeptAsField Equipamento.emManutencao',
    entityId: 'Equipamento',
  }]);
});

void test('ns5JudgeFieldsOf reads the v3 emManutencao boolean and the derived situacaoAtual', () => {
  const split = ns5JudgeFieldsOf({
    entityId: 'Equipamento',
    record: {
      fields: {
        id: { type: 'uuid', derived: true, title: 'Id' },
        emManutencao: { type: 'boolean', title: 'Em manutenção', description: 'Indica que o equipamento está indisponível.' },
        details: {
          type: 'object',
          fields: {
            situacaoAtual: { type: 'enum', derived: true, title: 'Situação atual', description: 'em manutenção quando…' },
          },
        },
      },
    },
  });
  assert.ok(split.fields.some(item => item.fieldId === 'emManutencao' && item.type === 'boolean'));
  assert.ok(split.derivedFields.some(item => item.fieldId === 'situacaoAtual'));
  assert.ok(!split.fields.some(item => item.fieldId === 'id'));
});

void test('nested ontology30 repair from the judge does not emit a second done-anchor', () => {
  const source = readFileSync(path.join(HERE, '../ontology30/agentNs5Ontology.ts'), 'utf8');
  assert.match(source, /hasPlanId\(context, 'ontology30-done'\)/);
  assert.match(source, /parallelEntityStep/);
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

void test('a malformed verdict does not drop valid verdicts in the same batch; the step completes with a named comment', () => {
  const slice = loadLocacao();
  const all = locacaoUncited();
  const registrarDevolucao = all.find(item => item.transitionId === 'registrarDevolucao');
  const registrarLocacao = all.find(item => item.transitionId === 'registrarLocacao');
  const iniciarManutencao = all.find(item => item.transitionId === 'iniciarManutencao');
  assert.ok(registrarDevolucao && registrarLocacao && iniciarManutencao);
  const candidates = [registrarDevolucao, registrarLocacao, iniciarManutencao];
  const emptyBrief = { actor: '', title: '', goal: '', transitionRef: '' };
  const verdicts: Ns5JudgeVerdict[] = [
    {
      candidateId: registrarDevolucao.candidateId,
      verdict: 'coveredByAct',
      journeyBrief: emptyBrief,
      coveredBy: 'registrarDevolucao.confirmarDevolucao',
    },
    {
      candidateId: registrarLocacao.candidateId,
      verdict: 'coveredByAct',
      journeyBrief: emptyBrief,
      coveredBy: 'criarContratoLocacao.registrarContrato',
    },
    {
      candidateId: iniciarManutencao.candidateId,
      verdict: 'transitionUnjustified',
      journeyBrief: emptyBrief,
      coveredBy: '',
    },
  ];
  const wholeGate = validateNs5JudgeVerdicts(verdicts, candidates, {
    journeys: slice.journeys,
    relationships: slice.relationships || [],
  });
  assert.equal(wholeGate.ok, false);
  assert.ok(wholeGate.issues.some(issue => issue.code === 'NS5_JUDGE_COVERED_TRANSITION'));

  const partitioned = partitionNs5JudgeVerdicts(verdicts, candidates, {
    journeys: slice.journeys,
    relationships: slice.relationships || [],
  });
  assert.equal(partitioned.accepted.length, 2, 'a whole-batch discard would leave accepted empty');
  assert.deepEqual(
    partitioned.accepted.map(item => item.candidateId).sort(),
    [registrarDevolucao.candidateId, iniciarManutencao.candidateId].sort(),
  );
  const malformed = partitioned.comments.find(item => item.code === 'NS5_JUDGE_COVERED_TRANSITION');
  assert.ok(malformed);
  assert.equal(malformed.candidateId, registrarLocacao.candidateId);
  assert.ok((NS5_JUDGE_COMMENT_CODES as readonly string[]).includes(malformed.code));
  assert.equal(malformed.code, 'NS5_JUDGE_COVERED_TRANSITION');

  const applied = ns5JudgeNormalizations(candidates, partitioned.accepted);
  assert.ok(applied.some(item => item.kind === 'transitionCoveredByAct' && item.stepId === 'confirmarDevolucao'));
  assert.ok(applied.some(item => item.kind === 'transitionUnjustified' && item.detail.includes('iniciarManutencao')));
  assert.ok(!applied.some(item => item.kind === 'transitionCoveredByAct' && item.detail.includes('registrarLocacao')));
  assert.deepEqual(ns5JudgeCommentNormalizations(partitioned.comments).map(item => item.kind), ['judgeComment']);

  const action = decideNs5JudgeAction({
    candidates: actionableNs5JudgeCandidates(candidates, partitioned.accepted),
    verdicts: partitioned.accepted,
    repairAttempt: 0,
  });
  assert.equal(action.type, 'approveWithWarnings');

  const source = readFileSync(path.join(HERE, 'agentNs5Judge.ts'), 'utf8');
  const after = source.slice(source.indexOf('export async function afterNs5JudgePromptStep'));
  assert.match(after, /partitionNs5JudgeVerdicts/);
  assert.match(after, /actionableNs5JudgeCandidates/);
  assert.doesNotMatch(after, /if \(!gate\.ok\)/);
  assert.doesNotMatch(after, /updateStatus\([^\n]*'failed'/);
  assert.doesNotMatch(source, /[\u00C0-\u00FF]/);
});

void test('a leftover orphan after repair completes the step with a named comment, not a failed status', () => {
  const leftover: Ns5JudgeCandidate = {
    kind: 'uncitedHumanTransition',
    candidateId: 'uncited:Equipamento.iniciarManutencao',
    entityId: 'Equipamento',
    transitionId: 'iniciarManutencao',
    by: ['gerente'],
    from: ['available'],
    to: 'maintenance',
    description: 'Puts the equipment in maintenance.',
    likelyCoveredBy: [],
  };
  const missing: Ns5JudgeVerdict = {
    candidateId: leftover.candidateId,
    verdict: 'missingJourney',
    journeyBrief: {
      actor: 'gerente',
      title: 'Start equipment maintenance',
      goal: 'Put an available equipment into maintenance so it cannot be rented.',
      transitionRef: 'Equipamento.iniciarManutencao',
    },
    coveredBy: '',
  };
  const action = decideNs5JudgeAction({
    candidates: [leftover],
    verdicts: [missing],
    repairAttempt: NS5_JUDGE_MAX_REPAIRS,
  });
  assert.equal(action.type, 'commentLeftovers');
  if (action.type !== 'commentLeftovers') return;
  const comments = ns5JudgeLeftoverComments(action.leftovers);
  assert.equal(comments.length, 1);
  assert.equal(comments[0].code, 'NS5_JUDGE_ORPHAN_PERSISTS');
  assert.equal(comments[0].candidateId, leftover.candidateId);
  assert.match(comments[0].message, /Equipamento\.iniciarManutencao/);
  assert.deepEqual(ns5JudgeCommentNormalizations(comments), [{
    kind: 'judgeComment',
    detail: `NS5_JUDGE_ORPHAN_PERSISTS ${leftover.candidateId}: ${comments[0].message}`,
  }]);

  const source = readFileSync(path.join(HERE, 'agentNs5Judge.ts'), 'utf8');
  assert.match(source, /action\.type === 'commentLeftovers'/);
  assert.match(source, /ns5JudgeLeftoverComments/);
  assert.doesNotMatch(source, /recordFailure/);
  assert.doesNotMatch(source, /drainWaitingSiblings/);
  const leftoverBranch = source.slice(
    source.indexOf("action.type === 'commentLeftovers'"),
    source.indexOf("await writeJson(draftFile(moduleName, 'judge35'), {", source.indexOf("action.type === 'commentLeftovers'")),
  );
  assert.match(leftoverBranch, /'completed'/);
  assert.doesNotMatch(leftoverBranch, /'failed'/);
});

void test('a missing precondition completes the step with judge35 skipped and still writes the draft', () => {
  const comment = ns5JudgeSkipComment('module.defs.ts is missing for locacaoEquipamentos; module10 must run first.');
  assert.equal(comment.code, 'NS5_JUDGE_SKIPPED');
  assert.equal(
    comment.message,
    'judge35 skipped: module.defs.ts is missing for locacaoEquipamentos; module10 must run first.',
  );
  assert.deepEqual(ns5JudgeCommentNormalizations([comment]), [{
    kind: 'judgeComment',
    detail: 'NS5_JUDGE_SKIPPED: judge35 skipped: module.defs.ts is missing for locacaoEquipamentos; module10 must run first.',
  }]);
  const alreadyPrefixed = ns5JudgeSkipComment('judge35 skipped: pipeline.json is missing for locacaoEquipamentos.');
  assert.equal(alreadyPrefixed.message, 'judge35 skipped: pipeline.json is missing for locacaoEquipamentos.');

  const source = readFileSync(path.join(HERE, 'agentNs5Judge.ts'), 'utf8');
  assert.match(source, /completeSkipped/);
  assert.match(source, /persistSkipComment/);
  assert.match(source, /ns5JudgeSkipComment/);
  const catchBlocks = [...source.matchAll(/catch \(error\) \{\n    return completeSkipped/g)];
  assert.equal(catchBlocks.length, 2);
  assert.match(source, /updateStatus\([\s\S]*?'completed', comment\.message\)/);
  assert.doesNotMatch(source, /updateStatus\([^\n]*'failed'/);
});

void test('every comment path writes judge35-draft and the judge never sets failed', () => {
  const source = readFileSync(path.join(HERE, 'agentNs5Judge.ts'), 'utf8');
  assert.match(source, /if \(!context\.task\) throw/);
  assert.doesNotMatch(source, /recordFailure/);
  assert.doesNotMatch(source, /drainWaitingSiblings/);
  assert.doesNotMatch(source, /status: 'failed'/);
  assert.match(source, /persistSkipComment/);
  assert.match(source, /persistApproval/);
  const persist = source.slice(
    source.indexOf('async function persistApproval'),
    source.indexOf('async function persistSkipComment'),
  );
  assert.match(persist, /writeJson\(draftFile\(moduleName, 'judge35'\)/);
  const persistSkip = source.slice(
    source.indexOf('async function persistSkipComment'),
    source.indexOf('async function completeSkipped'),
  );
  assert.match(persistSkip, /persistApproval\(/);
});
