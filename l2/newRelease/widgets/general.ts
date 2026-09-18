/// <mls fileReference="_102035_/l2/newRelease/widgets/general.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { languages } from '/_102027_/l2/collabLanguages.js';
import { NS5_STEP_IDS, type Ns5ModuleArtifact, type Ns5OntologyDetail } from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import {
  announceNewReleaseChange,
  type NewReleaseEditableTab,
  type NewReleaseEditMode,
  type NewReleaseTabId,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/newRelease/tobe.js';
import {
  GENERAL_DETAIL_NAME,
  GENERAL_DETAIL_TYPES,
  addGeneralDetail,
  generalOracleTab,
  removeGeneralDetail,
  setGeneralLanguages,
} from '/_102035_/l2/newRelease/widgets/generalModel.js';

const ORACLE_CHECK_IDS = Array.from({ length: 13 }, (_, index) => `I${index + 1}`);
const LANGUAGE_OPTIONS = [...languages]
  .map(language => ({ code: language.code, name: language.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

@customElement('new-release--widgets--general-102035')
export class NewReleaseGeneral102035 extends StateLitElement implements NewReleaseEditableTab<Ns5ModuleArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private issues: NewReleaseValidationIssue[] = [];
  @state() private draft: Ns5ModuleArtifact | null = null;
  @state() private newDetailName = '';
  @state() private newDetailType: Ns5OntologyDetail['type'] = 'number';
  @state() private editMessage = '';

  createRenderRoot() { return this; }

  getDraft(): Ns5ModuleArtifact | null {
    const source = this.draft || this.data?.module;
    return source ? structuredClone(source) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) {
    this.issues = issues.filter(issue => issue.artifact === 'module.defs.ts' || issue.artifact === 'module');
  }

  private currentModule(): Ns5ModuleArtifact | null {
    return this.mode === 'edit' && this.draft ? this.draft : this.data?.module || null;
  }

  private beginEdit() {
    if (!this.data?.module) return;
    this.draft = structuredClone(this.data.module);
    this.mode = 'edit';
    this.dirty = false;
    this.editMessage = '';
  }

  private cancelEdit() {
    this.draft = null;
    this.mode = 'view';
    this.dirty = false;
    this.newDetailName = '';
    this.editMessage = '';
  }

  private updateDraft(next: Ns5ModuleArtifact) {
    this.draft = next;
    this.dirty = true;
    this.editMessage = '';
  }

  private saveEdit() {
    if (!this.draft || !this.dirty) return;
    announceNewReleaseChange(this, {
      path: 'module.defs.ts',
      jsonPath: '$',
      value: structuredClone(this.draft),
    });
    this.mode = 'view';
    this.dirty = false;
    this.draft = null;
    this.newDetailName = '';
  }

  private addLanguage(code: string) {
    if (!this.draft || !code || this.draft.productLanguages.includes(code)) return;
    this.updateDraft(setGeneralLanguages(this.draft, [...this.draft.productLanguages, code], this.draft.defaultLanguage));
  }

  private removeLanguage(code: string) {
    if (!this.draft || this.draft.productLanguages.length <= 1) return;
    this.updateDraft(setGeneralLanguages(
      this.draft,
      this.draft.productLanguages.filter(language => language !== code),
      this.draft.defaultLanguage,
    ));
  }

  private setDefaultLanguage(code: string) {
    if (!this.draft || !this.draft.productLanguages.includes(code)) return;
    this.updateDraft(setGeneralLanguages(this.draft, this.draft.productLanguages, code));
  }

  private setDetailType(name: string, type: Ns5OntologyDetail['type']) {
    if (!this.draft?.details?.[name]) return;
    this.updateDraft({
      ...this.draft,
      details: {
        ...this.draft.details,
        [name]: { ...this.draft.details[name], type },
      },
    });
  }

  private addDetail() {
    if (!this.draft) return;
    const name = this.newDetailName.trim();
    if (!GENERAL_DETAIL_NAME.test(name)) {
      this.editMessage = this.t('general.detailNameInvalid');
      return;
    }
    if (this.draft.details?.[name]) {
      this.editMessage = this.t('general.detailNameDuplicate');
      return;
    }
    this.updateDraft(addGeneralDetail(this.draft, name, this.newDetailType));
    this.newDetailName = '';
  }

  private removeDetail(name: string) {
    if (!this.draft) return;
    this.updateDraft(removeGeneralDetail(this.draft, name));
  }

  private formatDate(value?: string): string {
    if (!value) return this.t('general.notRecorded');
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return value;
    return date.toLocaleString(document.documentElement.lang || this.currentModule()?.userLanguage || 'pt-BR');
  }

  private metric(key: string, value: number | undefined) {
    return html`<article class="nr-general__metric"><span>${this.t(key)}</span><strong>${value ?? 0}</strong></article>`;
  }

  private renderProgress() {
    const failed = NS5_STEP_IDS.find(step => this.data?.pipeline?.steps[step]?.status === 'failed');
    const failedError = failed ? this.data?.pipeline?.steps[failed]?.error : '';
    return html`
      <section class="nr-general__progress" aria-label=${this.t('a11y.progress')}>
        <div class="nr-general__section-title">${this.t('summary.pipeline')}</div>
        <ol>
          ${NS5_STEP_IDS.map((step, index) => {
            const status = this.data?.pipeline?.steps[step]?.status ?? 'pending';
            return html`
              <li class="nr-step nr-step--${status}">
                <span class="nr-step__marker">${index + 1}</span>
                <span class="nr-step__copy"><strong>${this.t(`step.${step}`)}</strong><small>${this.t(`step.${status}`)}</small></span>
              </li>
            `;
          })}
        </ol>
        ${failedError ? html`
          <div class="nr-general__step-error" role="alert">
            <strong>${this.t('general.failedStep', { step: this.t(`step.${failed}`) })}</strong><span>${failedError}</span>
          </div>
        ` : nothing}
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
      <section class="nr-general__summary">
        <article class="nr-summary-card nr-summary-card--oracle nr-summary-card--${report?.finalStatus || 'pending'}">
          <span>${this.t('summary.oracle')}</span>
          <strong>${report?.finalStatus === 'passed' ? this.t('summary.oraclePassed') : report?.finalStatus === 'failed' ? this.t('summary.oracleFailed') : this.t('summary.oraclePending')}</strong>
          <div><small>${this.t('summary.errors', { count: errors })}</small><small>${this.t('summary.warnings', { count: warnings })}</small></div>
        </article>
        <article class="nr-summary-card"><span>${this.t('summary.cost')}</span><strong>${typeof cost === 'number' ? this.t('summary.costValue', { value: cost.toFixed(4) }) : this.t('summary.costEmpty')}</strong></article>
        <article class="nr-summary-card"><span>${this.t('summary.changes')}</span><strong>${changes ? this.t('summary.changesValue', { count: changes }) : this.t('summary.changesEmpty')}</strong></article>
      </section>
    `;
  }

  private renderIdentity(module: Ns5ModuleArtifact) {
    const lastRun = this.data?.run?.savedAt || this.data?.pipeline?.updatedAt;
    return html`
      <section class="nr-general__identity-grid" aria-label=${this.t('general.identity')}>
        <article><span>${this.t('general.moduleName')}</span><strong><code>${module.moduleName}</code></strong></article>
        <article><span>${this.t('general.lastRun')}</span><strong>${this.formatDate(lastRun)}</strong><small>${this.data?.run?.verdict || this.data?.pipeline?.status || ''}</small></article>
        <article><span>${this.t('general.requestLanguage')}</span><strong>${module.userLanguage}</strong></article>
      </section>
    `;
  }

  private renderLanguagePanel(module: Ns5ModuleArtifact) {
    const available = LANGUAGE_OPTIONS.filter(option => !module.productLanguages.includes(option.code));
    return html`
      <section class="nr-general__language-panel" aria-label=${this.t('general.languageScope')}>
        <header>
          <div><span>${this.t('general.languageConfig')}</span><small>${this.t('general.languageScope')}</small></div>
          ${this.mode === 'view'
            ? html`<button type="button" class="nr-button nr-button--secondary" @click=${this.beginEdit}>${this.t('general.edit')}</button>`
            : html`<span class="nr-general__editing">${this.t('general.editing')}</span>`}
        </header>
        <div class="nr-general__languages">
          <div><span>${this.t('general.userLanguage')}</span><strong>${module.userLanguage || '—'}</strong><small>${this.t('general.readonly')}</small></div>
          <div>
            <label for="nr-general-default">${this.t('general.language')}</label>
            ${this.mode === 'edit' ? html`
              <select id="nr-general-default" .value=${module.defaultLanguage} @change=${(event: Event) => this.setDefaultLanguage((event.target as HTMLSelectElement).value)}>
                ${module.productLanguages.map(language => html`<option value=${language}>${language}</option>`)}
              </select>
            ` : html`<strong>${module.defaultLanguage || '—'}</strong>`}
          </div>
          <div class="nr-general__product-languages">
            <span>${this.t('general.languages')}</span>
            <p>${module.productLanguages.map(language => html`
              <strong>${language}${this.mode === 'edit' ? html`<button type="button" aria-label=${this.t('general.removeLanguage', { language })} ?disabled=${module.productLanguages.length <= 1} @click=${() => this.removeLanguage(language)}>&times;</button>` : nothing}</strong>
            `)}</p>
            ${this.mode === 'edit' ? html`
              <label class="nr-general__add-language"><span>${this.t('general.addLanguage')}</span>
                <select @change=${(event: Event) => {
                  const select = event.target as HTMLSelectElement;
                  this.addLanguage(select.value);
                  select.value = '';
                }}>
                  <option value="">${this.t('general.chooseLanguage')}</option>
                  ${available.map(option => html`<option value=${option.code}>${option.name} · ${option.code}</option>`)}
                </select>
              </label>
            ` : nothing}
          </div>
        </div>
      </section>
    `;
  }

  private renderDetails(module: Ns5ModuleArtifact) {
    const details = Object.entries(module.details || {});
    return html`
      <section class="nr-general__details-section">
        <header><div><span class="nr-general__section-title">${this.t('general.detailsTitle')}</span><p>${this.t('general.detailsDescription')}</p></div><strong>${this.t('general.detailsCount', { count: details.length })}</strong></header>
        ${details.length ? html`
          <div class="nr-general__detail-grid">
            ${details.map(([name, detail]) => html`
              <article class="nr-general__detail-card">
                <div><code>${name}</code>${this.mode === 'edit' ? html`<button type="button" class="nr-general__remove-detail" aria-label=${this.t('general.removeDetail', { name })} @click=${() => this.removeDetail(name)}>&times;</button>` : nothing}</div>
                ${this.mode === 'edit' ? html`
                  <label>${this.t('general.detailType')}<select .value=${detail.type} @change=${(event: Event) => this.setDetailType(name, (event.target as HTMLSelectElement).value as Ns5OntologyDetail['type'])}>${GENERAL_DETAIL_TYPES.map(type => html`<option value=${type}>${type}</option>`)}</select></label>
                ` : html`<span class="nr-general__detail-type">${detail.type}</span>`}
                <p>${detail.description}</p>
              </article>
            `)}
          </div>
        ` : html`<div class="nr-general__empty-section">${this.t('general.detailsEmpty')}</div>`}
        ${this.mode === 'edit' ? html`
          <div class="nr-general__add-detail">
            <label>${this.t('general.detailName')}<input type="text" .value=${this.newDetailName} placeholder="totalDoMes" @input=${(event: Event) => { this.newDetailName = (event.target as HTMLInputElement).value; this.editMessage = ''; }}></label>
            <label>${this.t('general.detailType')}<select .value=${this.newDetailType} @change=${(event: Event) => { this.newDetailType = (event.target as HTMLSelectElement).value as Ns5OntologyDetail['type']; }}>${GENERAL_DETAIL_TYPES.map(type => html`<option value=${type}>${type}</option>`)}</select></label>
            <button type="button" class="nr-button nr-button--secondary" @click=${this.addDetail}>${this.t('general.addDetail')}</button>
            <small>${this.t('general.detailDescriptionAutomatic')}</small>
          </div>
          ${this.editMessage ? html`<p class="nr-general__edit-message" role="alert">${this.editMessage}</p>` : nothing}
        ` : nothing}
      </section>
    `;
  }

  private renderPrompt(module: Ns5ModuleArtifact) {
    const invocation = this.data?.pipeline?.invocation;
    const rebuild = this.data?.pipeline?.rebuildAll;
    return html`
      <section class="nr-general__prompt">
        <h3>${this.t('general.promptTitle')}</h3>
        <blockquote>${module.sourcePrompt || this.t('general.promptEmpty')}</blockquote>
        <div class="nr-general__invocation">
          <span><small>${this.t('general.invocationModule')}</small><strong>${invocation?.module || module.moduleName}</strong></span>
          <span><small>${this.t('general.invocationFast')}</small><strong>${invocation?.fast ? this.t('general.yes') : this.t('general.no')}</strong></span>
          <span><small>${this.t('general.invocationRebuild')}</small><strong>${invocation?.rebuildAll ? this.t('general.yes') : this.t('general.no')}</strong></span>
        </div>
        ${rebuild ? html`<div class="nr-general__rebuild"><strong>${this.t('general.rebuildTitle')}</strong><span>${this.t('general.rebuildSummary', { deleted: rebuild.deleted.length, edited: rebuild.edited.length, date: this.formatDate(rebuild.at) })}</span></div>` : nothing}
      </section>
    `;
  }

  private renderCostChart() {
    const byStep = this.data?.run?.cost?.byStep;
    const values = NS5_STEP_IDS.map(step => byStep?.[step] || 0);
    const max = Math.max(...values, 0);
    return html`
      <section class="nr-general__cost-section">
        <header><span class="nr-general__section-title">${this.t('general.costByStep')}</span><strong>${typeof this.data?.run?.cost?.total === 'number' ? this.t('summary.costValue', { value: this.data.run.cost.total.toFixed(4) }) : this.t('summary.costEmpty')}</strong></header>
        ${max ? html`<div class="nr-general__cost-chart">${NS5_STEP_IDS.map(step => {
          const value = byStep?.[step] || 0;
          const width = max ? Math.max((value / max) * 100, value ? 2 : 0) : 0;
          return html`<div class="nr-cost-row"><span>${this.t(`step.${step}`)}</span><div><i style=${`width:${width}%`}></i></div><strong>${this.t('general.costValue', { value: value.toFixed(4) })}</strong></div>`;
        })}</div>` : html`<div class="nr-general__empty-section">${this.t('general.costEmpty')}</div>`}
      </section>
    `;
  }

  private renderAdjustments() {
    const adjustments = NS5_STEP_IDS.flatMap(step => (this.data?.pipeline?.steps[step]?.normalizations || []).map(item => ({ step, ...item })));
    const liftedEntities = this.data?.pipeline?.steps.ontology30?.liftedAggregateEntities || [];
    const liftedFields = this.data?.pipeline?.steps.ontology30?.liftedFields || [];
    return html`
      <section class="nr-general__adjustments">
        <header><span class="nr-general__section-title">${this.t('general.adjustmentsTitle')}</span><p>${this.t('general.adjustmentsDescription')}</p></header>
        ${adjustments.length || liftedEntities.length || liftedFields.length ? html`
          <div class="nr-general__adjustment-list">
            ${adjustments.map(item => html`<article><span>${this.t(`step.${item.step}`)}</span><strong>${this.t('general.normalization', { kind: item.kind })}</strong><p>${item.detail}</p></article>`)}
            ${liftedEntities.map(entity => html`<article class="is-lifted"><span>${this.t('step.ontology30')}</span><strong>${this.t('general.liftedEntity', { entity })}</strong><p>${this.t('general.liftedEntityDescription')}</p></article>`)}
            ${liftedFields.map(field => html`<article class="is-lifted"><span>${this.t('step.ontology30')}</span><strong>${this.t('general.liftedField', { entity: field.entityId })}</strong><p>${field.detail}</p></article>`)}
          </div>
        ` : html`<div class="nr-general__empty-section">${this.t('general.adjustmentsEmpty')}</div>`}
      </section>
    `;
  }

  private navigate(tab: NewReleaseTabId) {
    this.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, composed: true, detail: { tab } }));
  }

  private renderOracle() {
    const checks = new Map((this.data?.finalizeReport?.checks || []).map(check => [check.checkId, check]));
    return html`
      <section class="nr-general__oracle">
        <header><span class="nr-general__section-title">${this.t('general.oracleTitle')}</span><p>${this.t('general.oracleDescription')}</p></header>
        <div class="nr-general__oracle-grid">
          ${ORACLE_CHECK_IDS.map(checkId => {
            const check = checks.get(checkId);
            const status = check?.status || 'pending';
            const tab = generalOracleTab(checkId);
            return html`
              <button type="button" class="nr-oracle-card nr-oracle-card--${status}" @click=${() => this.navigate(tab)}>
                <span><strong>${checkId}</strong><i>${this.t(`oracle.status.${status}`)}</i></span>
                <p>${this.t(`oracle.${checkId}`)}</p>
                <small>${check ? this.t('general.oracleCounts', { errors: check.errorCount, warnings: check.warningCount }) : this.t('general.oracleUnavailable')}</small>
                <em>${this.t('general.openTab', { tab: this.t(`tab.${tab}`) })}</em>
              </button>
            `;
          })}
        </div>
      </section>
    `;
  }

  private renderEditActions() {
    if (this.mode !== 'edit') return nothing;
    return html`
      <div class="nr-general__edit-actions">
        <span>${this.dirty ? this.t('general.unsaved') : this.t('general.noChanges')}</span>
        <div><button type="button" class="nr-button nr-button--secondary" @click=${this.cancelEdit}>${this.t('general.cancel')}</button><button type="button" class="nr-button nr-button--primary" ?disabled=${!this.dirty} @click=${this.saveEdit}>${this.t('general.save')}</button></div>
      </div>
    `;
  }

  render() {
    const module = this.currentModule();
    if (!module) return nothing;
    const counts = this.data?.finalizeReport?.counts ?? {};
    const actors = this.data?.pipeline?.steps.module10?.actors?.length ?? 0;
    const issues = this.data?.validation.issues.filter(issue => issue.artifact === 'module.defs.ts' || issue.artifact === 'module') ?? this.issues;
    return html`
      <section class="nr-general" aria-label=${this.t('general.title', { module: module.title || module.moduleName })}>
        <div class="nr-general__foundation">
          ${this.renderLanguagePanel(module)}
          <div class="nr-general__metrics">${this.metric('general.actors', actors)}${this.metric('general.journeys', counts.journeys)}${this.metric('general.entities', counts.entities)}${this.metric('general.rules', counts.rules)}</div>
          ${issues.length ? html`<section class="nr-general__issues" aria-live="polite"><strong>${this.t('general.validationTitle')}</strong>${issues.map(issue => html`<p><code>${issue.path}</code> ${issue.message}</p>`)}</section>` : nothing}
          <details class="nr-general__group">
            <summary><div><strong>${this.t('general.advancedTitle')}</strong><small>${this.t('general.advancedDescription')}</small></div><span aria-hidden="true">⌄</span></summary>
            <div class="nr-general__group-content">
              ${this.renderIdentity(module)}
              ${this.renderDetails(module)}
              ${this.renderPrompt(module)}
            </div>
          </details>
          <details class="nr-general__group">
            <summary><div><strong>${this.t('general.processTitle')}</strong><small>${this.t('general.processDescription')}</small></div><span aria-hidden="true">⌄</span></summary>
            <div class="nr-general__group-content nr-general__group-content--process">
              ${this.renderProgress()}
              ${this.renderSummary()}
              ${this.renderCostChart()}
              ${this.renderAdjustments()}
              ${this.renderOracle()}
            </div>
          </details>
          ${this.renderEditActions()}
        </div>
      </section>
    `;
  }
}
