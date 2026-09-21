/// <mls fileReference="_102035_/l2/newRelease/widgets/review.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { readModuleMenu, type MenuReadResult } from '/_102035_/l2/newRelease/helpers/menuReader.js';
import { readReviewArtifact, type ReviewArtifactRead } from '/_102035_/l2/newRelease/helpers/backendReader.js';
import { readReviewPoolBoxes, type ReviewPoolBoxView } from '/_102035_/l2/newRelease/helpers/poolBoxes.js';
import {
  actorIdFromKey,
  buildReviewView,
  MENU_ACTIONS,
  openReviewExpansionKeys,
  REVIEW_ALL_ACTORS,
  reviewExpansionKey,
  toggleReviewExpansion,
  type ReviewNodeDetail,
  type ReviewNodeScope,
  type ReviewTreeNode,
  type ReviewView,
  toggleReviewSelection,
} from '/_102035_/l2/newRelease/widgets/reviewModel.js';
import { backendTone, buildBackendReview, parseEffortSummary, type BackendItem, type BackendReviewView } from '/_102035_/l2/newRelease/widgets/backendReviewModel.js';

const EMPTY_MENU: MenuReadResult = { status: 'missing', path: '' };
const EMPTY_ARTIFACT: ReviewArtifactRead = { status: 'missing', path: '' };

@customElement('new-release--widgets--review-102035')
export class NewReleaseReview102035 extends StateLitElement {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;

  @state() private menuRead: MenuReadResult = EMPTY_MENU;
  @state() private pool: ReviewPoolBoxView[] = [];
  @state() private backendRead: ReviewArtifactRead = EMPTY_ARTIFACT;
  @state() private effortRead: ReviewArtifactRead = EMPTY_ARTIFACT;
  @state() private loading = false;
  @state() private selectedActor = '';
  @state() private selectedId = '';
  @state() private selectedScope: ReviewNodeScope = 'future';
  @state() private expandedKeys: string[] = [];

