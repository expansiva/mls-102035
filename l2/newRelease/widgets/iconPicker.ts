/// <mls fileReference="_102035_/l2/newRelease/widgets/iconPicker.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, svg } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { lucideArtwork } from '/_102035_/l2/newRelease/widgets/lucideArtwork.js';
import { iconNeedsFallback, resolveNewReleaseIcon, searchNewReleaseIcons, type LucideName } from '/_102035_/l2/newRelease/widgets/iconModel.js';

export function renderNewReleaseIcon(value: string | undefined, fallback: LucideName) {
  // unsafeSVG receives only checked, versioned local artwork, never user text or URLs.
  return svg`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${unsafeSVG(lucideArtwork(resolveNewReleaseIcon(value, fallback))!)}</svg>`;
}

@customElement('new-release--widgets--icon-picker-102035')
export class NewReleaseIconPicker102035 extends StateLitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) fallback: LucideName = 'route';
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @state() private query = '';
  @state() private limit = 60;
  createRenderRoot() { return this; }
  private choose(value: string) {
    if (value === this.value) return;
    this.dispatchEvent(new CustomEvent<string>('nr-icon-selected', { detail: value, bubbles: true, composed: true }));
  }
  render() {
    const matches = searchNewReleaseIcons(this.query);
    return html`<div class="nr-icon-picker">
      <p>${this.t('icons.label')}</p>
      <div class="nr-icon-picker__preview">${renderNewReleaseIcon(this.value, this.fallback)}<span>${this.value || this.t('icons.default')}</span></div>
      ${iconNeedsFallback(this.value) ? html`<p class="nr-icon-picker__notice" role="status">${this.t(this.value ? 'icons.unknown' : 'icons.absent')}</p>` : nothing}
      <details><summary>${this.t('icons.choose')}</summary>
        <label>${this.t('icons.search')}<input type="search" .value=${this.query} placeholder=${this.t('icons.searchPlaceholder')} @input=${(event: Event) => {this.query = (event.currentTarget as HTMLInputElement).value; this.limit = 60;}}></label>
        <button type="button" @click=${() => this.choose('')}>${this.t('icons.default')}</button>
        <p role="status">${this.t('icons.results', {count: matches.length})}</p>
        <div class="nr-icon-picker__results">${matches.slice(0, this.limit).map(name => html`<button type="button" aria-pressed=${this.value === name} @click=${() => this.choose(name)}>${renderNewReleaseIcon(name, this.fallback)}<span>${name}</span></button>`)}</div>
        ${matches.length > this.limit ? html`<button type="button" @click=${() => {this.limit += 60;}}>${this.t('icons.more')}</button>` : nothing}
      </details>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'new-release--widgets--icon-picker-102035': NewReleaseIconPicker102035; } }
