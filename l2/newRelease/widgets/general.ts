/// <mls fileReference="_102035_/l2/newRelease/widgets/general.ts" enhancement="_102027_/l2/enhancementLit" />

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { Ns5StepId } from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';

const NS5_STEP_IDS: Ns5StepId[] = [
  'module10',
  'journeys20',
  'ontology30',
  'rules40',
  'workflows50',
  'access60',
  'integration70',
  'finalize80',
];

@customElement('new-release--widgets--general-102035')
export class NewReleaseGeneral102035 extends StateLitElement {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;

  createRenderRoot() { return this; }

  private metric(key: string, value: number | undefined) {
    return html`
      <article class="nr-general__metric">
        <span>${this.t(key)}</span>
        <strong>${value ?? 0}</strong>
      </article>
    `;
  }

  private renderProgress() {
    return html`
      <section class="nr-general__progress" aria-label=${this.t('a11y.progress')}>
        <div class="nr-general__section-title">${this.t('summary.pipeline')}</div>
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
      <section class="nr-general__summary">
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

  render() {
    const module = this.data?.module;
    const counts = this.data?.finalizeReport?.counts ?? {};
    const actors = this.data?.pipeline?.steps.module10?.actors?.length ?? 0;
    const title = module?.title || this.moduleName;
    const productLanguages = module?.productLanguages?.length
      ? module.productLanguages
      : [module?.defaultLanguage].filter((value): value is string => !!value);

    return html`
      <section class="nr-general" aria-labelledby="nr-general-title">
        ${this.renderProgress()}
        ${this.renderSummary()}

        <div class="nr-general__foundation">
          <div class="nr-general__intro">
            <div>
              <span class="nr-general__eyebrow">${this.t('general.eyebrow')}</span>
              <h2 id="nr-general-title">${this.t('general.title', { module: title })}</h2>
              <p>${this.t('general.description')}</p>
            </div>
            <span class="nr-general__schema">${this.t('general.schema', { version: module?.schemaVersion ?? '—' })}</span>
          </div>

          <section class="nr-general__language-panel" aria-label=${this.t('general.languageScope')}>
            <header>
              <span>${this.t('general.languageConfig')}</span>
              <small>${this.t('general.languageScope')}</small>
            </header>
            <div class="nr-general__languages">
              <div>
                <span>${this.t('general.userLanguage')}</span>
                <strong>${module?.userLanguage || '—'}</strong>
              </div>
              <div>
                <span>${this.t('general.language')}</span>
                <strong>${module?.defaultLanguage || '—'}</strong>
              </div>
              <div>
                <span>${this.t('general.languages')}</span>
                <p>${productLanguages.map(language => html`<strong>${language}</strong>`)}</p>
              </div>
            </div>
          </section>

          <div class="nr-general__metrics">
            ${this.metric('general.actors', actors)}
            ${this.metric('general.journeys', counts.journeys)}
            ${this.metric('general.entities', counts.entities)}
            ${this.metric('general.rules', counts.rules)}
          </div>

          <article class="nr-general__prompt">
            <div class="nr-general__prompt-mark" aria-hidden="true"></div>
            <div>
              <h3>${this.t('general.promptTitle')}</h3>
              <p>${module?.sourcePrompt || this.t('general.promptEmpty')}</p>
            </div>
          </article>
        </div>
      </section>
    `;
  }
}
