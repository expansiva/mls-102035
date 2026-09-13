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
  failedStepOf,
  readNs5Module,
  type NewReleaseModuleData,
} from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import {
  createNewReleaseTranslator,
  loadNewReleaseMessages,
  observeNewReleaseLanguage,
  type NewReleaseTranslate,
} from '/_102035_/l2/newRelease/helpers/i18n.js';
import '/_102035_/l2/newRelease/widgets/general.js';

type NewReleaseTab = 'general' | 'journeys' | 'ontology' | 'access' | 'rules' | 'workflows' | 'integration';

const TABS: NewReleaseTab[] = ['general', 'journeys', 'ontology', 'access', 'rules', 'workflows', 'integration'];

@customElement('new-release--widgets--index-102035')
export class NewReleaseIndex102035 extends StateLitElement {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;

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
    window.addEventListener(NEW_RELEASE_CONTEXT_EVENT, this.onContextChange as EventListener);
    void this.initialize();
  }

  disconnectedCallback() {
    this.languageObserver?.disconnect();
    this.removeEventListener('nr-navigate', this.onNavigate as EventListener);
    window.removeEventListener(NEW_RELEASE_CONTEXT_EVENT, this.onContextChange as EventListener);
    super.disconnectedCallback();
  }

  private async initialize() {
    await this.loadLanguage();
    await this.loadModule();
  }

  private async loadLanguage() {
    this.t = createNewReleaseTranslator(await loadNewReleaseMessages(this.project || Number(mls.actualProject || 0)));
    this.requestUpdate();
  }

  private async loadModule() {
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

  private statusLabel(): string {
    const status = this.data?.pipeline?.status;
    if (!status) return this.t('status.unknown');
    if (status === 'failed') {
      const failedStep = failedStepOf(this.data?.pipeline ?? null);
      const step = failedStep ? this.t(`step.${failedStep}`) : this.t('step.pending');
      return this.t('status.failed', { step });
    }
    return this.t(`status.${status}`);
  }

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
    }
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
          ><span class="nr-tab__icon">${this.tabIcon(tab)}</span><span>${this.t(`tab.${tab}`)}</span></button>
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
    const title = this.data?.module?.title || this.moduleName;
    const status = this.data?.pipeline?.status || 'unknown';
    return html`
      <main class="nr-index">
        <header class="nr-index__hero">
          <div class="nr-index__hero-copy">
            <span class="nr-index__eyebrow">${this.t('app.eyebrow')}</span>
            <h1>${title || this.t('app.title')}</h1>
            <p>${this.t('app.subtitle')}</p>
          </div>
          ${this.data?.module ? html`
            <span class="nr-index__status nr-index__status--${status}" aria-label=${this.t('a11y.status')}>
              <i aria-hidden="true"></i>${this.statusLabel()}
            </span>
          ` : nothing}
        </header>

        ${this.renderTabs()}

        ${this.loading ? this.renderLoading() : !this.data?.module ? this.renderEmpty() : html`
          ${this.data.errors.length ? html`
            <section class="nr-index__errors">
              <strong>${this.t('state.errorTitle')}</strong>
              ${this.data.errors.map(error => html`<p>${this.t('state.errorPath', { path: error.path, message: error.message })}</p>`)}
            </section>
          ` : nothing}
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
