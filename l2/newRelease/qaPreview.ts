/// <mls fileReference="_102035_/l2/newRelease/qaPreview.ts" enhancement="_blank" />

import {
  isQaImplementationFixture,
  isQaChangeEffortFixture,
  buildNewReleaseQaChangeEffort,
  type QaImplementationFixture,
  buildNewReleaseQaFixture,
  buildNewReleaseQaMenuFixture,
  canAnnounceQaReady,
  newReleaseQaScenarios,
  parseNewReleaseQaParams,
  qaScenarioRequiresReview,
  type NewReleaseQaConfig,
  type NewReleaseQaFixture,
  type NewReleaseQaScenario,
} from '/_102035_/l2/newRelease/qaPreviewModel.js';
import { guardQaMutations, waitForQaCondition, waitForQaProtectedButtons } from '/_102035_/l2/newRelease/qaPreviewGuard.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';

import type { L4ImplementationRecord } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import type { ModuleLayerDiff } from '/_102035_/l2/solution/candidate/moduleLayers.js';
import { implementationProgress } from '/_102035_/l2/newRelease/widgets/reviewModel.js';
import { readReviewArtifact } from '/_102035_/l2/newRelease/helpers/backendReader.js';
import { buildChangeEffortView } from '/_102035_/l2/newRelease/widgets/changeEffortModel.js';

type QaReviewElement = NewReleaseElement & {
  loading: boolean;
  isCurrentLoad(): boolean;
  view(): unknown;
  actionPresentation(view: unknown, current: boolean): { disabled: boolean };
  implementationRunner: {
    runNext(project: number, moduleName: string): Promise<L4ImplementationRecord>;
    retryPhase(project: number, moduleName: string, phase: string): Promise<L4ImplementationRecord>;
  };
  implementationDiff: ModuleLayerDiff[] | null;
  loadImplementationDiff(): Promise<void>;
};
type NewReleaseElement = HTMLElement & {
  project: number;
  moduleName: string;
  version: NewReleaseQaConfig['version'];
  data: NewReleaseModuleData | null;
  t: NewReleaseTranslate;
  updateComplete: Promise<unknown>;
  requestUpdate(): void;
  activeTab: string;
  renderTabContent(): unknown;
};

export interface NewReleaseQaFailure { caseId: string; message: string }
export interface NewReleaseQaReport {
  release: string;
  startedAt: string;
  finishedAt: string;
  total: number;
  passed: number;
  failed: number;
  inconclusive: number;
  blockedMutations: number;
  failures: NewReleaseQaFailure[];
}

declare global {
  interface Window {
    __newReleaseQaBootstrap?: { release?: string; projectHint?: number };
    __newReleaseQaReport?: NewReleaseQaReport;
    collabMiniCfeReady?: boolean;
  }
}

function waitFor(check: () => boolean, timeoutMs = 20000): Promise<void> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (check()) { resolve(); return; }
      if (performance.now() - started >= timeoutMs) { reject(new Error('qa.timeout')); return; }
      window.setTimeout(tick, 25);
    };
    tick();
  });
}

function setDocumentPresentation(config: Pick<NewReleaseQaConfig, 'language' | 'theme'>): void {
  document.documentElement.lang = config.language;
  document.documentElement.dataset.theme = config.theme;
  document.body.dataset.theme = config.theme;
  document.documentElement.classList.toggle('dark', config.theme === 'dark');
}

function fixtureFile(
  project: number,
  moduleName: string,
  content: string | Promise<string>,
  path = 'pool/l2/web/menu',
): () => void {
  const parts = path.split('/');
  const shortName = parts.pop()!;
  const info = { project, level: 4, folder: `${moduleName}/${parts.join('/')}`, shortName, extension: '.json' };
  const key = mls.stor.getKeyToFile(info);
  const previous = mls.stor.files[key];
  mls.stor.files[key] = {
    ...info,
    status: 'loaded',
    versionRef: 'qa-fixture',
    getContent: async () => content,
    getValueInfo: async () => ({ content: await content, contentType: 'string' }),
  } as unknown as mls.stor.IFileInfo;
  return () => {
    if (previous) mls.stor.files[key] = previous;
    else delete mls.stor.files[key];
  };
}

