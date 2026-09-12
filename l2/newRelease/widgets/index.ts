/// <mls fileReference="_102035_/l2/newRelease/widgets/index.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { NS5_STEP_IDS, type Ns5PipelineStatus, type Ns5StepId } from '/_102035_/l2/solution/types.js';
import {
  failedStepOf,
  listNs5Modules,
  listReadableProjects,
  readNs5Module,
  type NewReleaseModuleData,
  type NewReleaseVersion,
} from '/_102035_/l2/newRelease/l4Reader.js';
import {
  createNewReleaseTranslator,
  loadNewReleaseMessages,
  observeNewReleaseLanguage,
  type NewReleaseTranslate,
} from '/_102035_/l2/newRelease/newReleaseI18n.js';
import '/_102035_/l2/newRelease/widgets/general.js';

type NewReleaseTab = 'general' | 'journeys' | 'ontology' | 'access' | 'rules' | 'workflows' | 'integration';

const TABS: NewReleaseTab[] = ['general', 'journeys', 'ontology', 'access', 'rules', 'workflows', 'integration'];

interface ModuleSummary {
  name: string;
  title: string;
  status: Ns5PipelineStatus | 'unknown';
  failedStep: Ns5StepId | null;
  tobeChanges: number;
}

@customElement('new-release--widgets--index-102035')
export class NewReleaseIndex102035 extends StateLitElement {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;

  @state() private projects: number[] = [];
  @state() private modules: ModuleSummary[] = [];
  @state() private activeTab: NewReleaseTab = 'general';
  @state() private loading = true;

