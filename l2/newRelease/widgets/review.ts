/// <mls fileReference="_102035_/l2/newRelease/widgets/review.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { readModuleMenu, type MenuReadResult } from '/_102035_/l2/newRelease/helpers/menuReader.js';
import { readReviewPoolBoxes, type ReviewPoolBoxView } from '/_102035_/l2/newRelease/helpers/poolBoxes.js';
import {
  actorIdFromKey,
  buildReviewView,
  REVIEW_ALL_ACTORS,
  type ReviewNodeDetail,
  type ReviewNodeScope,
  type ReviewTreeNode,
  type ReviewView,
} from '/_102035_/l2/newRelease/widgets/reviewModel.js';

const EMPTY_MENU: MenuReadResult = { status: 'missing', path: '' };

@customElement('new-release--widgets--review-102035')
export class NewReleaseReview102035 extends StateLitElement {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;

  @state() private menuRead: MenuReadResult = EMPTY_MENU;
  @state() private pool: ReviewPoolBoxView[] = [];
  @state() private loading = false;
  @state() private selectedActor = REVIEW_ALL_ACTORS;
  @state() private selectedId = '';
  @state() private selectedScope: ReviewNodeScope = 'future';

  private loadToken = 0;

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (changed.has('project') || changed.has('moduleName') || changed.has('version') || changed.has('data')) {
      this.selectedActor = REVIEW_ALL_ACTORS;
      this.selectedId = '';
      this.selectedScope = 'future';
      void this.load();
    }
  }

  private pendingCount(): number {
    return this.data?.manifest?.changes.length ?? 0;
  }

  private actorTitle(key: string): string {
    const actorId = actorIdFromKey(key);
    return this.data?.artifacts.access.value?.actors.find(actor => actor.actorId === actorId)?.title || actorId;
  }

  private view(): ReviewView {
    return buildReviewView({
      pendingCount: this.pendingCount(),
      readStatus: this.menuRead.status,
      raw: this.menuRead.value,
      selectedActor: this.selectedActor,
      selectedId: this.selectedId,
      selectedScope: this.selectedScope,
    });
  }

  private async load() {
    const token = ++this.loadToken;
    if (!this.project || !this.moduleName) {
      this.menuRead = EMPTY_MENU;
      this.pool = [];
      this.loading = false;
      return;
    }
    this.loading = true;
    const [menuRead, pool] = await Promise.all([
      readModuleMenu(this.project, this.moduleName),
      readReviewPoolBoxes(this.project, this.moduleName),
    ]);
    if (token !== this.loadToken) return;
    this.menuRead = menuRead;
    this.pool = pool;
    this.loading = false;
  }

  private selectActor(actor: string) {
    this.selectedActor = actor;
    this.selectedId = '';
    this.selectedScope = 'future';
  }

  private selectNode(id: string, scope: ReviewNodeScope) {
    this.selectedId = id;
    this.selectedScope = scope;
  }

  private actionClass(action: string): string {
    return `is-${action}`;
  }

  private nodeAria(node: ReviewTreeNode | ReviewNodeDetail): string {
    return this.t('review.nodeAria', {
      label: node.label,
      kind: this.t(`review.kind.${node.kind}`),
      action: this.t(`review.action.${node.action}`),
    });
  }

  private renderTree(nodes: ReviewTreeNode[], scope: ReviewNodeScope, depth = 0): TemplateResult {
    const view = this.view();
    return html`
      <ul role=${depth === 0 ? 'tree' : 'group'}>
        ${nodes.map(node => html`
          <li role="none">
            <button
              type="button"
              role="treeitem"
              class=${`nr-review__node ${this.actionClass(node.action)}${view.selectedId === node.id && view.selectedScope === scope ? ' is-active' : ''}`}
              aria-label=${this.nodeAria(node)}
              aria-selected=${view.selectedId === node.id && view.selectedScope === scope ? 'true' : 'false'}
              @click=${() => this.selectNode(node.id, scope)}
            >
              <span class=${`nr-review__label ${this.actionClass(node.action)}`}>${node.label}</span>
              <span class=${`nr-review__badge ${this.actionClass(node.action)}`}>${this.t(`review.action.${node.action}`)}</span>
            </button>
            ${node.children.length ? this.renderTree(node.children, scope, depth + 1) : nothing}
          </li>
        `)}
      </ul>
    `;
  }

  private renderDetail(detail: ReviewNodeDetail | null) {
    if (!detail) {
      return html`
        <div class="nr-review__empty-detail">
          <h3>${this.t('review.noSelection')}</h3>
          <p>${this.t('review.noSelectionBody')}</p>
        </div>
      `;
    }
    const struck = detail.scope === 'removed' || detail.action === 'remove';
    return html`
      <article class="nr-review__detail" aria-live="polite">
        <header>
          <span>${this.t(`review.kind.${detail.kind}`)}</span>
          <h3 class=${this.actionClass(detail.action)}>${detail.label}</h3>
          <small class=${`nr-review__badge ${this.actionClass(detail.action)}`}>${this.t(`review.action.${detail.action}`)}</small>
        </header>
        ${detail.context ? html`<p><span>${this.t('review.context')}</span><strong>${detail.context}</strong></p>` : nothing}
        ${detail.text ? html`<p class=${struck ? 'is-remove' : ''}>${detail.text}</p>` : nothing}
        ${detail.organisms.length ? html`
          <section>
            <span>${this.t('review.organisms')}</span>
            ${detail.organisms.map(organism => html`
              <article>
                <strong>${this.t(`review.organism.${organism.kind}`)}</strong>
                <p class=${struck ? 'is-remove' : ''}>${organism.text}</p>
              </article>
            `)}
          </section>
        ` : nothing}
      </article>
    `;
  }

  private renderMenu(view: ReviewView) {
    if (view.kind === 'pending') {
      return html`
        <section class="nr-review__pending">
          <h3>${this.t('review.pendingTitle')}</h3>
          <p>${this.t('review.pendingBody')}</p>
          <button type="button" disabled aria-disabled="true">${this.t('review.calculate')}</button>
          <small>${this.t('review.actionLater')}</small>
        </section>
      `;
    }
    if (view.kind === 'empty') {
      return html`
        <section class="nr-review__empty">
          <h3>${this.t('review.emptyTitle')}</h3>
          <p>${this.t('review.emptyBody')}</p>
        </section>
      `;
    }
    if (view.kind === 'invalid') {
      return html`
        <section class="nr-review__empty">
          <h3>${this.t('review.invalidTitle')}</h3>
          <p>${this.t(view.errorCode || 'review.error.invalid')}</p>
        </section>
      `;
    }
    return html`
      <div class="nr-review__toolbar">
        <label>
          <span>${this.t('review.actor')}</span>
          <select .value=${view.selectedActor} @change=${(event: Event) => this.selectActor((event.currentTarget as HTMLSelectElement).value)}>
            <option value=${REVIEW_ALL_ACTORS} ?selected=${view.selectedActor === REVIEW_ALL_ACTORS}>${this.t('review.allActors')}</option>
            ${view.actors.map(actor => html`<option value=${actor.key} ?selected=${view.selectedActor === actor.key}>${this.actorTitle(actor.key)}</option>`)}
          </select>
        </label>
      </div>
      <div class="nr-review__split">
        <div class="nr-review__trees">
          <section class="nr-review__tree" aria-label=${this.t('review.futureTree')}>
            <h3>${this.t('review.futureTree')}</h3>
            ${this.renderTree(view.tree, 'future')}
          </section>
          ${view.removed.length ? html`
            <section class="nr-review__tree is-removed" aria-label=${this.t('review.removedTree')}>
              <h3>${this.t('review.removedTree')}</h3>
              ${this.renderTree(view.removed, 'removed')}
            </section>
          ` : nothing}
        </div>
        ${this.renderDetail(view.selected)}
      </div>
      <div class="nr-review__continue">
        <button type="button" disabled aria-disabled="true">${this.t('review.continue')}</button>
        <small>${this.t('review.actionLater')}</small>
      </div>
    `;
  }

  private renderPool() {
    return html`
      <details class="nr-review__pool">
        <summary>${this.t('review.pool')}</summary>
        <p>${this.t('review.pool.description')}</p>
        ${this.pool.map(box => html`
          <section>
            <h3>${this.t(`review.pool.box.${box.box}`)}</h3>
            ${box.messages.length ? box.messages.map(message => html`
              <article class=${message.unreadable ? 'is-unreadable' : ''}>
                <code>${message.file}</code>
                ${message.unreadable ? html`<span>${this.t('review.pool.unreadable')}</span>` : html`
                  <span>${this.t('review.pool.from')}: ${message.from}</span>
                  <span>${this.t('review.pool.round', { round: message.round, max: message.maxRound })}</span>
                  <span>${this.t('review.pool.mode')}: ${message.mode}</span>
                  <span>${this.t('review.pool.subject')}: ${message.subject}</span>
                `}
              </article>
            `) : html`<p>${this.t('review.pool.empty')}</p>`}
          </section>
        `)}
      </details>
    `;
  }

  render() {
    const view = this.view();
    return html`
      <section class="nr-review">
        <header class="nr-review__hero">
          <div>
            <span>${this.t('review.eyebrow')}</span>
            <h2>${this.t('review.title')}</h2>
            <p>${this.t('review.description')}</p>
          </div>
        </header>
        ${this.loading ? html`<p class="nr-review__loading">${this.t('state.loading')}</p>` : this.renderMenu(view)}
        ${this.renderPool()}
      </section>
    `;
  }
}
