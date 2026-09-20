/// <mls fileReference="_102035_/l2/newRelease/widgets/index.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  NEW_RELEASE_CONTEXT_EVENT,
  type NewReleaseContext,
  type NewReleaseVersion,
} from '/_102035_/l2/newRelease/helpers/context.js';
import {
  readNs5Module,
  type NewReleaseModuleData,
} from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import {
  createNewReleaseTranslator,
  loadNewReleaseMessages,
  observeNewReleaseLanguage,
  type NewReleaseTranslate,
} from '/_102035_/l2/newRelease/helpers/i18n.js';
import {
  discardTobe,
  NEW_RELEASE_TOBE_UPDATED_EVENT,
  saveTobeArtifact,
  type NewReleaseValidationIssue,
  type Ns5TobeArtifactPath,
} from '/_102035_/l2/newRelease/tobe.js';
import {
  NEW_RELEASE_CHANGED_EVENT,
  tabForArtifactPath,
  type NewReleaseChangedDetail,
} from '/_102035_/l2/newRelease/editContract.js';
import '/_102035_/l2/newRelease/widgets/general.js';
import '/_102035_/l2/newRelease/widgets/access.js';
import '/_102035_/l2/newRelease/widgets/journeys.js';
import '/_102035_/l2/newRelease/widgets/ontology.js';
import '/_102035_/l2/newRelease/widgets/rules.js';
import '/_102035_/l2/newRelease/widgets/workflows.js';
import '/_102035_/l2/newRelease/widgets/integration.js';
import '/_102035_/l2/newRelease/widgets/review.js';

type NewReleaseTab = 'general' | 'journeys' | 'ontology' | 'access' | 'rules' | 'workflows' | 'integration' | 'review';

const TABS: NewReleaseTab[] = ['general', 'journeys', 'ontology', 'access', 'rules', 'workflows', 'integration', 'review'];

@customElement('new-release--widgets--index-102035')
export class NewReleaseIndex102035 extends StateLitElement {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;

  @state() private activeTab: NewReleaseTab = 'general';
  @state() private loading = true;
  @state() private changing = false;
  @state() private mutationError = '';