  private t: NewReleaseTranslate = key => key;
  private languageObserver?: MutationObserver;
  private loadToken = 0;

  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this.project = this.project || Number(mls.actualProject || 0);
    this.languageObserver = observeNewReleaseLanguage(() => this.loadLanguage());
    this.addEventListener('nr-navigate', this.onNavigate as EventListener);
    this.initialize();
  }

  disconnectedCallback() {
    this.languageObserver?.disconnect();
    this.removeEventListener('nr-navigate', this.onNavigate as EventListener);
    super.disconnectedCallback();
  }

  private async initialize() {
    await this.loadLanguage();
    await this.loadProject();
  }

  private async loadLanguage() {
    this.t = createNewReleaseTranslator(await loadNewReleaseMessages(this.project || Number(mls.actualProject || 0)));
    this.requestUpdate();
  }

  private async loadProject() {
    const token = ++this.loadToken;
    this.loading = true;
    this.projects = listReadableProjects();
    if (!this.project || !this.projects.includes(this.project)) this.project = this.projects[0] ?? this.project;

    const names = this.project ? listNs5Modules(this.project) : [];
    const summaries = await Promise.all(names.map(async name => {
      const value = await readNs5Module(this.project, name, 'asis');
      return {
        name,
        title: value.module?.title || name,
        status: value.pipeline?.status || 'unknown',
        failedStep: failedStepOf(value.pipeline),
        tobeChanges: value.tobeChanges,
      } satisfies ModuleSummary;
    }));
    if (token !== this.loadToken) return;

    this.modules = summaries;
    if (!this.moduleName || !summaries.some(module => module.name === this.moduleName)) {
      const actualModule = String((mls as unknown as { actualModule?: string }).actualModule || '');
      this.moduleName = summaries.some(module => module.name === actualModule) ? actualModule : summaries[0]?.name ?? '';
    }
    await this.loadModule(token);
  }

  private async loadModule(parentToken?: number) {
    const token = parentToken ?? ++this.loadToken;
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

  private onNavigate = (event: Event) => {
    const tab = (event as CustomEvent<{ tab?: NewReleaseTab }>).detail?.tab;
    if (tab && TABS.includes(tab)) this.activeTab = tab;
  };

  private async onProjectChange(event: Event) {
    this.project = Number((event.target as HTMLSelectElement).value);
    this.moduleName = '';
    this.version = 'asis';
    await this.loadLanguage();
    await this.loadProject();
  }

  private async onModuleChange(event: Event) {
    this.moduleName = (event.target as HTMLSelectElement).value;
    this.version = 'asis';
    await this.loadModule();
  }

  private async onVersionChange(event: Event) {
    this.version = (event.target as HTMLSelectElement).value as NewReleaseVersion;
    await this.loadModule();
  }

  private currentSummary(): ModuleSummary | undefined {
    return this.modules.find(module => module.name === this.moduleName);
  }

  private statusLabel(summary?: ModuleSummary): string {
    if (!summary) return this.t('status.unknown');
    if (summary.status === 'failed') {
      const step = summary.failedStep ? this.t(`step.${summary.failedStep}`) : this.t('step.pending');
      return this.t('status.failed', { step });
    }
    return this.t(`status.${summary.status}`);
  }

  private renderSelectors() {
    const summary = this.currentSummary();
    return html`
      <div class="nr-index__selectors">
        <label>
          <span>${this.t('selector.project')}</span>
          <select .value=${String(this.project)} @change=${this.onProjectChange}>
            ${this.projects.map(project => html`<option value=${project}>${project}</option>`)}
          </select>
        </label>
        <label class="nr-index__module-select">
          <span>${this.t('selector.module')}</span>
          <select .value=${this.moduleName} @change=${this.onModuleChange}>
            ${this.modules.map(module => html`<option value=${module.name}>${module.title}</option>`)}
          </select>
        </label>
        <label>
          <span>${this.t('selector.version')}</span>
          <select .value=${this.version} @change=${this.onVersionChange}>
            <option value="asis">${this.t('version.asis')}</option>
            <option value="tobe" ?disabled=${!summary?.tobeChanges}>${this.t('version.tobe')}</option>
            <option value="history" disabled title=${this.t('a11y.disabledVersion')}>${this.t('version.history')}</option>
          </select>
        </label>
      </div>
    `;
  }

  private renderProgress() {
    return html`
      <section class="nr-index__progress" aria-label=${this.t('a11y.progress')}>
        <div class="nr-index__section-title">${this.t('summary.pipeline')}</div>
        <ol>
          ${NS5_STEP_IDS.map((step, index) => {
            const status = this.data?.pipeline?.steps[step]?.status ?? 'pending';
            return html`
              <li class="nr-step nr-step--${status}">
                <span class="nr-step__marker">${index + 1}</span>
                <span class="nr-step__copy">
                  <strong>${this.t(`step.${step}`)}</strong>
                  <small>${this.t(`step.${status}`)}</small>
                </span>
              </li>
            `;
          })}
        </ol>
      </section>
    `;
  }

  private renderSummary() {
    const report = this.data?.finalizeReport;
    const errors = report?.errors?.length ?? 0;
    const warnings = report?.warnings?.length ?? 0;
    const cost = this.data?.run?.cost?.total;
    const changes = this.data?.tobeChanges ?? 0;
    return html`
      <section class="nr-index__summary">
        <article class="nr-summary-card nr-summary-card--oracle">
          <span>${this.t('summary.oracle')}</span>
          <strong>${report?.finalStatus === 'passed' ? this.t('summary.oraclePassed') : this.t('summary.oraclePending')}</strong>
          <div><small>${this.t('summary.errors', { count: errors })}</small><small>${this.t('summary.warnings', { count: warnings })}</small></div>
        </article>
        <article class="nr-summary-card">
          <span>${this.t('summary.cost')}</span>
          <strong>${typeof cost === 'number' ? this.t('summary.costValue', { value: cost.toFixed(2) }) : this.t('summary.costEmpty')}</strong>
        </article>
        <article class="nr-summary-card">
          <span>${this.t('summary.changes')}</span>
          <strong>${changes ? this.t('summary.changesValue', { count: changes }) : this.t('summary.changesEmpty')}</strong>
        </article>
      </section>
    `;
  }

  private renderTabs() {
    return html`
      <nav class="nr-index__tabs" aria-label=${this.t('a11y.tabs')}>
        ${TABS.map(tab => html`
          <button
            type="button"
            class=${this.activeTab === tab ? 'is-active' : ''}
            aria-selected=${this.activeTab === tab ? 'true' : 'false'}
            @click=${() => { this.activeTab = tab; }}
          >${this.t(`tab.${tab}`)}</button>
        `)}
      </nav>
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
    const summary = this.currentSummary();
    const title = this.data?.module?.title || summary?.title || this.moduleName;
    return html`
      <main class="nr-index">
        <header class="nr-index__hero">
          <div class="nr-index__hero-copy">
            <span class="nr-index__eyebrow">${this.t('app.eyebrow')}</span>
            <h1>${title || this.t('app.title')}</h1>
            <p>${this.t('app.subtitle')}</p>
          </div>
          ${summary ? html`
            <span class="nr-index__status nr-index__status--${summary.status}" aria-label=${this.t('a11y.status')}>
              <i aria-hidden="true"></i>${this.statusLabel(summary)}
            </span>
          ` : nothing}
          ${this.renderSelectors()}
        </header>

        ${this.loading ? this.renderLoading() : !this.data?.module ? this.renderEmpty() : html`
          ${this.data.errors.length ? html`
            <section class="nr-index__errors">
              <strong>${this.t('state.errorTitle')}</strong>
              ${this.data.errors.map(error => html`<p>${this.t('state.errorPath', { path: error.path, message: error.message })}</p>`)}
            </section>
          ` : nothing}
          ${this.renderProgress()}
          ${this.renderSummary()}
          ${this.renderTabs()}
          <section class="nr-index__content">${this.renderTabContent()}</section>
        `}

        <footer class="nr-index__footer">
          <p>${this.t('footer.hint')}</p>
          <div>
            <span>${this.t('action.inDevelopment')}</span>
            <button type="button" disabled>${this.t('action.apply')}</button>
            <button type="button" disabled>${this.t('action.execute')}</button>
          </div>
        </footer>
      </main>
    `;
  }
}
