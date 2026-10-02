/// <mls fileReference="_102035_/l2/newRelease/qaPreview.ts" enhancement="_blank" />

import {
  buildNewReleaseQaFixture,
  canAnnounceQaReady,
  newReleaseQaScenarios,
  parseNewReleaseQaParams,
  qaScenarioRequiresReview,
  type NewReleaseQaConfig,
  type NewReleaseQaFixture,
  type NewReleaseQaScenario,
} from '/_102035_/l2/newRelease/qaPreviewModel.js';
import { guardQaMutations, waitForQaProtectedButtons } from '/_102035_/l2/newRelease/qaPreviewGuard.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';

type NewReleaseElement = HTMLElement & {
  project: number;
  moduleName: string;
  version: NewReleaseQaConfig['version'];
  data: NewReleaseModuleData | null;
  updateComplete: Promise<unknown>;
  requestUpdate(): void;
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

const QA_MENU = {
  schemaVersion: '2026-09-20-p2-menu-v2.2',
  moduleName: 'agendaClinica',
  userLanguage: 'en-US',
  device: 'web',
  tree: [
    { id: 'qa-home', kind: 'page', label: 'QA home', organisms: [{ kind: 'summary', text: 'Stable summary.' }], action: 'keep' },
    { id: 'qa-hub', kind: 'hub', label: 'QA agenda', context: 'Professional', text: 'Stable hub.', action: 'change', children: [
      { id: 'qa-list', kind: 'page', label: 'Appointments', organisms: [{ kind: 'list', text: 'Stable list.' }], action: 'new' },
    ] },
  ],
  authorities: { 'actor:professional': ['qa-hub'] },
  meta: { journeys: {}, processes: {}, entities: {}, removed: [] },
};

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
): () => void {
  const info = { project, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'menu', extension: '.json' };
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

async function mountFixture(
  container: HTMLElement,
  config: NewReleaseQaConfig,
  fixture: NewReleaseQaFixture,
  caseId: string,
): Promise<{ element: NewReleaseElement; cleanup: () => void }> {
  const cleanupFns: Array<() => void> = [];
  const element = createIndex();
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
    cleanupFns.push(fixtureFile(config.project, config.moduleName, JSON.stringify({ ...QA_MENU, moduleName: config.moduleName })));
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
    element.requestUpdate();
    await element.updateComplete;
  }
  element.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, detail: { tab: config.tab } }));
  await element.updateComplete;
  const review = element.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('new-release--widgets--review-102035');
  if (review?.updateComplete) await review.updateComplete;
  if (review) await waitFor(() => !review.querySelector('.nr-review__loading'));
  await waitFor(() => !/\b(?:tab|state|review|general|request)\.[A-Za-z]/u.test(element.textContent ?? ''));
  return {
    element,
    cleanup: () => {
      element.remove();
      cleanupFns.reverse().forEach(cleanup => cleanup());
    },
  };
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
  const review = element.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('new-release--widgets--review-102035');
  if (!review) throw new Error('qa.inconclusive.reviewMissing');
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
  if (scenario.fixture === 'pending') {
    if (!review.querySelector('.nr-review__pending')) throw new Error('qa.pendingStateMissing');
    return;
  }
  if (scenario.fixture !== 'ready') return;
  const select = review.querySelector<HTMLSelectElement>('.nr-review__toolbar select');
  if (!select || select.options.length < 2) throw new Error('qa.inconclusive.authorityFilterMissing');
  const rowsBefore = review.querySelectorAll('.nr-review__row').length;
  select.value = select.options[1].value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  if (review.updateComplete) await review.updateComplete;
  const rowsAfter = review.querySelectorAll('.nr-review__row').length;
  if (select.value !== select.options[1].value || rowsAfter <= 0 || rowsAfter >= rowsBefore) throw new Error('qa.authorityFilterIneffective');
  const treeButton = review.querySelector<HTMLButtonElement>('.nr-review__toggle[aria-expanded="false"]');
  if (!treeButton) throw new Error('qa.inconclusive.treeToggleMissing');
  treeButton.click();
  if (review.updateComplete) await review.updateComplete;
  const opened = review.querySelector<HTMLButtonElement>('.nr-review__toggle[aria-expanded="true"]');
  if (!opened) throw new Error('qa.treeDidNotOpen');
  opened.click();
  if (review.updateComplete) await review.updateComplete;
  if (review.querySelector('.nr-review__toggle[aria-expanded="true"]')) throw new Error('qa.treeDidNotClose');
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