function loadingFixtureFile(project: number, moduleName: string): { restore: () => void; resolve: () => void } {
  const info = { project, level: 4, folder: moduleName, shortName: 'module', extension: '.defs.ts' };
  const key = mls.stor.getKeyToFile(info);
  const previous = mls.stor.files[key];
  let settle: (value: string) => void = () => undefined;
  const content = new Promise<string>(resolve => { settle = resolve; });
  mls.stor.files[key] = {
    ...info,
    status: 'loaded',
    versionRef: 'qa-fixture',
    getContent: async () => content,
  } as unknown as mls.stor.IFileInfo;
  return {
    resolve: () => settle(''),
    restore: () => {
      settle('');
      if (previous) mls.stor.files[key] = previous;
      else delete mls.stor.files[key];
    },
  };
}

async function ensureRuntime(): Promise<void> {
  await import('/_102033_/l2/cbe/cbeMiniCfe.js');
  await waitFor(() => window.collabMiniCfeReady === true);
  await import('/_102035_/l2/newRelease/widgets/index.js');
}

function createIndex(): NewReleaseElement {
  return document.createElement('new-release--widgets--index-102035') as NewReleaseElement;
}

async function installImplementationFixture(
  element: NewReleaseElement, config: NewReleaseQaConfig, fixture: QaImplementationFixture,
): Promise<() => void> {
  const response = await fetch('/_102035_/l2/newRelease/fixtures/implementation.json');
  if (!response.ok) throw new Error('qa.implementationFixtureUnavailable');
  const fixtures = await response.json() as Record<QaImplementationFixture, L4ImplementationRecord>;
  const record = structuredClone(fixtures[fixture]);
  if (!record || !element.data?.changeId) throw new Error('qa.implementationFixtureMissing');
  const changeId = element.data.changeId;
  if (fixture !== 'implementation-stale') record.changeId = changeId;
  record.revisionId = element.data.revisionId!;
  const cleanup = [
    fixtureFile(config.project, config.moduleName, JSON.stringify({ changeId }), 'pipeline/changes/active'),
    fixtureFile(config.project, config.moduleName, JSON.stringify({
      project: config.project, moduleName: config.moduleName, changeId,
    }), `pipeline/changes/${changeId}/change`),
    fixtureFile(config.project, config.moduleName, JSON.stringify(record), `pipeline/changes/${changeId}/implementation`),
  ];
  // Create the real widget off-DOM and inject before its first updated()/load().
  // All synthetic state is confined to this ephemeral instance and in-memory files.
  const review = document.createElement('new-release--widgets--review-102035') as QaReviewElement;
  review.implementationRunner = {
    runNext: async () => structuredClone(record),
    retryPhase: async () => { throw new Error('qa.mutationBlocked'); },
  };
  review.loadImplementationDiff = async () => {
    review.implementationDiff = record.phases.flatMap(phase =>
      (phase.changedDefs ?? []).map(file => ({ ...file })));
    review.requestUpdate();
  };
  review.project = config.project;
  review.moduleName = config.moduleName;
  review.version = config.version;
  review.data = element.data;
  review.t = element.t;
  const render = element.renderTabContent;
  element.renderTabContent = function () {
    review.t = this.t;
    return this.activeTab === 'review' ? review : render.call(this);
  };
  return () => {
    review.remove(); // disconnectedCallback cancels the widget's polling timer and invalidates in-flight loads.
    element.renderTabContent = render;
    cleanup.reverse().forEach(restore => restore());
  };
}

async function waitForCurrentReview(element: NewReleaseElement): Promise<QaReviewElement | null> {
  const review = element.querySelector<QaReviewElement>('new-release--widgets--review-102035');
  if (!review) return null;
  // Absence of a loading node is also true before the first load has rendered.
  await waitForQaCondition(() => review.isCurrentLoad() && !review.loading, 'qa.reviewLoadTimeout');
  await review.updateComplete;
  return review;
}

