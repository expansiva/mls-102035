/// <mls fileReference="_102035_/l2/newRelease/widgets/general.ts" enhancement="_102027_/l2/enhancementLit" />

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { NewReleaseModuleData, NewReleaseVersion } from '/_102035_/l2/newRelease/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/newReleaseI18n.js';

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

  render() {
    const module = this.data?.module;
    const counts = this.data?.finalizeReport?.counts ?? {};
    const actors = this.data?.pipeline?.steps.module10?.actors?.length ?? 0;
    const title = module?.title || this.moduleName;
    const languages = module?.productLanguages?.join(' · ') || module?.defaultLanguage || '—';

    return html`
      <section class="nr-general" aria-labelledby="nr-general-title">
        <div class="nr-general__intro">
          <div>
            <span class="nr-general__eyebrow">${this.t('general.eyebrow')}</span>
            <h2 id="nr-general-title">${this.t('general.title', { module: title })}</h2>
            <p>${this.t('general.description')}</p>
          </div>
          <span class="nr-general__schema">${this.t('general.schema', { version: module?.schemaVersion ?? '—' })}</span>
        </div>

        <div class="nr-general__languages">
          <div>
            <span>${this.t('general.language')}</span>
            <strong>${module?.defaultLanguage || '—'}</strong>
          </div>
          <div>
            <span>${this.t('general.languages')}</span>
            <strong>${languages}</strong>
          </div>
        </div>

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
      </section>
    `;
  }
}