  private t: NewReleaseTranslate = key => key;
  private languageObserver?: MutationObserver;
  private loadToken = 0;
  private languageToken = 0;
  private validationTimer?: number;
  private mutationQueue: Promise<void> = Promise.resolve();
  private pendingMutations = 0;

  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this.project = this.project || Number(mls.actualProject || 0);
    this.languageObserver = observeNewReleaseLanguage(() => this.loadLanguage());
    this.addEventListener('nr-navigate', this.onNavigate as EventListener);
    this.addEventListener(NEW_RELEASE_CHANGED_EVENT, this.onArtifactChanged as EventListener);
    window.addEventListener(NEW_RELEASE_CONTEXT_EVENT, this.onContextChange as EventListener);
    window.addEventListener(NEW_RELEASE_TOBE_UPDATED_EVENT, this.onTobeUpdated as EventListener);
    void this.initialize();
  }

  disconnectedCallback() {
    this.languageObserver?.disconnect();
    if (this.validationTimer) window.clearTimeout(this.validationTimer);
    this.removeEventListener('nr-navigate', this.onNavigate as EventListener);
    this.removeEventListener(NEW_RELEASE_CHANGED_EVENT, this.onArtifactChanged as EventListener);
    window.removeEventListener(NEW_RELEASE_CONTEXT_EVENT, this.onContextChange as EventListener);
    window.removeEventListener(NEW_RELEASE_TOBE_UPDATED_EVENT, this.onTobeUpdated as EventListener);
    super.disconnectedCallback();
  }

  private async initialize() {
    await this.loadLanguage();
    await this.loadModule();
  }

  private async loadLanguage() {
    const token = ++this.languageToken;
    const project = this.project || Number(mls.actualProject || 0);
    const bundles = await loadNewReleaseMessages(project);
    if (token !== this.languageToken) return;
    this.t = createNewReleaseTranslator(bundles);
    this.requestUpdate();
  }

  private async loadModule() {
    if (this.validationTimer) {
      window.clearTimeout(this.validationTimer);
      this.validationTimer = undefined;
    }
    const token = ++this.loadToken;
    if (!this.project || !this.moduleName) {
      this.data = null;
      this.loading = false;
      return;
    }
    this.loading = true;
    const data = await readNs5Module(this.project, this.moduleName, this.version);
    if (token !== this.loadToken) return;
    this.data = data;
    this.loading = false;
  }

  private onContextChange = (event: Event) => {
    const context = (event as CustomEvent<NewReleaseContext>).detail;
    if (!context?.project || !context.moduleName) return;
    const projectChanged = context.project !== this.project;
    this.project = context.project;
    this.moduleName = context.moduleName;
    this.version = context.version;
    if (projectChanged) void this.loadLanguage();
    void this.loadModule();
  };

  private onNavigate = (event: Event) => {
    const tab = (event as CustomEvent<{ tab?: NewReleaseTab }>).detail?.tab;
    if (tab && TABS.includes(tab)) this.activeTab = tab;
  };

  private async activateTab(tab: NewReleaseTab, focus = false) {
    this.activeTab = tab;
    if (!focus) return;
    await this.updateComplete;
    this.querySelector<HTMLButtonElement>(`#nr-tab-${tab}`)?.focus();
  }

  private onTabKeydown = (event: KeyboardEvent) => {
    const current = TABS.indexOf(this.activeTab);
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (current + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    void this.activateTab(TABS[next], true);
  };

  private onTobeUpdated = (event: Event) => {
    const detail = (event as CustomEvent<{ project?: number; moduleName?: string }>).detail;
    if (detail?.project !== this.project || detail?.moduleName !== this.moduleName) return;
    this.scheduleOverlayReload();
  };

  private scheduleOverlayReload() {
    if (this.validationTimer) window.clearTimeout(this.validationTimer);
    this.validationTimer = window.setTimeout(() => {
      this.validationTimer = undefined;
      void this.loadModule();
    }, 180);
  }

  private onArtifactChanged = (event: Event) => {
    const detail = (event as CustomEvent<NewReleaseChangedDetail>).detail;
    if (!detail?.path) return;
    this.pendingMutations += 1;
    this.changing = true;
    this.mutationError = '';
    this.mutationQueue = this.mutationQueue.then(async () => {
      try {
        await saveTobeArtifact(this.project, this.moduleName, detail.path, detail.value, { jsonPath: detail.jsonPath });
        this.version = 'tobe';
        this.scheduleOverlayReload();
      } catch (error) {
        this.mutationError = error instanceof Error ? error.message : String(error);
      } finally {
        this.pendingMutations -= 1;
        this.changing = this.pendingMutations > 0;
      }
    });
  };

  private tabIcon(tab: NewReleaseTab) {
    const common = (content: unknown) => svg`
      <svg viewBox="0 0 24 24" aria-hidden="true">${content}</svg>
    `;
    switch (tab) {
      case 'general': return common(svg`<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>`);
      case 'journeys': return common(svg`<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="7" r="2.5"/><path d="M8.5 16c4.5 0 2.5-8 7-8"/>`);
      case 'ontology': return common(svg`<circle cx="12" cy="5" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M10.7 7.7 7.4 15M13.3 7.7l3.3 7.3M9 18h6"/>`);
      case 'access': return common(svg`<path d="M12 3 20 6v5c0 5-3.2 8.5-8 10-4.8-1.5-8-5-8-10V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>`);
      case 'rules': return common(svg`<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>`);
      case 'workflows': return common(svg`<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.5 6h7M7.5 8l3.5 7.5M16.5 8 13 15.5"/>`);
      case 'integration': return common(svg`<path d="M9 8 6.5 5.5a3.5 3.5 0 0 0-5 5L5 14a3.5 3.5 0 0 0 5 0l1-1M15 16l2.5 2.5a3.5 3.5 0 0 0 5-5L19 10a3.5 3.5 0 0 0-5 0l-1 1M8 12h8"/>`);
      case 'review': return common(svg`<path d="M7 5h13M7 12h13M7 19h9"/><circle cx="4" cy="5" r="1.4"/><circle cx="4" cy="12" r="1.4"/><circle cx="4" cy="19" r="1.4"/>`);
    }
  }

  private renderTabs() {
    return html`
      <nav class="nr-index__tabs" role="tablist" aria-label=${this.t('a11y.tabs')} @keydown=${this.onTabKeydown}>
        ${TABS.map(tab => {
          const label = this.t(`tab.${tab}`);
          return html`
            <button
              id=${`nr-tab-${tab}`}
              type="button"
              role="tab"
              class=${this.activeTab === tab ? 'is-active' : ''}
              aria-label=${label}
              title=${label}
              aria-selected=${this.activeTab === tab ? 'true' : 'false'}
              aria-controls=${`nr-panel-${tab}`}
              tabindex=${this.activeTab === tab ? '0' : '-1'}
              @click=${() => void this.activateTab(tab)}
            ><span class="nr-tab__icon">${this.tabIcon(tab)}</span><span class="nr-tab__label">${label}</span>${this.tabHasTobe(tab) ? html`<i class="nr-tab__source" title=${this.t('tobe.tabSource')}></i>` : nothing}</button>
          `;
        })}
      </nav>
    `;
  }

  private tabHasTobe(tab: NewReleaseTab): boolean {
    return !!this.data?.artifacts.all.some(artifact => artifact.source === 'tobe' && tabForArtifactPath(artifact.path) === tab);
  }

  private tabTobePaths(tab = this.activeTab): Ns5TobeArtifactPath[] {
    return this.data?.artifacts.all
      .filter(artifact => artifact.source === 'tobe' && tabForArtifactPath(artifact.path) === tab)
      .map(artifact => artifact.path) ?? [];
  }

  private async discardPaths(paths: Ns5TobeArtifactPath[]) {
    if (!paths.length || this.changing) return;
    if (!window.confirm(this.t('tobe.discardConfirm', { count: paths.length }))) return;
    this.changing = true;
    this.mutationError = '';
    try {
      for (const path of paths) await discardTobe(this.project, this.moduleName, path);
      if (!this.data?.manifest || Object.keys(this.data.manifest.base).length <= paths.length) this.version = 'asis';
      await this.loadModule();
    } catch (error) {
      this.mutationError = error instanceof Error ? error.message : String(error);
    } finally {
      this.changing = false;
    }
  }

  private validationIssues(): NewReleaseValidationIssue[] {
    return this.data?.validation.issues ?? [];
  }

  private formatDiffValue(value: unknown): string {
    if (value === undefined) return this.t('tobe.diffEmpty');
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  }

  private renderTobeStatus() {
    const manifest = this.data?.manifest;
    if (!manifest) return nothing;
    const errors = this.validationIssues().filter(issue => issue.severity === 'error').length;
    const warnings = this.validationIssues().filter(issue => issue.severity === 'warning').length;
    return html`
      <section class="nr-index__tobe" aria-label=${this.t('tobe.statusLabel')} aria-live="polite">
        <div class="nr-index__tobe-main">
          <strong>${this.t('status.tobe', { count: manifest.changes.length })}</strong>
          <span>${this.t('tobe.byline', {
            author: manifest.author,
            date: new Date(manifest.updatedAt).toLocaleString(document.documentElement.lang || 'pt-BR'),
          })}</span>
        </div>
        <div class="nr-index__tobe-health">
          <span class=${errors ? 'has-errors' : ''}>${this.t('summary.errors', { count: errors })}</span>
          <span class=${warnings ? 'has-warnings' : ''}>${this.t('summary.warnings', { count: warnings })}</span>
        </div>
      </section>
      ${this.data?.stalePaths.length ? html`
        <section class="nr-index__stale" role="alert">
          <div><strong>${this.t('tobe.staleTitle')}</strong><p>${this.t('tobe.staleBody')}</p></div>
          <div class="nr-index__stale-list">
            ${this.data.stalePaths.map(path => html`
              <span><code>${path}</code><button type="button" ?disabled=${this.changing} @click=${() => void this.discardPaths([path])}>${this.t('tobe.recopy')}</button></span>
            `)}
          </div>
        </section>
      ` : nothing}
    `;
  }

  private renderDiffs() {
    const diffs = this.data?.diffs ?? [];
    if (!diffs.length) return nothing;
    return html`
      <details class="nr-index__diff">
        <summary>${this.t('tobe.diffTitle', { count: diffs.reduce((total, item) => total + item.entries.length, 0) })}</summary>
        ${diffs.map(diff => html`
          <section>
            <header><code>${diff.path}</code><span>${this.t('tobe.diffCount', { count: diff.entries.length })}</span></header>
            <div class="nr-index__diff-lines">
              ${diff.entries.map(entry => html`
                <article>
                  <code>${entry.jsonPath}</code>
                  <span class="is-before">${this.formatDiffValue(entry.before)}</span>
                  <span aria-hidden="true">${this.t('tobe.diffArrow')}</span>
                  <span class="is-after">${this.formatDiffValue(entry.after)}</span>
                </article>
              `)}
            </div>
          </section>
        `)}
      </details>
    `;
  }

  private renderTabContent() {
    if (this.activeTab === 'general') {
      return html`
        <new-release--widgets--general-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--general-102035>
      `;
    }
    if (this.activeTab === 'ontology') {
      return html`
        <new-release--widgets--ontology-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--ontology-102035>
      `;
    }
    if (this.activeTab === 'journeys') {
      return html`
        <new-release--widgets--journeys-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--journeys-102035>
      `;
    }
    if (this.activeTab === 'access') {
      return html`
        <new-release--widgets--access-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--access-102035>
      `;
    }
    if (this.activeTab === 'rules') {
      return html`
        <new-release--widgets--rules-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--rules-102035>
      `;
    }
    if (this.activeTab === 'workflows') {
      return html`
        <new-release--widgets--workflows-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--workflows-102035>
      `;
    }
    if (this.activeTab === 'integration') {
      return html`
        <new-release--widgets--integration-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--integration-102035>
      `;
    }
    if (this.activeTab === 'review') {
      return html`
        <new-release--widgets--review-102035
          .project=${this.project}
          .moduleName=${this.moduleName}
          .version=${this.version}
          .data=${this.data}
          .t=${this.t}
        ></new-release--widgets--review-102035>
      `;
    }
    return html`
      <section class="nr-index__placeholder">
        <span class="nr-index__placeholder-mark" aria-hidden="true"></span>
        <div>
          <h2>${this.t('tab.placeholder.title', { tab: this.t(`tab.${this.activeTab}`) })}</h2>
          <p>${this.t('tab.placeholder.body')}</p>
        </div>
      </section>
    `;
  }

  private renderLoading() {
    return html`
      <div class="nr-index__loading" aria-live="polite">
        <span>${this.t('state.loading')}</span>
        <div></div><div></div><div></div>
      </div>
    `;
  }

  private renderEmpty() {
    return html`
      <section class="nr-index__empty">
        <span aria-hidden="true"></span>
        <h2>${this.t('state.emptyTitle')}</h2>
        <p>${this.t('state.emptyBody')}</p>
      </section>
    `;
  }

  render() {
    const editableVersion = this.version === 'asis' || this.version === 'tobe';
    return html`
      <main class="nr-index" aria-busy=${this.loading ? 'true' : 'false'}>
        ${this.renderTabs()}

        ${this.renderTobeStatus()}

        ${this.loading ? this.renderLoading() : !this.data?.module ? this.renderEmpty() : html`
          ${this.data.errors.length || this.mutationError ? html`
            <section class="nr-index__errors">
              <strong>${this.t('state.errorTitle')}</strong>
              ${this.mutationError ? html`<p>${this.mutationError}</p>` : nothing}
              ${this.data.errors.map(error => html`<p>${this.t('state.errorPath', { path: error.path, message: error.message })}</p>`)}
            </section>
          ` : nothing}
          <section
            id=${`nr-panel-${this.activeTab}`}
            class="nr-index__content"
            role="tabpanel"
            aria-labelledby=${`nr-tab-${this.activeTab}`}
            tabindex="0"
          >${this.renderTabContent()}</section>
          ${this.renderDiffs()}
        `}

        ${editableVersion ? html`
          <footer class="nr-index__footer">
            <div>
              ${this.tabTobePaths().length ? html`<button class="nr-index__discard" type="button" ?disabled=${this.changing} @click=${() => void this.discardPaths(this.tabTobePaths())}>${this.t('tobe.discardTab')}</button>` : nothing}
              <span>${this.t('action.inDevelopment')}</span>
              <button type="button" disabled>${this.t('action.apply')}</button>
              <button type="button" disabled>${this.t('action.execute')}</button>
            </div>
          </footer>
        ` : nothing}
      </main>
    `;
  }
}