async function mountFixture(
  container: HTMLElement,
  config: NewReleaseQaConfig,
  fixture: NewReleaseQaFixture,
  caseId: string,
): Promise<{ element: NewReleaseElement; cleanup: () => void }> {
  const cleanupFns: Array<() => void> = [];
  const element = createIndex();
  try {
    element.version = config.version;
    if (fixture === 'loading') {
      const pending = loadingFixtureFile(config.project, config.moduleName);
      cleanupFns.push(pending.restore);
      element.project = config.project;
      element.moduleName = config.moduleName;
      container.appendChild(element);
      await element.updateComplete;
      await waitFor(() => !!element.querySelector('.nr-index__loading'));
    } else if (fixture === 'live') {
      element.project = config.project;
      element.moduleName = config.moduleName;
      container.appendChild(element);
      await waitFor(() => element.querySelector('.nr-index')?.getAttribute('aria-busy') === 'false');
    } else {
      cleanupFns.push(fixtureFile(config.project, config.moduleName, JSON.stringify(buildNewReleaseQaMenuFixture(config.moduleName))));
      if (isQaChangeEffortFixture(fixture)) {
        const response = await fetch('/_102035_/l2/newRelease/widgets/fixtures/changeEffort-agendaClinica-regra-anotacao.json');
        if (!response.ok) throw new Error('qa.changeEffortFixtureUnavailable');
        cleanupFns.push(fixtureFile(config.project, config.moduleName,
          buildNewReleaseQaChangeEffort(fixture, await response.json()), 'pool/l4/changeEffort'));
      }
      element.project = config.project;
      element.moduleName = '';
      container.appendChild(element);
      await element.updateComplete;
      await waitFor(() => !/\btab\.[A-Za-z]/u.test(element.textContent ?? ''));
      element.moduleName = config.moduleName;
      element.data = buildNewReleaseQaFixture(
        fixture as Exclude<NewReleaseQaFixture, 'live' | 'loading'>,
        config.moduleName,
        caseId,
      );
      if (isQaImplementationFixture(fixture)) {
        cleanupFns.push(await installImplementationFixture(element, config, fixture));
      }
      element.requestUpdate();
      await element.updateComplete;
    }
    element.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, detail: { tab: config.tab } }));
    await element.updateComplete;
    await waitForCurrentReview(element);
    await waitFor(() => !/\b(?:tab|state|review|general|request)\.[A-Za-z]/u.test(element.textContent ?? ''));
    return {
      element,
      cleanup: () => {
        element.remove();
        cleanupFns.reverse().forEach(cleanup => cleanup());
      },
    };
  } catch (error) {
    element.remove();
    cleanupFns.reverse().forEach(cleanup => cleanup());
    throw error;
  }
}

function assertScenario(element: NewReleaseElement, scenario: NewReleaseQaScenario, blockedBefore: number, blockedAfter: number): void {
  const shell = element.querySelector<HTMLElement>('.nr-index');
  if (!shell) throw new Error('qa.inconclusive.componentMissing');
  if (shell.scrollWidth > shell.clientWidth + 1) throw new Error(`qa.horizontalOverflow:${shell.scrollWidth}/${shell.clientWidth}`);
  if (/\b(?:tab|state|review|general|request)\.[A-Za-z]/u.test(element.textContent ?? '')) throw new Error('qa.rawI18nKey');
  if (blockedAfter !== blockedBefore) throw new Error('qa.protectedRequestAttempted');
  if (scenario.fixture === 'loading' && !element.querySelector('.nr-index__loading')) throw new Error('qa.loadingMissing');
  if (scenario.fixture === 'empty' && !element.querySelector('.nr-index__empty')) throw new Error('qa.emptyMissing');
  if (scenario.fixture === 'error' && !element.querySelector('.nr-index__errors')) throw new Error('qa.errorMissing');
  if (qaScenarioRequiresReview(scenario) && !element.querySelector('new-release--widgets--review-102035')) {
    throw new Error('qa.reviewMissing');
  }
}