  private loadToken = 0;
  private loadedFor: { project: number; moduleName: string; version: NewReleaseVersion; data: NewReleaseModuleData | null } | null = null;

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (changed.has('project') || changed.has('moduleName') || changed.has('version') || changed.has('data')) {
      this.selectedActor = '';
      this.selectedId = '';
      this.selectedScope = 'future';
      this.expandedKeys = [];
      void this.load();
    }
  }

  private pendingCount(): number {
    return this.version === 'tobe' && this.data?.changeId && !this.data.resultCurrent ? 1 : 0;
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

  private isCurrentLoad(): boolean {
    const loaded = this.loadedFor;
    return !!loaded && loaded.project === this.project && loaded.moduleName === this.moduleName
      && loaded.version === this.version && loaded.data === this.data;
  }

  private async load() {
    const token = ++this.loadToken;
    const context = { project: this.project, moduleName: this.moduleName, version: this.version, data: this.data };
    this.loadedFor = null;
    if (!this.project || !this.moduleName) {
      this.menuRead = EMPTY_MENU;
      this.backendRead = EMPTY_ARTIFACT;
      this.effortRead = EMPTY_ARTIFACT;
      this.pool = [];
      this.loadedFor = context;
      this.loading = false;
      return;
    }
    this.loading = true;
    const [menuRead, backendRead, effortRead, pool] = await Promise.all([
      readModuleMenu(context.project, context.moduleName),
      readReviewArtifact(context.project, context.moduleName, 'backend'),
      readReviewArtifact(context.project, context.moduleName, 'effort'),
      readReviewPoolBoxes(context.project, context.moduleName),
    ]);
    if (token !== this.loadToken) return;
    this.menuRead = menuRead;
    this.backendRead = backendRead;
    this.effortRead = effortRead;
    this.pool = pool;
    this.loadedFor = context;
    this.loading = false;
  }

  private selectActor(actor: string) {
    this.selectedActor = actor;
    this.selectedId = '';
    this.selectedScope = 'future';
    this.expandedKeys = [];
  }

  private selectNode(id: string, scope: ReviewNodeScope) {
    const selected = toggleReviewSelection(this.selectedId, this.selectedScope, id, scope);
    this.selectedId = selected.selectedId;
    this.selectedScope = selected.selectedScope;
  }

  private toggleExpand(id: string, scope: ReviewNodeScope) {
    const next = toggleReviewExpansion(this.expandedKeys, this.view(), id, scope);
    this.selectedId = next.selectedId;
    this.expandedKeys = next.expandedKeys;
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

  private renderMenuList(nodes: ReviewTreeNode[], scope: ReviewNodeScope, view: ReviewView, openKeys: Set<string>): TemplateResult {
    return html`
      <ul>
        ${nodes.map(node => {
          const selected = view.selectedId === node.id && view.selectedScope === scope;
          const expandable = node.children.length > 0;
          const expanded = expandable && openKeys.has(reviewExpansionKey(scope, node.id));
          return html`
            <li>
              <div class="nr-review__row">
                ${expandable ? html`
                  <button
                    type="button"
                    class=${`nr-review__toggle${expanded ? ' is-open' : ''}`}
                    aria-expanded=${expanded ? 'true' : 'false'}
                    aria-label=${this.nodeAria(node)}
                    @click=${() => this.toggleExpand(node.id, scope)}
                  ></button>
                ` : html`<span class="nr-review__toggle is-leaf" aria-hidden="true"></span>`}
                <button
                  type="button"
                  class=${`nr-review__link ${this.actionClass(node.action)}${selected ? ' is-active' : ''}`}
                  aria-label=${this.nodeAria(node)}
                  aria-pressed=${selected ? 'true' : 'false'}
                  @click=${() => this.selectNode(node.id, scope)}
                >${node.label}</button>
              </div>
              ${expanded ? this.renderMenuList(node.children, scope, view, openKeys) : nothing}
            </li>
          `;
        })}
      </ul>
    `;
  }

  private renderDetail(detail: ReviewNodeDetail | null) {
    if (!detail) return nothing;
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
    const openKeys = openReviewExpansionKeys(this.expandedKeys, view);
    return html`
      <div class="nr-review__toolbar">
        <label>
          <span>${this.t('review.actor')}</span>
          <select .value=${view.selectedActor} @change=${(event: Event) => this.selectActor((event.currentTarget as HTMLSelectElement).value)}>
            <option value=${REVIEW_ALL_ACTORS} ?selected=${view.selectedActor === REVIEW_ALL_ACTORS}>${this.t('review.allActors')}</option>
            ${view.actors.map(actor => html`<option value=${actor.key} ?selected=${view.selectedActor === actor.key}>${this.actorTitle(actor.key)}</option>`)}
          </select>
        </label>
        <ul class="nr-review__legend">
          ${MENU_ACTIONS.map(action => html`<li class=${this.actionClass(action)}>${this.t(`review.action.${action}`)}</li>`)}
        </ul>
      </div>
      <div class=${`nr-review__split${view.selected ? ' has-detail' : ''}`}>
        <nav class="nr-review__menu" aria-label=${this.t('review.futureTree')}>
          ${this.renderMenuList(view.tree, 'future', view, openKeys)}
          ${view.removed.length ? html`
            <details class="nr-review__removed" ?open=${view.selectedScope === 'removed'}>
              <summary>${this.t('review.removedTree')}</summary>
              ${this.renderMenuList(view.removed, 'removed', view, openKeys)}
            </details>
          ` : nothing}
        </nav>
        ${this.renderDetail(view.selected)}
      </div>
      <div class="nr-review__continue">
        <button type="button" disabled aria-disabled="true">${this.t('review.continue')}</button>
        <small>${this.t('review.actionLater')}</small>
      </div>
    `;
  }

  private tableTitle(entity: string): string {
    const value = this.data?.artifacts.entities.find(item => (item.value as { entityId?: string } | null)?.entityId === entity)?.value as { title?: string } | undefined;
    return value?.title || entity;
  }

  private renderBackendItem(item: BackendItem, knownTables: ReadonlySet<string>) {
    const status = this.t(`review.backend.status.${item.tone}`);
    const tableNames = item.tableRefs.join(', ');
    const unresolved = item.tableRefs.filter(ref => !knownTables.has(ref));
    return html`
      <details class=${`nr-review__backend-item is-${item.tone}`}>
        <summary>
          <div><span>${this.t(`review.backend.kind.${item.kind}`)}</span><strong>${item.kind === 'table' ? this.tableTitle(item.entity) : item.label}</strong></div>
          <small class=${`nr-review__badge is-${item.tone}`} aria-label=${status}>${status}${item.tone === 'unknown' && item.status ? ` · ${item.status}` : ''}</small>
        </summary>
        <div class="nr-review__backend-item-detail">
          ${item.kind === 'table' || item.kind === 'change' ? html`<code>${item.kind === 'table' ? item.detail : item.label}</code>` : nothing}
          ${item.detail && item.kind !== 'table' ? html`<p><span>${this.t(
            item.kind === 'usecase' ? 'review.backend.operation'
              : item.kind === 'endpoint' ? 'review.backend.usecases'
                : 'review.backend.detail',
          )}</span> ${item.detail}</p>` : nothing}
          ${item.reason ? html`<p><span>${this.t('review.backend.reason')}</span> ${item.reason}</p>` : nothing}
          ${item.source ? html`<p><span>${this.t('review.backend.source')}</span> <code>${item.source}</code></p>` : nothing}
          ${item.usecaseRefs.length ? html`<p><span>${this.t('review.backend.usecases')}</span> ${item.usecaseRefs.join(', ')}</p>` : nothing}
          ${item.tableRefs.length ? html`<p><span>${this.t('review.backend.tables')}</span> ${tableNames}</p>` : nothing}
          ${!item.tableRefs.length ? html`<p class="nr-review__backend-limitation">${this.t(`review.backend.noTable.${item.noTable}`)}</p>` : nothing}
          ${unresolved.length ? html`<p class="nr-review__backend-limitation">${this.t('review.backend.unresolvedRefs', { refs: unresolved.join(', ') })}</p>` : nothing}
        </div>
      </details>
    `;
  }

  private renderBackendGroup(title: string, technical: string, items: BackendItem[], knownTables: ReadonlySet<string>) {
    return html`
      <details class="nr-review__backend-group">
        <summary><span><strong>${title}</strong>${technical ? html`<code>${technical}</code>` : nothing}</span><small>${this.t('review.backend.itemCount', { count: items.length })}</small></summary>
        <div>${items.length ? items.map(item => this.renderBackendItem(item, knownTables)) : html`<p class="nr-review__backend-empty">${this.t('review.backend.noItems')}</p>`}</div>
      </details>
    `;
  }

  private renderEffort() {
    const summary = parseEffortSummary(this.effortRead, this.moduleName);
    return html`
      <section class="nr-review__effort" aria-label=${this.t('review.backend.effortTitle')}>
        <header><strong>${this.t('review.backend.effortTitle')}</strong><span>${this.t(summary.kind === 'counts' ? 'review.backend.partial' : summary.kind === 'invalid' ? 'review.backend.effortInvalid' : 'review.backend.notCalculated')}</span></header>
        ${summary.kind === 'counts' ? html`
          <p>${this.t('review.backend.effortCoverage')}</p>
          <div>${summary.counts.map(category => html`
            <div><strong>${this.t(`review.backend.count.${category.category}`)}</strong>
              <span>${category.statuses.map(value => {
                const tone = backendTone(value.status);
                return `${this.t(`review.backend.status.${tone}`)}${tone === 'unknown' ? ` (${value.status})` : ''}: ${value.count}`;
              }).join(' · ')}</span>
            </div>
          `)}</div>
        ` : nothing}
      </section>
    `;
  }

  private renderBackend(view: ReviewView) {
    // pool/l2/web holds the candidate result, not a snapshot of Atual or a past release.
    if (this.version !== 'tobe') return nothing;
    const stale = view.kind === 'pending';
    const backend: BackendReviewView = buildBackendReview(this.backendRead, stale, this.moduleName);
    const knownTables = new Set(backend.groups.map(group => group.tableId));
    return html`
      <section class="nr-review__backend" aria-label=${this.t('review.backend.title')}>
        <header>
          <div><span>${this.t('review.backend.eyebrow')}</span><h3>${this.t('review.backend.title')}</h3><p>${this.t('review.backend.moduleScope')}</p></div>
          ${backend.kind === 'ready' ? html`<strong>${this.t('review.backend.uniqueCount', { count: backend.itemCount })}</strong>` : nothing}
        </header>
        ${backend.kind === 'stale' ? html`<p class="nr-review__backend-message">${this.t('review.backend.stale')}</p>` : nothing}
        ${backend.kind === 'missing' ? html`<p class="nr-review__backend-message">${this.t('review.backend.missing')}</p>` : nothing}
        ${backend.kind === 'invalid' ? html`<p class="nr-review__backend-message" role="alert">${this.t(backend.errorCode)}</p>` : nothing}
        ${backend.kind !== 'stale' ? this.renderEffort() : nothing}
        ${backend.kind === 'ready' ? html`
          <ul class="nr-review__backend-legend">
            ${(['new', 'change', 'keep', 'remove', 'unknown'] as const).map(tone => html`<li class=${`is-${tone}`}>${this.t(`review.backend.status.${tone}`)}</li>`)}
          </ul>
          <div class="nr-review__backend-groups">
            ${backend.groups.map(group => this.renderBackendGroup(group.entity ? this.tableTitle(group.entity) : this.t('review.backend.removedTable'), group.tableId, group.items, knownTables))}
            ${backend.shared.length ? this.renderBackendGroup(this.t('review.backend.shared'), '', backend.shared, knownTables) : nothing}
            ${backend.unassociated.length ? this.renderBackendGroup(this.t('review.backend.unassociated'), '', backend.unassociated, knownTables) : nothing}
          </div>
        ` : nothing}
      </section>
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
    const current = this.isCurrentLoad();
    return html`
      <section class="nr-review">
        <header class="nr-review__hero">
          <div>
            <span>${this.t('review.eyebrow')}</span>
            <h2>${this.t('review.title')}</h2>
            <p>${this.t('review.description')}</p>
          </div>
        </header>
        ${this.loading || !current ? html`<p class="nr-review__loading">${this.t('state.loading')}</p>` : html`${this.renderMenu(view)}${this.renderBackend(view)}`}
        ${current && !this.version.startsWith('release:') ? this.renderPool() : nothing}
      </section>
    `;
  }
}
