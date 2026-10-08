/// <mls fileReference="_102035_/l2/newRelease/qaPreviewModel.ts" enhancement="_blank" />

import { NS5_MODULE_SCHEMA_VERSION } from '/_102035_/l2/solution/types.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';

export const QA_TABS = ['general', 'journeys', 'ontology', 'access', 'rules', 'workflows', 'integration', 'review'] as const;
export const QA_IMPLEMENTATION_FIXTURES = [
  'implementation-waiting', 'implementation-l2', 'implementation-l1', 'implementation-retry',
  'implementation-failed', 'implementation-success', 'implementation-stale',
] as const;
export type QaImplementationFixture = typeof QA_IMPLEMENTATION_FIXTURES[number];
export function isQaImplementationFixture(fixture: string): fixture is QaImplementationFixture {
  return (QA_IMPLEMENTATION_FIXTURES as readonly string[]).includes(fixture);
}
export const QA_FIXTURES = ['live', 'empty', 'loading', 'error', 'pending', 'ready', ...QA_IMPLEMENTATION_FIXTURES] as const;
export const QA_LANGUAGES = ['pt-BR', 'en-US'] as const;
export const QA_THEMES = ['light', 'dark'] as const;

export type NewReleaseQaTab = typeof QA_TABS[number];
export type NewReleaseQaFixture = typeof QA_FIXTURES[number];
export type NewReleaseQaLanguage = typeof QA_LANGUAGES[number];
export type NewReleaseQaTheme = typeof QA_THEMES[number];

export function buildNewReleaseQaMenuFixture(moduleName: string) {
  return {
    schemaVersion: '2026-09-20-p2-menu-v2.2',
    moduleName,
    userLanguage: 'en-US',
    device: 'web',
    tree: [
      { id: 'qa-home', kind: 'page', label: 'QA home', organisms: [{ kind: 'summary', text: 'Stable summary.' }], action: 'keep' },
      { id: 'qa-hub', kind: 'hub', label: 'QA agenda', context: 'Professional', text: 'Stable hub.', action: 'change', children: [
        { id: 'qa-list', kind: 'page', label: 'Appointments', organisms: [{ kind: 'list', text: 'Stable list.' }], action: 'new' },
      ] },
    ],
    authorities: {
      'actor:professional': ['qa-hub'],
      'actor:scheduler': ['qa-home'],
    },
    meta: { journeys: {}, processes: {}, entities: {}, removed: [] },
  };
}

export interface NewReleaseQaConfig {
  project: number;
  moduleName: string;
  tab: NewReleaseQaTab;
  version: NewReleaseVersion;
  language: NewReleaseQaLanguage;
  theme: NewReleaseQaTheme;
  fixture: NewReleaseQaFixture;
  toolbar: 'visible' | 'hidden';
  runAll: boolean;
}

export type NewReleaseQaParseResult =
  | { ok: true; value: NewReleaseQaConfig }
  | { ok: false; errors: string[] };

function oneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function parseNewReleaseQaParams(input: string | URLSearchParams): NewReleaseQaParseResult {
  const params = typeof input === 'string' ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input) : input;
  const errors: string[] = [];
  const rawProject = params.get('project') ?? '102047';
  const project = /^[1-9]\d{5}$/u.test(rawProject) ? Number(rawProject) : 0;
  if (!project) errors.push('project');
  const moduleName = params.get('module') ?? 'agendaClinica';
  if (!/^[A-Za-z][A-Za-z0-9]{0,63}$/u.test(moduleName)) errors.push('module');
  const rawTab = params.get('tab') ?? 'general';
  if (!oneOf(rawTab, QA_TABS)) errors.push('tab');
  const rawVersion = params.get('version') ?? 'tobe';
  const version = rawVersion as NewReleaseVersion;
  if (rawVersion !== 'asis' && rawVersion !== 'tobe' && !/^release:[A-Za-z0-9-]+$/u.test(rawVersion)) errors.push('version');
  const rawLanguage = params.get('lang') ?? 'pt-BR';
  if (!oneOf(rawLanguage, QA_LANGUAGES)) errors.push('lang');
  const rawTheme = params.get('theme') ?? 'light';
  if (!oneOf(rawTheme, QA_THEMES)) errors.push('theme');
  const rawFixture = params.get('fixture') ?? 'live';
  if (!oneOf(rawFixture, QA_FIXTURES)) errors.push('fixture');
  const rawToolbar = params.get('toolbar') ?? 'visible';
  if (rawToolbar !== 'visible' && rawToolbar !== 'hidden') errors.push('toolbar');
  const rawRun = params.get('run');
  if (rawRun !== null && rawRun !== 'all') errors.push('run');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      project,
      moduleName,
      tab: rawTab as NewReleaseQaTab,
      version,
      language: rawLanguage as NewReleaseQaLanguage,
      theme: rawTheme as NewReleaseQaTheme,
      fixture: rawFixture as NewReleaseQaFixture,
      toolbar: rawToolbar as 'visible' | 'hidden',
      runAll: rawRun === 'all',
    },
  };
}