async function exerciseScenario(element: NewReleaseElement, scenario: NewReleaseQaScenario): Promise<void> {
  element.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, detail: { tab: scenario.tab === 'general' ? 'review' : 'general' } }));
  await element.updateComplete;
  element.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, detail: { tab: scenario.tab } }));
  await element.updateComplete;
  if (!qaScenarioRequiresReview(scenario)) return;
  const review = await waitForCurrentReview(element);
  if (!review) throw new Error('qa.inconclusive.reviewMissing');
  if (isQaImplementationFixture(scenario.fixture) && scenario.fixture !== 'implementation-stale') {
    const record = await review.implementationRunner.runNext(review.project, review.moduleName);
    const expected = implementationProgress(record, review.data?.changeId ?? null);
    await waitForQaCondition(() => {
      const panels = [...review.querySelectorAll('.nr-review__implementation')];
      return panels.length === 2 && panels.every(panel => {
        const phases = panel.querySelectorAll(':scope > ol > li');
        return phases.length === expected.length && expected.every((phase, index) => phases[index].classList.contains(`is-${phase.status}`));
      });
    }, 'qa.implementationStateMismatch');
    if (review.querySelector('.nr-review__primary-action')) throw new Error('qa.implementationCtaVisible');
    const retryCount = expected.filter(phase => phase.podeTentarDeNovo).length * 2;
    await waitForQaProtectedButtons(() => [...review.querySelectorAll<HTMLButtonElement>('.nr-review__implementation-retry')], retryCount);
    const completed = expected.every(phase => phase.status === 'concluido');
    const buttons = await waitForQaProtectedButtons(() => [...review.querySelectorAll<HTMLButtonElement>('.nr-review__implementation-refuse')], completed ? 2 : 0);
    buttons.forEach(button => button.click());
    if (completed) {
      const levels = [...review.querySelectorAll<HTMLDetailsElement>('.nr-review__implementation-level')];
      if (levels.length !== 4 || levels.some(level => level.open)) throw new Error('qa.implementationLevelsMissing');
      for (const phase of expected) for (const file of phase.changedDefs ?? []) {
        if (!levels.some(level => level.textContent?.includes(file.path))) throw new Error('qa.implementationArtifactMissing');
      }
    }
    return;
  }
  if (scenario.fixture === 'implementation-stale' && review.querySelector('.nr-review__implementation')) {
    throw new Error('qa.obsoleteImplementationVisible');
  }
  const actions = await waitForQaProtectedButtons(
    () => [...review.querySelectorAll<HTMLButtonElement>('.nr-review__primary-action button')],
    2,
  );
  if (actions[0].textContent?.trim() !== actions[1].textContent?.trim()) throw new Error('qa.ctaPlacementsDiverged');
  const busyBefore = [...review.querySelectorAll<HTMLElement>('.nr-review__primary-action')].map(item => item.getAttribute('aria-busy'));
  actions[0].click();
  if (review.updateComplete) await review.updateComplete;
  const busyAfter = [...review.querySelectorAll<HTMLElement>('.nr-review__primary-action')].map(item => item.getAttribute('aria-busy'));
  if (busyBefore.join() !== busyAfter.join() || busyAfter.some(value => value !== 'false')) throw new Error('qa.ctaProtectedTransition');
  if (isQaChangeEffortFixture(scenario.fixture)) {
    const block = review.querySelector<HTMLElement>('.nr-review__change-effort');
    if (!block) throw new Error('qa.changeEffortMissing');
    if (review.querySelector('.nr-review__toolbar, .nr-review__menu, .nr-review__backend, .nr-review__effort')) {
      throw new Error('qa.legacyReviewVisible');
    }
    // Check the real presentation too: the QA guard disables every button and
    // must not mask an enabled product CTA for blocked or invalid effort.
    if (!review.actionPresentation(review.view(), review.isCurrentLoad()).disabled) throw new Error('qa.changeEffortCtaEnabled');
    const view = buildChangeEffortView(await readReviewArtifact(review.project, review.moduleName, 'changeEffort'));
    if (scenario.fixture === 'effort-invalid') {
      if (view.kind !== 'invalid' || block.querySelectorAll('details').length
        || block.querySelector('[role="alert"]')?.textContent?.trim() !== review.t('review.effort.invalid')) {
        throw new Error('qa.changeEffortInvalidMissing');
      }
      return;
    }
    if (view.kind !== 'ready' || view.status !== (scenario.fixture === 'effort-simple' ? 'simple' : 'blocked')) {
      throw new Error('qa.changeEffortStateMismatch');
    }
    for (const text of [review.t(`review.effort.status.${view.status}`), review.t('review.effort.untouched', { count: view.untouched.count })]) {
      if (!block.textContent?.includes(text)) throw new Error('qa.changeEffortHeaderMismatch');
    }
    const details = [...block.querySelectorAll<HTMLDetailsElement>('.nr-review__effort-item')];
    if (details.length !== view.items.length || details.some(item => item.open)) throw new Error('qa.changeEffortNotCollapsed');
    for (const [index, detail] of details.entries()) {
      const summary = detail.querySelector('summary')!;
      summary.click();
      if (!detail.open) throw new Error('qa.changeEffortDidNotOpen');
      const expected = view.items[index];
      if (!summary.textContent?.includes(expected.item.id)) throw new Error('qa.changeEffortItemMissing');
      const masters = [...detail.querySelectorAll<HTMLElement>('.nr-review__effort-master')];
      if (masters.length !== expected.answers.length) throw new Error('qa.changeEffortMasterMissing');
      for (const [masterIndex, answer] of expected.answers.entries()) {
        const master = masters[masterIndex];
        const texts = [...answer.regenerateDefs, ...answer.materialize].map(unit => unit.path)
          .concat(answer.runAgents.map(agent => agent.command), answer.abend ? [answer.abend.reason] : []);
        for (const text of texts) if (!master.textContent?.includes(text)) throw new Error('qa.changeEffortContentMissing');
        for (const node of master.querySelectorAll<HTMLElement>('code, p')) {
          if (!node.getClientRects().length || node.scrollWidth > node.clientWidth + 1) throw new Error('qa.changeEffortContentClipped');
        }
      }
      summary.click();
      if (detail.open) throw new Error('qa.changeEffortDidNotClose');
    }
    return;
  }
  if (scenario.fixture === 'pending') {
    if (!review.querySelector('.nr-review__pending')) throw new Error('qa.pendingStateMissing');
    return;
  }
  if (scenario.fixture !== 'ready') return;
  const select = review.querySelector<HTMLSelectElement>('.nr-review__toolbar select');
  if (!select || select.options.length < 2) throw new Error('qa.inconclusive.authorityFilterMissing');
  if (select.value !== 'actor:professional') throw new Error(`qa.unexpectedInitialAuthority:${select.value}`);
  const treeButton = review.querySelector<HTMLButtonElement>('.nr-review__toggle[aria-expanded="false"]');
  if (!treeButton) throw new Error('qa.inconclusive.treeToggleMissing');
  const collapsedRows = review.querySelectorAll('.nr-review__row').length;
  treeButton.click();
  await waitForQaCondition(
    () => !!review.querySelector('.nr-review__toggle[aria-expanded="true"]')
      && review.querySelectorAll('.nr-review__row').length > collapsedRows,
    'qa.treeDidNotOpen',
  );
  const opened = review.querySelector<HTMLButtonElement>('.nr-review__toggle[aria-expanded="true"]');
  if (!opened) throw new Error('qa.treeDidNotOpen');
  const rowsBefore = review.querySelectorAll('.nr-review__row').length;
  opened.click();
  await waitForQaCondition(
    () => !review.querySelector('.nr-review__toggle[aria-expanded="true"]')
      && review.querySelectorAll('.nr-review__row').length === collapsedRows,
    'qa.treeDidNotClose',
  );
  const reopen = review.querySelector<HTMLButtonElement>('.nr-review__toggle[aria-expanded="false"]');
  if (!reopen) throw new Error('qa.inconclusive.treeReopenMissing');
  reopen.click();
  await waitForQaCondition(
    () => !!review.querySelector('.nr-review__toggle[aria-expanded="true"]')
      && review.querySelectorAll('.nr-review__row').length === rowsBefore,
    'qa.treeDidNotReopen',
  );
  const target = [...select.options].find(option => option.value === 'actor:scheduler');
  if (!target) throw new Error('qa.inconclusive.distinctAuthorityMissing');
  select.value = target.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await waitForQaCondition(() => {
    const rowsAfter = review.querySelectorAll('.nr-review__row').length;
    const links = [...review.querySelectorAll<HTMLElement>('.nr-review__link')]
      .map(link => link.textContent?.trim() ?? '');
    return select.value === target.value && rowsAfter === 1 && rowsAfter < rowsBefore
      && links.length === 1 && links[0] === 'QA home' && !review.textContent?.includes('QA agenda');
  }, 'qa.authorityFilterIneffective');
}

