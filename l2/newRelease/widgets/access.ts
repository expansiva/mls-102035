/// <mls fileReference="_102035_/l2/newRelease/widgets/access.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type {
  Ns5AccessArtifact,
  Ns5AccessGrant,
  Ns5AccessActor,
  Ns5OntologyAnyEntity,
  Ns5OntologyIndexArtifact,
  Ns5OntologyIndexV3,
} from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { changedDot, hasItemDiff, idScope } from '/_102035_/l2/newRelease/helpers/itemDiffs.js';
import {
  announceNewReleaseChange,
  canDiscardNewReleaseDraft,
  requestNewReleaseEdit,
  type NewReleaseTabPresentation,
  type NewReleaseEditableTab,
  type NewReleaseEditMode,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';
import {
  patchAccessActor,
  patchAccessGrant,
  accessMatrixRows,
  accessTextNodes,
  accessIsPerson,
  accessFieldLabel,
  accessFieldRefs,
  accessGrantsForActor,
  accessJourneyCount,
  accessOracleIssues,
  reachablePersonAnchors,
} from '/_102035_/l2/newRelease/widgets/accessModel.js';

const SCOPE_MODES: Ns5AccessGrant['dataScope']['mode'][] = ['own', 'assigned', 'related', 'public', 'organization', 'custom'];
const DISCLOSURE_MODES: Ns5AccessGrant['disclosure']['mode'][] = ['fullRecord', 'fieldsOnly', 'summaryOnly', 'aggregateOnly'];
const PERSON_SCOPE_MODES: Ns5AccessGrant['dataScope']['mode'][] = ['own', 'assigned', 'related'];
const LIMITED_DISCLOSURE_MODES: Ns5AccessGrant['disclosure']['mode'][] = ['fieldsOnly', 'summaryOnly'];
const ACTOR_ORIGINS: Ns5AccessActor['origin'][] = ['named', 'inferred'];
const ACTOR_KINDS: Ns5AccessActor['kind'][] = ['internal', 'external', 'system'];

interface AccessIssueView {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

@customElement('new-release--widgets--access-102035')
export class NewReleaseAccess102035 extends StateLitElement implements NewReleaseEditableTab<Ns5AccessArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private detailKind: 'actor' | 'grant' | '' = '';
  private editSnapshot = '';
  @state() private selectedActorId = '';
  @state() private selectedGrantId = '';
  @state() private accessDraft: Ns5AccessArtifact | null = null;
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private gateIssues: AccessIssueView[] = [];
  @state() private editMessage = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (changed.has('data') || changed.has('mode') || changed.has('detailKind') || changed.has('accessDraft') || changed.has('t')) {
      this.publishPresentation();
    }
  }

  private publishPresentation() {
    const access = this.currentAccess();
    const presentation: NewReleaseTabPresentation = {
      nodes: access ? accessTextNodes(access, this.t('access.unassigned')).map(node => ({...node,
        changed: node.id.startsWith('actor:') && this.changedActor(node.id.slice(6)),
        children: node.children.map(child => ({...child, changed: this.changedGrant(child.id.slice(6))})),
      })) : [],
      detail: !!this.detailKind,
      select: id => {
        if (id.startsWith('actor:')) this.selectActor(id.slice(6));
        if (id.startsWith('grant:')) this.selectGrant(id.slice(6));
      },
      back: () => { if (canDiscardNewReleaseDraft(this)) this.cancelEdit(); },
    };
    this.dispatchEvent(new CustomEvent('nr-view-state', { bubbles: true, composed: true, detail: presentation }));
  }

  private changedActor(id: string) { return hasItemDiff(this.data?.diffs || [], 'access.defs.ts', idScope('actors', 'actorId', id)); }
  private changedGrant(id: string) { return hasItemDiff(this.data?.diffs || [], 'access.defs.ts', idScope('grants', 'grantId', id)); }

  getDraft(): Ns5AccessArtifact | null {
    const access = this.currentAccess();
    return access ? structuredClone(access) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) {
    this.suppliedIssues = accessOracleIssues(issues);
  }

  private currentAccess(): Ns5AccessArtifact | null {
    return this.mode === 'edit' && this.accessDraft
      ? this.accessDraft
      : this.data?.artifacts.access.value || null;
  }

  private entities(): Ns5OntologyAnyEntity[] {
    return this.data?.artifacts.entities.map(item => item.value)
      .filter((item): item is Ns5OntologyAnyEntity => !!item) || [];
  }

  private index(): (Ns5OntologyIndexArtifact | Ns5OntologyIndexV3) | null {
    return this.data?.artifacts.ontologyIndex.value || null;
  }

  private journeys() {
    return this.data?.artifacts.journeys.map(item => item.value)
      .filter((item): item is NonNullable<typeof item> => !!item) || [];
  }

  private actor(): Ns5AccessActor | null {
    return this.currentAccess()?.actors.find(actor => actor.actorId === this.selectedActorId) || null;
  }

  private grant(): Ns5AccessGrant | null {
    return this.currentAccess()?.grants.find(grant => grant.grantId === this.selectedGrantId) || null;
  }

  private entityTitle(entityId: string): string {
    return this.entities().find(entity => entity.entityId === entityId)?.title || entityId;
  }

  private selectActor(actorId: string) {
    if (!canDiscardNewReleaseDraft(this)) return;
    if (this.version === 'asis') { requestNewReleaseEdit(this, `actor:${actorId}`); return; }
    this.cancelEdit();
    this.selectedActorId = actorId;
    this.detailKind = 'actor';
    this.beginEdit();
  }

  private selectGrant(grantId: string) {
    if (!canDiscardNewReleaseDraft(this)) return;
    if (this.version === 'asis') { requestNewReleaseEdit(this, `grant:${grantId}`); return; }
    this.cancelEdit();
    const grant = this.currentAccess()?.grants.find(item => item.grantId === grantId);
    if (!grant) return;
    this.selectedActorId = grant.actorRef;
    this.selectedGrantId = grantId;
    this.detailKind = 'grant';
    this.beginEdit();
  }

  private beginEdit() {
    const access = this.currentAccess();
    if (!access || this.version.startsWith('release:')) return;
    this.accessDraft = structuredClone(access);
    this.editSnapshot = JSON.stringify(access);
    this.mode = 'edit';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private cancelEdit() {
    this.detailKind = '';
    this.accessDraft = null;
    this.mode = 'view';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
    const access = this.currentAccess();
    const grants = access ? accessGrantsForActor(access, this.selectedActorId) : [];
    if (!grants.some(grant => grant.grantId === this.selectedGrantId)) this.selectedGrantId = grants[0]?.grantId || '';
  }

  private updateAccess(next: Ns5AccessArtifact) {
    this.accessDraft = next;
    this.dirty = JSON.stringify(next) !== this.editSnapshot;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateActor(patch: Partial<Omit<Ns5AccessActor, 'actorId'>>) {
    if (!this.accessDraft) return;
    this.updateAccess(patchAccessActor(this.accessDraft, this.selectedActorId, patch));
  }

  private updateGrant(patch: Partial<Omit<Ns5AccessGrant, 'grantId'>>) {
    if (!this.accessDraft) return;
    this.updateAccess(patchAccessGrant(this.accessDraft, this.selectedGrantId, patch));
  }

  private updateScope(patch: Partial<Ns5AccessGrant['dataScope']>) {
    const grant = this.grant();
    if (!grant) return;
    const dataScope = { ...grant.dataScope, ...patch };
    if (patch.mode && !PERSON_SCOPE_MODES.includes(patch.mode)) delete dataScope.anchorEntity;
    if (patch.mode && PERSON_SCOPE_MODES.includes(patch.mode)) {
      const anchors = reachablePersonAnchors(grant.entityRefs, this.entities(), this.index());
      if (!anchors.some(anchor => anchor.entityId === dataScope.anchorEntity)) dataScope.anchorEntity = anchors[0]?.entityId;
    }
    this.updateGrant({ dataScope });
  }

  private updateDisclosure(patch: Partial<Ns5AccessGrant['disclosure']>) {
    const grant = this.grant();
    if (!grant) return;
    const disclosure = { ...grant.disclosure, ...patch };
    if (patch.mode && !LIMITED_DISCLOSURE_MODES.includes(patch.mode)) {
      delete disclosure.allowedFields;
      delete disclosure.deniedFields;
    }
    this.updateGrant({ disclosure });
  }

  private multiValues(event: Event): string[] {
    return [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value);
  }

  private updateEntities(entityRefs: string[]) {
    // References elsewhere in the grant are preserved for candidate validation to assess.
    this.updateGrant({ entityRefs });
  }

  private async saveEdit() {
    if (!this.accessDraft || !this.dirty) return;
    try {
      await announceNewReleaseChange(this, { path: 'access.defs.ts', jsonPath: '$', value: structuredClone(this.accessDraft) });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('access.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  private renderMatrix(access: Ns5AccessArtifact) {
    return html`<section class="nr-access__matrix"><header><div><span>${this.t('access.matrix')}</span><p>${this.t('access.matrixDescription')}</p></div><small>${this.t('access.matrixHint')}</small></header>
      <div class="nr-access__matrix-scroll"><table><thead><tr><th scope="col">${this.t('access.grants')}</th>${access.actors.map((actor, index) => html`<th scope="col"><button type="button" class="nr-access__role-number" popovertarget=${`nr-access-role-${index}`} aria-label=${actor.title} @pointerenter=${(event: PointerEvent) => { if (event.pointerType === 'mouse') ((event.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null)?.showPopover(); }}>#${index + 1}${changedDot(this.changedActor(actor.actorId), this.t)}</button><div id=${`nr-access-role-${index}`} class="nr-access__role-popover" popover data-nr-hint @beforetoggle=${(event: Event) => {
        const popup = event.currentTarget as HTMLElement;
        const rect = popup.previousElementSibling!.getBoundingClientRect();
        popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 248))}px`;
        popup.style.top = `${rect.bottom + 6}px`;
      }}><span>${actor.title}</span><button type="button" class="nr-access__role-edit" aria-label=${this.t('access.editActor', { actor: actor.title })} @click=${() => this.selectActor(actor.actorId)}>${this.t('access.edit')}</button></div></th>`)}</tr></thead>
      <tbody>${accessMatrixRows(access).map(({ grant, cells }) => html`<tr><th scope="row"><button type="button" @click=${() => this.selectGrant(grant.grantId)}><strong>${grant.title}</strong>${changedDot(this.changedGrant(grant.grantId), this.t)}<code>${grant.grantId}</code></button></th>${cells.map((checked, index) => html`<td>${checked ? html`<button type="button" class="nr-access__indicator" aria-label=${this.t('access.matrixCell', { actor: access.actors[index].title, grant: grant.title })} @click=${() => this.selectGrant(grant.grantId)}><span aria-hidden="true">✓</span></button>` : html`<span class="nr-access__absent" aria-label=${this.t('access.none')}>—</span>`}</td>`)}</tr>`)}</tbody></table></div></section>`;
  }

  private renderActor(access: Ns5AccessArtifact, actor: Ns5AccessActor) {
    const people = this.entities().filter(accessIsPerson);
    const peopleIds = [...new Set([...(actor.personEntity ? [actor.personEntity] : []), ...people.map(entity => entity.entityId)])];
    return html`<article class="nr-access__actor"><header><span>${this.t('access.selectedActor')}</span><code>${actor.actorId}</code></header>
      <label><span>${this.t('access.actorTitle')}</span><input .value=${actor.title} @input=${(event: Event) => this.updateActor({ title: (event.currentTarget as HTMLInputElement).value })}></label>
      <label><span>${this.t('access.actorDescription')}</span><textarea .value=${actor.description} @input=${(event: Event) => this.updateActor({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
      <label><span>${this.t('access.kind')}</span><select .value=${actor.kind} @change=${(event: Event) => this.updateActor({ kind: (event.currentTarget as HTMLSelectElement).value as Ns5AccessActor['kind'] })}>${ACTOR_KINDS.map(kind => html`<option value=${kind} ?selected=${actor.kind === kind}>${this.t(`access.kind.${kind}`)}</option>`)}</select></label>
      <label><span>${this.t('access.origin')}</span><select .value=${actor.origin} @change=${(event: Event) => this.updateActor({ origin: (event.currentTarget as HTMLSelectElement).value as Ns5AccessActor['origin'] })}>${ACTOR_ORIGINS.map(origin => html`<option value=${origin} ?selected=${actor.origin === origin}>${this.t(`access.origin.${origin}`)}</option>`)}</select></label>
      <label><span>${this.t('access.personEntity')}</span><select .value=${actor.personEntity || ''} @change=${(event: Event) => this.updateActor({ personEntity: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!actor.personEntity}>${this.t('access.noPersonEntity')}</option>${peopleIds.map(id => html`<option value=${id} ?selected=${actor.personEntity === id}>${this.entityTitle(id)}</option>`)}</select></label>
      <dl><div><dt>${this.t('access.journeys')}</dt><dd>${accessJourneyCount(this.journeys(), actor.actorId)}</dd></div><div><dt>${this.t('access.grants')}</dt><dd>${accessGrantsForActor(access, actor.actorId).length}</dd></div></dl></article>`;
  }

  private renderGrantEdit(grant: Ns5AccessGrant) {
    const anchors = reachablePersonAnchors(grant.entityRefs, this.entities(), this.index());
    const fields = [...new Set([...accessFieldRefs(grant, this.entities()), ...(grant.disclosure.allowedFields || []), ...(grant.disclosure.deniedFields || [])])];
    const entityIds = [...new Set([...grant.entityRefs, ...this.entities().map(entity => entity.entityId)])];
    const anchorIds = [...new Set([...(grant.dataScope.anchorEntity ? [grant.dataScope.anchorEntity] : []), ...anchors.map(anchor => anchor.entityId)])];
    const fieldOption = (ref: string) => `${accessFieldLabel(ref, this.entities())} — ${ref}`;
    return html`<article class="nr-access__grant-detail is-editing"><header><div><span>${this.t('access.editing')}</span><input aria-label=${this.t('access.grantTitle')} class="nr-access__title-input" .value=${grant.title} @input=${(event: Event) => this.updateGrant({ title: (event.currentTarget as HTMLInputElement).value })}><code>${grant.grantId}</code></div></header><label class="is-wide"><span>${this.t('access.grantDescription')}</span><textarea .value=${grant.description} @input=${(event: Event) => this.updateGrant({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label><div class="nr-access__edit-grid"><label><span>${this.t('access.actor')}</span><select .value=${grant.actorRef} @change=${(event: Event) => this.updateGrant({ actorRef: (event.currentTarget as HTMLSelectElement).value })}>${[...new Set([grant.actorRef, ...(this.currentAccess()?.actors.map(actor => actor.actorId) || [])])].map(id => html`<option value=${id} ?selected=${grant.actorRef === id}>${this.currentAccess()?.actors.find(actor => actor.actorId === id)?.title || id}</option>`)}</select></label><label><span>${this.t('access.entities')}</span><select multiple @change=${(event: Event) => this.updateEntities(this.multiValues(event))}>${entityIds.map(id => html`<option value=${id} ?selected=${grant.entityRefs.includes(id)}>${this.entityTitle(id)}</option>`)}</select></label><label><span>${this.t('access.scope')}</span><select .value=${grant.dataScope.mode} @change=${(event: Event) => this.updateScope({ mode: (event.currentTarget as HTMLSelectElement).value as Ns5AccessGrant['dataScope']['mode'] })}>${SCOPE_MODES.map(mode => html`<option value=${mode} ?selected=${grant.dataScope.mode === mode} ?disabled=${this.currentAccess()?.actors.find(actor => actor.actorId === grant.actorRef)?.kind === 'external' && mode !== 'own'}>${this.t(`access.scope.${mode}`)}</option>`)}</select></label>${PERSON_SCOPE_MODES.includes(grant.dataScope.mode) ? html`<label><span>${this.t('access.anchor')}</span><select .value=${grant.dataScope.anchorEntity || ''} @change=${(event: Event) => this.updateScope({ anchorEntity: (event.currentTarget as HTMLSelectElement).value || undefined })}><option value="" ?selected=${!grant.dataScope.anchorEntity}>${this.t('access.chooseAnchor')}</option>${anchorIds.map(id => html`<option value=${id} ?selected=${grant.dataScope.anchorEntity === id}>${this.entityTitle(id)}</option>`)}</select><small>${anchors.length ? this.t('access.anchorReachable') : this.t('access.anchorUnavailable')}</small></label>` : nothing}<label class="is-wide"><span>${this.t('access.scopeDescription')}</span><textarea .value=${grant.dataScope.description} @input=${(event: Event) => this.updateScope({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label><label><span>${this.t('access.disclosure')}</span><select .value=${grant.disclosure.mode} @change=${(event: Event) => this.updateDisclosure({ mode: (event.currentTarget as HTMLSelectElement).value as Ns5AccessGrant['disclosure']['mode'] })}>${DISCLOSURE_MODES.map(mode => html`<option value=${mode} ?selected=${grant.disclosure.mode === mode}>${this.t(`access.disclosure.${mode}`)}</option>`)}</select></label><label class="is-wide"><span>${this.t('access.disclosureDescription')}</span><textarea .value=${grant.disclosure.description} @input=${(event: Event) => this.updateDisclosure({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>${LIMITED_DISCLOSURE_MODES.includes(grant.disclosure.mode) ? html`<label><span>${this.t('access.allowedFields')}</span><select multiple @change=${(event: Event) => this.updateDisclosure({ allowedFields: this.multiValues(event) })}>${fields.map(ref => html`<option value=${ref} ?selected=${grant.disclosure.allowedFields?.includes(ref)}>${fieldOption(ref)}</option>`)}</select></label><label><span>${this.t('access.deniedFields')}</span><select multiple @change=${(event: Event) => this.updateDisclosure({ deniedFields: this.multiValues(event) })}>${fields.map(ref => html`<option value=${ref} ?selected=${grant.disclosure.deniedFields?.includes(ref)}>${fieldOption(ref)}</option>`)}</select></label>` : nothing}</div></article>`;
  }

  private issues(): AccessIssueView[] {
    const source = [...(this.data?.validation.issues || []), ...this.suppliedIssues];
    const mapped = accessOracleIssues(source).map(issue => ({ severity: issue.severity, code: issue.code, message: issue.message }));
    return [...new Map([...mapped, ...this.gateIssues].map(issue => [`${issue.code}:${issue.message}`, issue])).values()];
  }

  private renderIssues() {
    const issues = this.issues();
    if (!issues.length && !this.editMessage) return nothing;
    return html`<section class="nr-access__issues" role="alert"><header><strong>${this.t('access.issues')}</strong><span>${this.t('access.issueCount', { count: issues.length })}</span></header>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}<div>${issues.map(issue => html`<article class=${`is-${issue.severity}`}><code>${issue.code}</code><p>${issue.message}</p></article>`)}</div></section>`;
  }

  render() {
    const access = this.currentAccess();
    if (!access) return html`<section class="nr-access__empty"><h2>${this.t('access.emptyTitle')}</h2><p>${this.t('access.emptyBody')}</p></section>`;
    const actor = this.actor();
    const grant = this.grant();
    return html`<section class="nr-access">${this.renderIssues()}${this.detailKind ? html`<div class="nr-access__workspace">${this.detailKind === 'actor' && actor ? this.renderActor(access, actor) : this.detailKind === 'grant' && grant ? this.renderGrantEdit(grant) : nothing}</div>` : this.renderMatrix(access)}${this.mode === 'edit' ? html`<footer class="nr-access__edit-footer"><span>${this.dirty ? this.t('access.unsaved') : this.t('access.noChanges')}</span><div><button type="button" @click=${() => { if (canDiscardNewReleaseDraft(this)) this.cancelEdit(); }}>${this.t('access.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('access.save')}</button></div></footer>` : nothing}</section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'new-release--widgets--access-102035': NewReleaseAccess102035;
  }
}