const coverage = {
  module: { status: 'unsupported', reason: 'QA fixture' },
  journeys: { status: 'unsupported', reason: 'QA fixture' },
  ontologyAssembly: { status: 'unsupported', reason: 'QA fixture' },
  ontologyEntities: { status: 'unsupported', reason: 'QA fixture' },
  rules: { status: 'unsupported', reason: 'QA fixture' },
  workflows: { status: 'unsupported', reason: 'QA fixture' },
  access: { status: 'unsupported', reason: 'QA fixture' },
  integration: { status: 'unsupported', reason: 'QA fixture' },
  oracle: { status: 'unsupported', reason: 'QA fixture' },
} as const;

function emptyArtifacts(): NewReleaseModuleData['artifacts'] {
  const artifact = <T>(path: Parameters<typeof typedArtifact<T>>[0]) => typedArtifact<T>(path);
  return {
    module: artifact('module.defs.ts'),
    journeyIndex: artifact('journeys/index.defs.ts'),
    journeys: [],
    ontologyIndex: artifact('ontology/index.defs.ts'),
    entities: [],
    rules: artifact('rules.defs.ts'),
    workflows: artifact('workflows.defs.ts'),
    access: artifact('access.defs.ts'),
    integration: artifact('integration.defs.ts'),
    all: [],
  };
}

function typedArtifact<T>(path: NewReleaseModuleData['artifacts']['module']['path']) {
  return { path, source: 'asis' as const, value: null as T | null };
}

export function buildNewReleaseQaFixture(
  fixture: Exclude<NewReleaseQaFixture, 'live' | 'loading'>,
  moduleName: string,
  caseId: string = fixture,
): NewReleaseModuleData {
  const artifacts = emptyArtifacts();
  const hasModule = fixture !== 'empty';
  if (hasModule) {
    artifacts.module.value = {
      schemaVersion: NS5_MODULE_SCHEMA_VERSION,
      moduleName,
      title: 'QA appointment agenda',
      userLanguage: 'en-US',
      productLanguages: ['en-US', 'pt-BR'],
      defaultLanguage: 'en-US',
      sourcePrompt: 'Deterministic interface preview fixture.',
      details: {},
    };
  }
  const revisionState = fixture === 'pending' || fixture === 'ready' || isQaImplementationFixture(fixture);
  return {
    module: artifacts.module.value,
    pipeline: null,
    finalizeReport: null,
    run: null,
    tobeChanges: revisionState ? 1 : 0,
    artifacts,
    manifest: null,
    sealedRevision: null,
    changeId: revisionState ? `qa-change-${caseId}` : null,
    revisionId: revisionState ? `qa-revision-${caseId}` : null,
    baseProvenance: null,
    resultCurrent: fixture === 'ready' || isQaImplementationFixture(fixture),
    stalePaths: [],
    diffs: [],
    validation: { ok: fixture !== 'error', issues: [], oracle: null, coverage: structuredClone(coverage) },
    errors: fixture === 'error' ? [{ path: 'l4/qa/fixture.json', message: 'Deterministic QA error.' }] : [],
  };
}

export interface NewReleaseQaScenario {
  caseId: string;
  tab: 'general' | 'review';
  width: 390 | 800 | 1280;
  language: NewReleaseQaLanguage;
  theme: NewReleaseQaTheme;
  fixture: Exclude<NewReleaseQaFixture, 'live'>;
}

export function qaScenarioRequiresReview(scenario: Pick<NewReleaseQaScenario, 'tab' | 'fixture'>): boolean {
  return scenario.tab === 'review' && scenario.fixture !== 'empty' && scenario.fixture !== 'loading';
}

export function newReleaseQaScenarios(): NewReleaseQaScenario[] {
  const scenarios: NewReleaseQaScenario[] = [];
  for (const tab of ['general', 'review'] as const) for (const width of [390, 800, 1280] as const) {
    for (const language of QA_LANGUAGES) for (const theme of QA_THEMES) {
      for (const fixture of ['empty', 'loading', 'error', 'pending', 'ready'] as const) {
        scenarios.push({ caseId: `${tab}-${width}-${language}-${theme}-${fixture}`, tab, width, language, theme, fixture });
      }
    }
  }
  for (const width of [390, 800, 1280] as const) for (const language of QA_LANGUAGES) {
    for (const theme of QA_THEMES) for (const fixture of QA_IMPLEMENTATION_FIXTURES) {
      scenarios.push({ caseId: `review-${width}-${language}-${theme}-${fixture}`, tab: 'review', width, language, theme, fixture });
    }
  }
  return scenarios;
}

export function isQaProtectedRequest(value: string, origin = 'http://localhost'): boolean {
  const url = new URL(value, origin);
  return url.pathname === '/msg' || url.pathname.startsWith('/msg/')
    || url.pathname === '/exec/candidate' || url.pathname.startsWith('/exec/candidate/')
    || url.pathname === '/exec/agent' || url.pathname.startsWith('/exec/agent/')
    || url.pathname === '/agents' || url.pathname.startsWith('/agents/');
}

export function canAnnounceQaReady(flags: { component: boolean; translation: boolean; theme: boolean; data: boolean }): boolean {
  return flags.component && flags.translation && flags.theme && flags.data;
}