class NewReleaseQaPreview102035 extends HTMLElement {
  private readonly release = window.__newReleaseQaBootstrap?.release ?? 'development';
  private blocked: string[] = [];

  connectedCallback(): void {
    void this.start();
  }

  private renderFrame(config: NewReleaseQaConfig): HTMLElement {
    this.innerHTML = `<style>
      new-release-qa-preview-102035{display:block;max-width:1280px;margin:0 auto}.qa-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font-size:12px}.qa-toolbar button{padding:4px 8px}.qa-readonly{margin:0 0 10px;padding:8px 10px;border-radius:8px;background:#fff3cd;color:#6b5200;font-size:12px}.qa-stage{margin:0 auto;min-width:0}.qa-results{display:grid;gap:4px;margin:12px 0;padding:0;list-style:none;font-size:12px}.qa-results li{padding:6px 8px;border-radius:6px;background:#e8f5e9}.qa-results li.is-failed{background:#fde8e9;color:#8b1a1a}body[data-theme="dark"] .qa-toolbar,body[data-theme="dark"] .qa-readonly{background:#1f2937;color:#e5e7eb;border-color:#475569}</style>
      <header class="qa-toolbar"><span></span><button type="button">Hide</button></header>
      <p class="qa-readonly">Read-only QA preview: save, calculate, continue, messages, candidate writes and agents are disabled.</p>
      <main class="qa-stage"></main><ul class="qa-results"></ul>`;
    const toolbar = this.querySelector<HTMLElement>('.qa-toolbar')!;
    toolbar.querySelector('span')!.textContent = `${this.release} · ${config.project}/${config.moduleName} · ${config.version} · ${config.tab} · ${config.fixture}`;
    toolbar.hidden = config.toolbar === 'hidden';
    toolbar.querySelector('button')!.addEventListener('click', () => { toolbar.hidden = true; });
    return this.querySelector<HTMLElement>('.qa-stage')!;
  }

  private async start(): Promise<void> {
    const parsed = parseNewReleaseQaParams(window.location.search);
    if (!parsed.ok) {
      this.textContent = '';
      const error = document.createElement('section');
      error.className = 'qa-error';
      error.textContent = `Invalid QA parameters: ${parsed.errors.join(', ')}`;
      this.appendChild(error);
      document.documentElement.dataset.qaState = 'invalid';
      document.documentElement.dataset.qaReady = 'true';
      return;
    }
    const config = parsed.value;
    setDocumentPresentation(config);
    const stage = this.renderFrame(config);
    const stopGuard = guardQaMutations(this, this.blocked);
    let keepGuardUntilPagehide = false;
    try {
      await ensureRuntime();
      if (config.runAll) await this.runAll(config, stage);
      else {
        await this.runOne(config, stage);
        keepGuardUntilPagehide = true;
        window.addEventListener('pagehide', stopGuard, { once: true });
      }
    } catch (error) {
      document.documentElement.dataset.qaTests = config.runAll ? 'failed' : '';
      document.documentElement.dataset.qaState = 'error';
      const panel = document.createElement('section');
      panel.className = 'qa-error';
      panel.textContent = error instanceof Error ? error.message : String(error);
      stage.replaceChildren(panel);
    } finally {
      if (!keepGuardUntilPagehide) stopGuard();
    }
  }

  private announceReady(state: string): void {
    const flags = { component: true, translation: true, theme: true, data: true };
    if (!canAnnounceQaReady(flags)) return;
    this.dataset.qaReady = 'true';
    this.dataset.qaState = state;
    document.documentElement.dataset.qaReady = 'true';
    document.documentElement.dataset.qaState = state;
  }

  private async runOne(config: NewReleaseQaConfig, stage: HTMLElement): Promise<void> {
    const mounted = await mountFixture(stage, config, config.fixture, 'single');
    this.announceReady(config.fixture);
    // Kept mounted for visual inspection; page teardown owns cleanup.
    window.addEventListener('pagehide', mounted.cleanup, { once: true });
  }

  private async runAll(config: NewReleaseQaConfig, stage: HTMLElement): Promise<void> {
    const startedAt = new Date().toISOString();
    const scenarios = newReleaseQaScenarios();
    const failures: NewReleaseQaFailure[] = [];
    let passed = 0;
    let inconclusive = 0;
    document.documentElement.dataset.qaTests = 'running';
    this.dataset.qaTests = 'running';
    const results = this.querySelector<HTMLUListElement>('.qa-results')!;
    const originalConsoleError = console.error;
    let activeConsoleErrors: string[] = [];
    console.error = (...args: unknown[]) => { activeConsoleErrors.push(args.map(String).join(' ')); originalConsoleError(...args); };
    try {
      if (!scenarios.length) throw new Error('qa.zeroScenarios');
      for (const scenario of scenarios) {
        const scenarioConfig: NewReleaseQaConfig = {
          ...config,
          tab: scenario.tab,
          language: scenario.language,
          theme: scenario.theme,
          fixture: scenario.fixture,
        };
        setDocumentPresentation(scenarioConfig);
        stage.style.width = `${scenario.width}px`;
        activeConsoleErrors = [];
        const blockedBefore = this.blocked.length;
        let mounted: Awaited<ReturnType<typeof mountFixture>> | null = null;
        try {
          mounted = await mountFixture(stage, scenarioConfig, scenario.fixture, scenario.caseId);
          await exerciseScenario(mounted.element, scenario);
          assertScenario(mounted.element, scenario, blockedBefore, this.blocked.length);
          if (activeConsoleErrors.length) throw new Error(`qa.console:${activeConsoleErrors[0]}`);
          passed += 1;
          const row = document.createElement('li');
          row.textContent = `${scenario.caseId}: passed`;
          results.appendChild(row);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('inconclusive')) inconclusive += 1;
          failures.push({ caseId: scenario.caseId, message });
          const row = document.createElement('li');
          row.className = 'is-failed';
          row.textContent = `${scenario.caseId}: ${message}`;
          results.appendChild(row);
        } finally {
          mounted?.cleanup();
          stage.replaceChildren();
        }
      }
    } catch (error) {
      failures.push({ caseId: 'runner', message: error instanceof Error ? error.message : String(error) });
    } finally {
      console.error = originalConsoleError;
    }
    const report: NewReleaseQaReport = {
      release: this.release,
      startedAt,
      finishedAt: new Date().toISOString(),
      total: scenarios.length,
      passed,
      failed: failures.length,
      inconclusive,
      blockedMutations: this.blocked.length,
      failures,
    };
    window.__newReleaseQaReport = report;
    const status = report.total > 0 && report.failed === 0 && report.inconclusive === 0 ? 'passed' : 'failed';
    document.documentElement.dataset.qaTests = status;
    this.dataset.qaTests = status;
    this.announceReady(`matrix-${status}`);
  }
}

if (!customElements.get('new-release-qa-preview-102035')) {
  customElements.define('new-release-qa-preview-102035', NewReleaseQaPreview102035);
}
