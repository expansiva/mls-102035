/// <mls fileReference="_102035_/l2/newRelease/widgets/review.ts" enhancement="_102027_/l2/enhancementLit" />
import { completeTobeImplementation } from '/_102035_/l2/newRelease/tobe.js';
import { effortMatchesCurrent } from '/_102035_/l2/newRelease/helpers/effortFreshness.js';

import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { NEW_RELEASE_TOBE_UPDATED_EVENT, type NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { readModuleMenu, type MenuReadResult } from '/_102035_/l2/newRelease/helpers/menuReader.js';
import { readReviewArtifact, reviewArtifactFile, type ReviewArtifactRead } from '/_102035_/l2/newRelease/helpers/backendReader.js';
import { readReviewPoolBoxes, type ReviewPoolBoxView } from '/_102035_/l2/newRelease/helpers/poolBoxes.js';
import type { ReviewRunRecord } from '/_102035_/l2/newRelease/helpers/reviewRun.js';
import { IndexedDbReviewRunStore } from '/_102035_/l2/newRelease/helpers/reviewRunStore.js';
import { readCandidateWorkerGate } from '/_102035_/l2/newRelease/helpers/candidateWorkerGate.js';
import { buildCandidateSnapshot, candidateRead } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { adoptL4ReviewResult, originalL4FileInfo, promoteL4Revision, readSealedL4Candidate, prepareL4Change, sealL4Revision, readActiveL4Change, type L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { executePreparedReviewStart, prepareReviewStartInput } from '/_102035_/l2/newRelease/helpers/reviewStart.js';
import { readSourceText } from '/_102035_/l2/solution/fs.js';
import { sealModuleLayers, restoreModuleFromSeals, diffModuleLayers, type ModuleLayerDiff } from '/_102035_/l2/solution/candidate/moduleLayers.js';
import { readLatestCompletedL4Implementation, implementationCommands, acceptL4Implementation, readL4Implementation, type L4ImplementationRecord, type L4ImplementationHashes, readInitialImplementationPlan, type InitialImplementationPlan } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { createImplementationRunner, type ImplementationRunnerDependencies } from '/_102035_/l2/newRelease/helpers/implementationRunner.js';
import { environment } from '/_102036_/l2/environmentContract.js';
import { msgGetMessage, msgGetTaskUpdate } from '/_102036_/l2/shared/api.js';
import { getThreadByName } from '/_102036_/l2/collabMessagesIndexedDB.js';
import { serializeReviewInvocation, type ReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { taskResultTexts } from '/_102035_/l2/newRelease/helpers/agentCommandRunner.js';
import { getUserId, createThread, getTemporaryContext } from '/_102025_/l2/collabMessagesHelper.js';
import {
  claimInputForRun,
  publishedCandidateMatchesRunRevision,
  REVIEW_RUN_MAX_ATTEMPTS,
  reviewRunMatchesRevision,
  type PlatformReviewRun,
  type ReviewRunStartInput,
  type ReviewWorkerIdentity,
} from '/_102035_/l2/newRelease/helpers/reviewRunWorker.js';
import {
  createReviewStudioHost,
  createReviewWorkerTransport,
  driveReviewRunWorker,
  observeReviewRun,
  outputRevisionIdForRun,
  readReviewRunLink,
  saveReviewRunLink,
  startReviewRun,
} from '/_102035_/l2/newRelease/helpers/reviewRunStudioWorker.js';
import {
  reviewImplementationVisible,
  moduleHasGeneratedSources,
  reviewReleaseState,
  actorIdFromKey,
  beginReviewPrimaryAction,
  buildReviewActionPresentation,
  buildReviewActionPlacements,
  buildReviewView,
  canStartReviewRun,
  canAcceptImplementation,
  implementationProgress,
  openReviewExpansionKeys,
  REVIEW_ALL_ACTORS,
  reviewExpansionKey,
  reviewResultVisible,
  toggleReviewExpansion,
  type ReviewNodeDetail,
  type ReviewNodeScope,
  type ReviewPrimaryActionPresentation,
  type ReviewPrimaryActionPlacement,
  type ReviewTreeNode,
  type ReviewView,
  toggleReviewSelection,
} from '/_102035_/l2/newRelease/widgets/reviewModel.js';
import { buildChangeEffortView, type ChangeEffortView } from '/_102035_/l2/newRelease/widgets/changeEffortModel.js';
import type { EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';
import { MENU_ACTIONS } from '/_102035_/l2/solution/poolPlan.js';
import { backendTone, buildBackendReview, parseEffortSummary, type BackendItem, type BackendReviewView, type BackendTestSupportOwnerGroup } from '/_102035_/l2/newRelease/widgets/backendReviewModel.js';
import type { PoolTestSupportItem } from '/_102035_/l2/solution/poolPlan.js';

const POLL_INTERVAL_MS = 1500;
const EMPTY_MENU: MenuReadResult = { status: 'missing', path: '' };
const EMPTY_ARTIFACT: ReviewArtifactRead = { status: 'missing', path: '' };

export interface InitialReviewInput {
  project: number; moduleName: string; acceptedBy: string; changeId: string | null; revisionId: string | null;
}
export interface InitialReviewDependencies {
  plan?: typeof readInitialImplementationPlan;
  prepare?: typeof prepareL4Change;
  seal?: typeof sealL4Revision;
  readSealed?: typeof readSealedL4Candidate;
  review?: (sealed: L4SealedCandidateSnapshot, userId: string) => Promise<L4SealedCandidateSnapshot>;
  sealLayers?: typeof sealModuleLayers;
  promote?: typeof promoteL4Revision;
  accept?: typeof acceptL4Implementation;
  current?: () => boolean;
}

/** Same reviewer seal as Calculate, followed by initial generation rather than candidate planning. */
export interface InitialSealDependencies extends ImplementationRunnerDependencies {
  wait?: () => Promise<void>;
  prepare?: typeof prepareReviewStartInput;
  candidate?: typeof candidateRead;
  gate?: typeof readCandidateWorkerGate;
  readSealed?: typeof readSealedL4Candidate;
  adopt?: typeof adoptL4ReviewResult;
  active?: typeof readActiveL4Change;
}
export async function reviewInitialCandidate(sealed: L4SealedCandidateSnapshot, userId: string,
  dependencies: InitialSealDependencies = {}): Promise<L4SealedCandidateSnapshot> {
  const { project, moduleName, changeId, revisionId, baseId } = sealed.manifest;
  const prepared = await (dependencies.prepare ?? prepareReviewStartInput)({ project, moduleName, changeId, revisionId, request: sealed.request, userId, loaded: sealed });
  const invocation: ReviewInvocation = { project, moduleName, baseId, request: sealed.request,
    originalL4Path: `l4/${moduleName}/pipeline/releases/${baseId}/l4`, temporaryL4Path: `l4/${moduleName}/tobe/plan`, expectedRevisionId: revisionId };
  const name = '_102035_/l2/newRelease/initialReview';
  const thread = await (dependencies.thread?.() ?? (async () => await getThreadByName(name) ?? await createThread(name, [], 'company'))());
  if (!thread?.threadId) throw new Error('implementation.thread_unavailable');
  const ctx = (dependencies.context ?? getTemporaryContext)(thread.threadId, userId, '@@agentReviewSolution ' + serializeReviewInvocation(invocation));
  await (dependencies.execute ?? ((agent, context) => environment.agents.executeAgent(agent, context)))('agentReviewSolution', ctx);
  if (!ctx.task?.PK) throw new Error('implementation.task_unavailable');
  let task = ctx.task;
  const taskId = task.PK.replace(/^task(?:\/#?|#)/u, '');
  const messageId = task.messageid_created || `${ctx.message.threadId}/${ctx.message.orderAt || ctx.message.createAt}`;
  while (!['done', 'failed', 'paused'].includes(task.status)) {
    await (dependencies.wait ?? (() => new Promise<void>(resolve => window.setTimeout(resolve, POLL_INTERVAL_MS))))();
    if (dependencies.task) task = await dependencies.task(userId, taskId, messageId);
    else {
      const update = await msgGetTaskUpdate({ userId, taskId, messageId });
      if (!update.success || !update.response?.task) throw new Error(update.error || 'implementation.task_unavailable');
      task = update.response.task;
    }
    if (task.PK.replace(/^task(?:\/#?|#)/u, '') !== taskId) throw new Error('implementation.task_mismatch');
  }
  const message = dependencies.message ? await dependencies.message(userId, thread.threadId, messageId)
    : (await msgGetMessage({ userId, threadId: thread.threadId, messageId })).response?.message;
  const reports = [...taskResultTexts(task), ...(message?.taskResults ?? [])].join('\n');
  const refusal = reports.split('\n').map(line => line.trim()).find(line => /^(?:refused|failed):/u.test(line));
  if (refusal || task.status !== 'done') throw new Error(refusal || task.last_update_log || 'review.implementation.error.run');
  const candidate = await (dependencies.candidate ?? candidateRead)({ project, moduleName });
  const pointer = candidate.pointer;
  const result = pointer && candidate.result;
  if (!pointer || pointer.changeId !== changeId || !result
    || result.resultRevisionId !== revisionId || result.resultSnapshotHash !== prepared.input.inputSnapshotHash.replace(/^sha256:/u, '')
    || result.manifest.status !== 'completed') throw new Error('l4.implementation_conflict');
  const gateRun: PlatformReviewRun = {
    runId: taskId, status: 'reviewing', attempt: 1,
    binding: { ...prepared.input, runId: taskId, inputRevisionNumber: result.resultRevisionNumber,
      originalL4Path: invocation.originalL4Path, temporaryL4Path: invocation.temporaryL4Path },
    candidateResult: { ...result }, executions: [], plannerArtifacts: [], errorCode: null, createdAt: '', updatedAt: '',
  };
  const outputRevisionId = outputRevisionIdForRun(gateRun);
  const inputPointer = pointer.revisionId === revisionId && pointer.snapshotHash === result.resultSnapshotHash
    && pointer.revisionNumber === result.resultRevisionNumber;
  const publishedPointer = outputRevisionId && publishedCandidateMatchesRunRevision(gateRun, outputRevisionId, candidate)
    && pointer.snapshotHash === result.manifest.outputSnapshotHash && pointer.source?.revisionId === revisionId
    && pointer.source.snapshotHash === result.resultSnapshotHash && pointer.source.revisionNumber === result.resultRevisionNumber;
  if (!inputPointer && !publishedPointer) throw new Error('l4.implementation_conflict');
  const gate = await (dependencies.gate ?? readCandidateWorkerGate)(gateRun);
  if (!outputRevisionId || !gate.pipelineComplete) throw new Error('l4.implementation_not_ready');
  const output = await (dependencies.readSealed ?? readSealedL4Candidate)(project, moduleName, changeId, outputRevisionId);
  if (!output) throw new Error('l4.implementation_not_ready');
  const snapshot = await buildCandidateSnapshot({ baseId, requestRevision: output.manifest.requestRevision, request: output.request, sources: output.sources });
  if (result.manifest.outputSnapshotHash !== snapshot.hash) throw new Error('l4.implementation_conflict');
  await (dependencies.adopt ?? adoptL4ReviewResult)(project, moduleName, { inputRevisionId: revisionId, outputRevisionId });
  const active = await (dependencies.active ?? readActiveL4Change)(project, moduleName);
  if (active?.activeRevisionId !== outputRevisionId || active.resultRevisionId !== outputRevisionId) throw new Error('l4.implementation_conflict');
  return output;
}

/** Exact Apply handler seam, including the neutral revision when no change is active. */
export async function applyInitialReview(input: InitialReviewInput, dependencies: InitialReviewDependencies = {}): Promise<L4ImplementationRecord> {
  const current = () => { if (dependencies.current && !dependencies.current()) throw new Error('l4.implementation_conflict'); };
  current();
  const { project, moduleName, acceptedBy } = input;
  if (!acceptedBy) throw new Error('implementation.user_unavailable');
  const plan = await (dependencies.plan ?? readInitialImplementationPlan)(project, moduleName);
  current();
  const prepared = await (dependencies.prepare ?? prepareL4Change)(project, moduleName);
  if ((input.changeId ? prepared.change.changeId !== input.changeId : !prepared.created)
    || prepared.change.activeRevisionId !== input.revisionId) throw new Error('l4.implementation_conflict');
  current();
  const revision = await (dependencies.seal ?? sealL4Revision)(project, moduleName, input.revisionId);
  let sealed = await (dependencies.readSealed ?? readSealedL4Candidate)(project, moduleName, prepared.change.changeId, revision.revisionId);
  if (!sealed) throw new Error('l4.implementation_not_ready');
  current();
  if (sealed.manifest.changedPaths.length) sealed = await (dependencies.review ?? reviewInitialCandidate)(sealed, acceptedBy);
  current();
  const { changeId, revisionId, baseId } = sealed.manifest;
  await (dependencies.sealLayers ?? sealModuleLayers)(project, moduleName, baseId);
  current();
  await (dependencies.promote ?? promoteL4Revision)(project, moduleName, changeId, revisionId);
  current();
  return (dependencies.accept ?? acceptL4Implementation)(project, moduleName, { kind: 'initial', revisionId, acceptedBy, plan });
}

@customElement('new-release--widgets--review-102035')
export class NewReleaseReview102035 extends StateLitElement {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) request = '';
  @property({ attribute: false }) identityError = '';

  @state() private menuRead: MenuReadResult = EMPTY_MENU;
  @state() private pool: ReviewPoolBoxView[] = [];
  @state() private backendRead: ReviewArtifactRead = EMPTY_ARTIFACT;
  @state() private effortRead: ReviewArtifactRead = EMPTY_ARTIFACT;
  @state() private changeEffortRead: ReviewArtifactRead = EMPTY_ARTIFACT;
  @state() private loading = false;
  @state() private hasRelease = false;
  @state() private effortCurrent = false;
  @state() private initialPlan: InitialImplementationPlan | null = null;
  @state() private selectedActor = '';
  @state() private selectedId = '';
  @state() private selectedScope: ReviewNodeScope = 'future';
  @state() private expandedKeys: string[] = [];
  @state() private actionBusy = false;
  @state() private actionError = '';
  @state() private initialErrorDetail = '';
  @state() private publishNotice = false;
  @state() private reviewRun: ReviewRunRecord | null = null;
  @state() private reviewRunLoadError = '';
  @state() private channelRun: PlatformReviewRun | null = null;

  @state() private implementationBusy = false;
  @state() private implementation: L4ImplementationRecord | null = null;
  @state() private implementationHashes: L4ImplementationHashes = { changeEffort: '' };

  @state() private implementationDiff: ModuleLayerDiff[] | null = null;
  @state() private implementationRestored = false;
  private implementationFlight: Promise<void> | null = null;

  private loadToken = 0;
  private readonly adoptedRuns = new Set<string>();
  private readonly reviewRunStore = new IndexedDbReviewRunStore();
  private readonly workerTransport = createReviewWorkerTransport();
  private readonly workerHost = createReviewStudioHost();
  private workerTimer?: number;
  private implementationTimer?: number;
  private readonly implementationRunner = createImplementationRunner();
  private readonly initialApply = applyInitialReview;
  private loadedFor: { project: number; moduleName: string; version: NewReleaseVersion; data: NewReleaseModuleData | null } | null = null;

  createRenderRoot() { return this; }

  disconnectedCallback() {
    ++this.loadToken;
    this.stopImplementationTimer();
    if (this.workerTimer) window.clearTimeout(this.workerTimer);
    super.disconnectedCallback();
  }

  updated(changed: PropertyValues) {
    if (changed.has('project') || changed.has('moduleName') || changed.has('version') || changed.has('data') || changed.has('request')) {
      this.selectedActor = '';
      this.selectedId = '';
      this.selectedScope = 'future';
      this.expandedKeys = [];
      this.actionBusy = false;
      this.actionError = '';
      this.publishNotice = false;
      this.reviewRun = null;
      this.reviewRunLoadError = '';
      this.channelRun = null;
      if (this.workerTimer) window.clearTimeout(this.workerTimer);
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
    this.changeEffortRead = EMPTY_ARTIFACT;
    this.effortCurrent = false;
    this.initialPlan = null;
    this.stopImplementationTimer();
    this.implementationDiff = null;
    this.implementationRestored = false;
    const context = { project: this.project, moduleName: this.moduleName, version: this.version, data: this.data };
    this.loadedFor = null;
    this.implementation = null;
    this.implementationHashes = { changeEffort: '' };
    if (!this.project || !this.moduleName) {
      this.menuRead = EMPTY_MENU;
      this.backendRead = EMPTY_ARTIFACT;
      this.effortRead = EMPTY_ARTIFACT;
      this.pool = [];
      this.reviewRun = null;
      this.reviewRunLoadError = '';
      this.loadedFor = context;
      this.loading = false;
      return;
    }
    this.loading = true;
    const runRead = context.version === 'tobe' && context.data?.changeId && context.data.revisionId
      ? this.reviewRunStore.read({
        project: context.project,
        moduleName: context.moduleName,
        changeId: context.data.changeId,
        inputRevisionId: context.data.revisionId,
      }).then(run => ({ run, errorCode: '' }), () => ({ run: null, errorCode: 'review.run.storeError' }))
      : Promise.resolve({ run: null, errorCode: '' });
    const [menuRead, backendRead, effortRead, changeEffortRead, pool, persistedRun, implementation] = await Promise.all([
      readModuleMenu(context.project, context.moduleName),
      readReviewArtifact(context.project, context.moduleName, 'backend'),
      readReviewArtifact(context.project, context.moduleName, 'effort'),
      readReviewArtifact(context.project, context.moduleName, 'changeEffort'),
      readReviewPoolBoxes(context.project, context.moduleName),
      runRead,
      (context.data?.changeId ? readL4Implementation(context.project, context.moduleName) : readLatestCompletedL4Implementation(context.project, context.moduleName)).then(value => ({ value, error: false }), () => ({ value: null, error: true })),
    ]);
    if (token !== this.loadToken) return;
    this.hasRelease = moduleHasGeneratedSources(context.project, context.moduleName, Object.values(mls.stor.files).filter(file => !!file));
    if (!this.hasRelease && (context.version === 'asis' || context.version === 'tobe')) {
      try { this.initialPlan = await readInitialImplementationPlan(context.project, context.moduleName); }
      catch (error) { console.error('[newRelease] initial planning unavailable', error); }
      if (token !== this.loadToken) return;
    }
    const candidateImplementation = implementation.value ?? (!context.data?.resultCurrent && !context.data?.diffs.some(diff => diff.entries.length)
      ? await readLatestCompletedL4Implementation(context.project, context.moduleName) : null);
    if (token !== this.loadToken) return;
    this.implementation = reviewImplementationVisible(candidateImplementation, context.data) ? candidateImplementation : null;
    if (implementation.error) this.actionError = 'review.implementation.error.load';
    this.menuRead = menuRead;
    this.backendRead = backendRead;
    this.effortRead = effortRead;
    this.changeEffortRead = changeEffortRead;
    this.pool = pool;
    this.reviewRun = persistedRun.run;
    this.reviewRunLoadError = persistedRun.errorCode;
    await this.loadChannelRun(context, token);
    if (token !== this.loadToken) return;
    if (!this.effortCurrent && context.version === 'tobe' && context.data?.resultCurrent && context.data.changeId && context.data.revisionId) {
      const root = `${context.moduleName}/pipeline/changes/${context.data.changeId}/revisions/${context.data.revisionId}/l4`;
      const effort = await this.readCandidateChangeEffort(context.project, context.moduleName, root);
      const fresh = effort.read.status === 'ok' && await effortMatchesCurrent(context.project, context.moduleName, effort.read.value);
      if (token !== this.loadToken) return;
      this.changeEffortRead = effort.read;
      this.effortCurrent = fresh;
      this.implementationHashes = { changeEffort: fresh ? effort.hash : '' };
    }
    if (!this.isConnected || context.project !== this.project || context.moduleName !== this.moduleName
      || context.version !== this.version || context.data !== this.data) return;
    this.loadedFor = context;
    this.loading = false;
    if (this.implementationPending()) void this.advanceImplementation(token);
    else if (this.implementationComplete()) void this.finalizeImplementation(token);
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
    if (!this.hasRelease) return nothing;
    if (view.kind === 'pending') {
      return html`
        <section class="nr-review__pending">
          <h3>${this.t('review.pendingTitle')}</h3>
          <p>${this.t('review.pendingBody')}</p>
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
    `;
  }

  private async prepareStartInput(): Promise<{ input: ReviewRunStartInput; userId: string }> {
    if (this.version !== 'tobe') throw new Error('review-run.invalid_request');
    return prepareReviewStartInput({
      project: this.project,
      moduleName: this.moduleName,
      changeId: this.data?.changeId ?? null,
      revisionId: this.data?.revisionId ?? null,
      request: this.request,
      userId: getUserId(),
      loaded: this.data?.sealedRevision ?? null,
    });
  }

  private workerId(): string {
    const key = 'collab-new-release-review-worker-id-v1';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `studio-${crypto.randomUUID()}`;
    localStorage.setItem(key, created);
    return created;
  }

  private async loadChannelRun(
    context: { project: number; moduleName: string; version: NewReleaseVersion; data: NewReleaseModuleData | null },
    token: number,
  ): Promise<void> {
    if (context.version !== 'tobe' || !context.data?.changeId || !context.data.revisionId) return;
    const link = readReviewRunLink({
      project: context.project,
      moduleName: context.moduleName,
      changeId: context.data.changeId,
      inputRevisionId: context.data.revisionId,
    });
    if (!link) return;
    try {
      const run = await observeReviewRun(link);
      if (token !== this.loadToken) return;
      let revisionMatches = reviewRunMatchesRevision(run, context.data.revisionId);
      if (!revisionMatches && run.candidateResult === null) {
        const published = await candidateRead({ project: run.binding.project, moduleName: run.binding.moduleName });
        if (token !== this.loadToken) return;
        revisionMatches = publishedCandidateMatchesRunRevision(run, context.data.revisionId, published);
      }
      if (!revisionMatches) return;
      this.channelRun = run;
      if (!['ready', 'failed', 'disputed'].includes(run.status)) {
        await this.driveWorker(run, link.userId, token);
      } else if (run.status === 'ready') {
        await this.loadCandidateArtifacts(run, link.userId, token);
      }
    } catch (error) {
      if (token !== this.loadToken) return;
      this.reviewRunLoadError = this.reviewRunErrorKey(error instanceof Error ? error.message : String(error));
    }
  }

  private async driveWorker(run: PlatformReviewRun, userId: string, token = this.loadToken): Promise<void> {
    const candidate = await readCandidateWorkerGate(run);
    if (token !== this.loadToken) return;
    const canonicalHash = await this.readCanonicalSnapshotHash(run);
    if (token !== this.loadToken) return;
    let publishedExecution: { taskId: string; resultRunId: string } | undefined;
    if (['queued', 'reviewing'].includes(run.status) && run.candidateResult === null) {
      const published = await candidateRead({ project: run.binding.project, moduleName: run.binding.moduleName });
      if (token !== this.loadToken) return;
      if (published.status === 'read' && published.pointer && published.result
        && publishedCandidateMatchesRunRevision(run, published.pointer.revisionId, published)) {
        const { manifest } = (published as unknown as { result: { manifest: { taskId: string; runId: string } } }).result;
        publishedExecution = { taskId: manifest.taskId, resultRunId: manifest.runId };
      }
    }
    const result = await driveReviewRunWorker(
      this.workerTransport,
      this.workerHost,
      claimInputForRun(run, userId, this.workerId(), canonicalHash, candidate),
      publishedExecution,
    );
    const current = result.state === 'reported'
      ? result.run
      : await observeReviewRun(this.identityForRun(run, userId));
    if (token !== this.loadToken) return;
    this.channelRun = current;
    this.saveOutputAlias(current, userId);
    if (current.status === 'ready') {
      await this.loadCandidateArtifacts(current, userId, token);
      return;
    }
    if (current.status === 'failed' || current.status === 'disputed') return;
    if (this.workerTimer) window.clearTimeout(this.workerTimer);
    this.workerTimer = window.setTimeout(() => {
      this.workerTimer = undefined;
      if (token !== this.loadToken) return;
      void this.driveWorker(current, userId, token).catch(error => {
        if (token !== this.loadToken) return;
        this.actionError = this.reviewRunErrorKey(error instanceof Error ? error.message : String(error));
      });
    }, POLL_INTERVAL_MS);
  }

  private async readCanonicalSnapshotHash(run: PlatformReviewRun): Promise<`sha256:${string}`> {
    const sealed = await readSealedL4Candidate(
      run.binding.project, run.binding.moduleName, run.binding.changeId, run.binding.inputRevisionId,
    );
    if (!sealed) throw new Error('review-run.canonical_snapshot_unavailable');
    const sources = await Promise.all(sealed.sources.map(async item => ({
      path: item.path,
      source: await readSourceText(originalL4FileInfo(
        run.binding.project, run.binding.moduleName, run.binding.baseId, item.path,
      )),
    })));
    const snapshot = await buildCandidateSnapshot({
      baseId: run.binding.baseId,
      requestRevision: run.binding.requestRevision,
      request: sealed.request,
      sources,
    });
    return `sha256:${snapshot.hash}`;
  }

  private async loadCandidateArtifacts(run: PlatformReviewRun, userId: string, token = this.loadToken): Promise<void> {
    const revisionId = outputRevisionIdForRun(run);
    if (!revisionId) throw new Error('review-run.candidate_binding_mismatch');
    const root = `${run.binding.moduleName}/pipeline/changes/${run.binding.changeId}/revisions/${revisionId}/l4`;
    const [menu, backend, effort, changeEffort] = await Promise.all([
      readModuleMenu(run.binding.project, run.binding.moduleName, root),
      readReviewArtifact(run.binding.project, run.binding.moduleName, 'backend', root),
      readReviewArtifact(run.binding.project, run.binding.moduleName, 'effort', root),
      this.readCandidateChangeEffort(run.binding.project, run.binding.moduleName, root),
    ]);
    if (token !== this.loadToken) return;
    const fresh = changeEffort.read.status === 'ok' && await effortMatchesCurrent(run.binding.project, run.binding.moduleName, changeEffort.read.value);
    if (token !== this.loadToken) return;
    this.effortCurrent = fresh;
    this.implementationHashes = { changeEffort: fresh ? changeEffort.hash : '' };
    this.menuRead = menu;
    this.backendRead = backend;
    this.effortRead = effort;
    this.changeEffortRead = changeEffort.read;
    this.pool = [];
    this.saveOutputAlias(run, userId);
    if (run.status !== 'ready' || this.adoptedRuns.has(run.runId)
      || (this.data?.revisionId === revisionId && this.data.resultCurrent)) return;
    const gate = await readCandidateWorkerGate(run);
    if (token !== this.loadToken || !gate.pipelineComplete || this.adoptedRuns.has(run.runId)) return;
    this.adoptedRuns.add(run.runId);
    try {
      await adoptL4ReviewResult(run.binding.project, run.binding.moduleName, {
        inputRevisionId: run.binding.inputRevisionId,
        outputRevisionId: revisionId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'l4.result_stale') return;
      this.adoptedRuns.delete(run.runId);
      throw error;
    }
    window.dispatchEvent(new CustomEvent(NEW_RELEASE_TOBE_UPDATED_EVENT, {
      detail: { project: run.binding.project, moduleName: run.binding.moduleName },
    }));
  }

  private async readCandidateChangeEffort(project: number, moduleName: string, root: string): Promise<{ read: ReviewArtifactRead; hash: string }> {
    const effortInfo = reviewArtifactFile(project, moduleName, 'changeEffort', root);
    const effortPath = `l4/${effortInfo.folder}/${effortInfo.shortName}${effortInfo.extension}`;
    const readEffort = async (): Promise<{ read: ReviewArtifactRead; hash: string }> => {
      const stored = mls.stor.files[mls.stor.getKeyToFile(effortInfo)] as { status?: string } | undefined;
      if (!stored || stored.status === 'deleted') return { read: { status: 'missing', path: effortPath }, hash: '' };
      let source: string;
      try { source = await readSourceText(effortInfo); }
      catch (cause) { console.error('[newRelease] effort artifact could not be read', { effortPath, cause }); return { read: { status: 'invalid', path: effortPath }, hash: '' }; }
      let value: unknown;
      try { value = JSON.parse(source); }
      catch (cause) { console.error('[newRelease] effort artifact could not be read', { effortPath, cause }); return { read: { status: 'invalid', path: effortPath }, hash: '' }; }
      if (value === null) return { read: { status: 'invalid', path: effortPath }, hash: '' };
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
      return { read: { status: 'ok', path: effortPath, value },
        hash: `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}` };
    };
    return readEffort();
  }

  private saveOutputAlias(run: PlatformReviewRun, userId: string): void {
    const revisionId = outputRevisionIdForRun(run);
    if (!revisionId) return;
    saveReviewRunLink(this.identityForRun(run, userId), undefined, {
      project: run.binding.project,
      moduleName: run.binding.moduleName,
      changeId: run.binding.changeId,
      inputRevisionId: revisionId,
    });
  }

  private identityForRun(run: PlatformReviewRun, userId: string): ReviewWorkerIdentity {
    return {
      userId,
      project: run.binding.project,
      moduleName: run.binding.moduleName,
      changeId: run.binding.changeId,
      inputRevisionId: run.binding.inputRevisionId,
      inputSnapshotHash: run.binding.inputSnapshotHash,
      baseId: run.binding.baseId,
      requestRevision: run.binding.requestRevision,
      requestHash: run.binding.requestHash,
      runId: run.runId,
    };
  }

  private runReviewPrimaryAction = async () => {
    const action = this.actionPresentation(this.view(), this.isCurrentLoad());
    const start = beginReviewPrimaryAction(action);
    if (!start.accepted) return;
    if (action.kind === 'continue') {
      if (this.isInitialGeneration()) { await this.acceptInitialImplementation(); return; }
      await this.acceptImplementation();
      return;
    }
    if (!['calculate', 'retry'].includes(action.kind)) return;
    this.actionBusy = start.busy;
    this.actionError = '';
    try {
      const retry = this.channelRun?.status === 'failed' || this.channelRun?.status === 'disputed';
      const userId = getUserId();
      if (!userId) throw new Error('review-worker.user_unavailable');
      let started: Awaited<ReturnType<typeof executePreparedReviewStart<PlatformReviewRun>>>;
      if (retry && this.channelRun) {
        const input = this.retryStartInput(this.channelRun, userId);
        started = {
          prepared: { input, userId },
          run: await startReviewRun({ ...input, retry: true }),
        };
      } else {
        started = await executePreparedReviewStart(() => this.prepareStartInput(), startReviewRun);
      }
      const { prepared, run } = started;
      const identity: ReviewWorkerIdentity = { ...prepared.input, runId: run.runId };
      saveReviewRunLink(identity);
      this.channelRun = run;
      await this.driveWorker(run, prepared.userId);
    } catch (error) {
      this.actionError = this.reviewRunErrorKey(error instanceof Error ? error.message : String(error));
    } finally {
      this.actionBusy = false;
    }
  };

  private isInitialGeneration(): boolean {
    return !this.hasRelease && !(this.data?.resultCurrent && this.changeEffortRead.status !== 'missing');
  }

  private async acceptInitialImplementation(): Promise<void> {
    if (this.actionBusy || !this.initialPlan || !this.isInitialGeneration() || !this.isCurrentLoad()
      || (this.version !== 'asis' && this.version !== 'tobe')) return;
    const { project, moduleName, version, data } = this;
    const token = this.loadToken;
    const current = () => this.isConnected && token === this.loadToken && this.project === project
      && this.moduleName === moduleName && this.version === version && this.data === data;
    this.actionBusy = true;
    this.actionError = '';
    this.initialErrorDetail = '';
    try {
      const record = await this.initialApply({ project, moduleName, acceptedBy: getUserId() ?? '',
        changeId: data?.changeId ?? null, revisionId: data?.revisionId ?? null }, { current });
      if (!current()) return;
      this.implementation = record;
      this.initialPlan = null;
      // The context owner reloads the accepted revision in tobe; load() resumes its persisted phases.
      window.dispatchEvent(new CustomEvent(NEW_RELEASE_TOBE_UPDATED_EVENT, { detail: { project, moduleName, version: 'tobe' } }));
    } catch (error) {
      if (current()) this.actionError = error instanceof Error && error.message === 'l4.implementation_conflict'
        ? 'review.implementation.error.conflict' : 'review.implementation.error.run';
      if (current()) this.initialErrorDetail = error instanceof Error ? error.message : String(error);
      console.error('[newRelease] initial implementation failed', error);
    } finally { if (current()) this.actionBusy = false; }
  }

  private canImplement(): boolean {
    return this.effortCurrent && canAcceptImplementation({ project: this.project, moduleName: this.moduleName, data: this.data,
      runStatus: this.channelRun?.status ?? this.reviewRun?.status ?? (this.data?.resultCurrent ? 'ready' : null),
      changeEffort: this.changeEffortRead,
      hashes: this.implementationHashes, implementation: this.implementation });
  }

  private async acceptImplementation(): Promise<void> {
    const data = this.data;
    const acceptedBy = getUserId();
    const baseId = data?.sealedRevision?.manifest.baseId;
    if (this.actionBusy || !this.canImplement() || !data?.changeId || !data.revisionId || !baseId || !acceptedBy) return;
    const { project, moduleName } = this;
    const token = this.loadToken;
    const current = () => this.implementationContextCurrent(token);
    const { changeId, revisionId } = data;
    const hashes = { ...this.implementationHashes };
    this.actionBusy = true;
    this.actionError = '';
    this.querySelectorAll<HTMLButtonElement>('.nr-review__primary-action button').forEach(button => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
    });
    let accepted = false;
    let phase: 'seal' | 'promote' | 'accept' | 'restore' = 'seal';
    try {
      if (!await effortMatchesCurrent(project, moduleName, this.changeEffortRead.value)) {
        this.effortCurrent = false;
        this.actionError = 'review.implementation.error.conflict';
        return;
      }
      await sealModuleLayers(project, moduleName, baseId);
      phase = 'promote';
      await promoteL4Revision(project, moduleName, changeId, revisionId);
      phase = 'accept';
      const implementation = await acceptL4Implementation(project, moduleName, { revisionId, acceptedBy, hashes });
      accepted = true;
      if (current()) this.implementation = implementation;
    } catch (error) {
      if (phase === 'accept') {
        try {
          await restoreModuleFromSeals(project, moduleName, baseId);
        } catch {
          phase = 'restore';
        }
      }
      if (current()) {
        this.actionError = phase === 'accept' && error instanceof Error
          ? error.message === 'l4.implementation_conflict' ? 'review.implementation.error.conflict'
            : error.message === 'l4.implementation_regenerate_unsupported' ? 'review.implementation.error.regenerateUnsupported'
              : error.message === 'l4.implementation_blocked' ? 'review.implementation.error.blocked'
                : `review.implementation.error.${phase}`
          : `review.implementation.error.${phase}`;
      }
    } finally {
      if (current()) this.actionBusy = false;
    }
    // Execution failures must never roll back a successfully accepted revision.
    if (accepted && current()) {
      await this.advanceImplementation(token);
      if (current()) await this.finalizeImplementation(token);
    }
  }

  private stopImplementationTimer(): void {
    if (this.implementationTimer !== undefined) window.clearTimeout(this.implementationTimer);
    this.implementationTimer = undefined;
  }

  private implementationContextCurrent(token: number): boolean {
    return this.isConnected && token === this.loadToken && this.isCurrentLoad() && this.version === 'tobe';
  }

  private implementationPending(): boolean {
    const record = this.implementation;
    return !!record && record.changeId === this.data?.changeId && record.revisionId === this.data?.revisionId && this.version === 'tobe' && !record.phases.some(phase => phase.status === 'failed')
      && implementationCommands(record, this.project, this.moduleName).some((_, index) => !record.phases.some(phase => phase.name === `runAgents:${index}` && phase.status === 'done'));
  }

  private async advanceImplementation(token = this.loadToken, retry?: string): Promise<void> {
    if (this.implementationFlight) await this.implementationFlight;
    if (!this.implementationContextCurrent(token) || this.implementationFlight) return;
    const flight = this.runImplementation(token, retry);
    this.implementationFlight = flight;
    try { await flight; } finally {
      if (this.implementationFlight === flight) this.implementationFlight = null;
    }
  }

  private async runImplementation(token: number, retry?: string): Promise<void> {
    if (!this.implementationContextCurrent(token) || this.implementationBusy) return;
    if (retry) {
      const phase = this.implementation?.phases.find(phase => phase.name === retry);
      if (phase?.status !== 'failed' || phase.attempt >= 2) return;
    } else if (!this.implementationPending()) return;
    this.stopImplementationTimer();
    const { project, moduleName } = this;
    this.implementationBusy = true;
    this.actionError = '';
    try {
      const record = retry
        ? await this.implementationRunner.retryPhase(project, moduleName, retry)
        : await this.implementationRunner.runNext(project, moduleName);
      if (!this.implementationContextCurrent(token)) return;
      this.implementation = record.changeId === this.data?.changeId ? record : null;
      if (this.implementationComplete()) await this.finalizeImplementation(token);
      if (!this.implementationContextCurrent(token)) return;
      // A synchronous completion can leave the next phase absent, with none running.
      if (this.implementationPending()) {
        this.implementationTimer = window.setTimeout(() => {
          this.implementationTimer = undefined;
          if (this.implementationContextCurrent(token)) void this.advanceImplementation(token);
        }, POLL_INTERVAL_MS);
      }
    } catch (error) {
      if (this.implementationContextCurrent(token)) this.actionError = error instanceof Error ? error.message : 'review.implementation.error.run';
    } finally {
      this.implementationBusy = false;
    }
  }

  private hasImplementation(): boolean {
    return this.version === 'tobe' && this.isCurrentLoad() && !!this.implementation
      && reviewImplementationVisible(this.implementation, this.data);
  }

  private implementationComplete(): boolean {
    return this.hasImplementation() && implementationProgress(this.implementation, this.implementation?.changeId ?? null, this.project, this.moduleName)
      .every(phase => phase.status === 'concluido');
  }

  private async finalizeImplementation(token: number): Promise<void> {
    if (!this.implementationContextCurrent(token) || !this.implementationComplete() || !this.data?.changeId) return;
    const record = this.implementation!;
    if (record.changeId !== this.data.changeId || record.revisionId !== this.data.revisionId) return;
    await this.loadImplementationDiff(token);
    if (!this.implementationContextCurrent(token)) return;
    if (record.initial) this.hasRelease = moduleHasGeneratedSources(this.project, this.moduleName, Object.values(mls.stor.files));
    try { await completeTobeImplementation(this.project, this.moduleName, record.changeId, record.revisionId); }
    catch (error) { if (this.implementationContextCurrent(token)) this.actionError = error instanceof Error ? error.message : 'review.implementation.error.run'; }
  }

  private async loadImplementationDiff(token: number): Promise<void> {
    const baseId = this.data?.sealedRevision?.manifest.baseId;
    if (!baseId || !this.implementationContextCurrent(token)) return;
    try {
      const diff = await diffModuleLayers(this.project, this.moduleName, baseId);
      if (this.implementationContextCurrent(token)) this.implementationDiff = diff;
    } catch {
      if (this.implementationContextCurrent(token)) this.actionError = 'review.implementation.error.diff';
    }
  }

  private async refuseImplementation(): Promise<void> {
    const baseId = this.data?.sealedRevision?.manifest.baseId;
    if (!this.implementationComplete() || this.implementationBusy || this.implementationRestored || !baseId) return;
    if (!window.confirm(this.t('review.implementation.refuseConfirm'))) return;
    const token = this.loadToken;
    const { project, moduleName } = this;
    this.implementationBusy = true;
    this.actionError = '';
    try {
      await restoreModuleFromSeals(project, moduleName, baseId);
      if (!this.implementationContextCurrent(token)) return;
      this.implementationRestored = true;
      await this.loadImplementationDiff(token);
    } catch {
      if (this.implementationContextCurrent(token)) this.actionError = 'review.implementation.error.refuse';
    } finally {
      this.implementationBusy = false;
    }
  }

  private renderImplementation(placement: 'top' | 'bottom') {
    if (!this.hasImplementation()) return nothing;
    if (this.implementationComplete()) return html`<section class="nr-review__run">${this.actionError ? html`<p role="alert">${this.tStoredReviewError(this.actionError)}</p>` : nothing}${this.implementation!.phases.filter(phase => phase.report).map(phase => html`<article><strong>${phase.agent}</strong><pre>${phase.report}</pre></article>`)}</section>`;
    const phases = implementationProgress(this.implementation, this.implementation?.changeId ?? null, this.project, this.moduleName);
    const materialize = this.implementation!.merged.materialize;
    return html`
      <section class=${`nr-review__run nr-review__implementation is-${placement}`} aria-live=${placement === 'top' ? 'polite' : 'off'}>
        <h3>${this.t('review.implementation.progress')}</h3>
        ${materialize.length ? html`<section class="nr-review__implementation-materialize">
          <h4>${this.t('review.implementation.materialize')}</h4>
          <ul>${materialize.map(unit => html`<li><code>${unit.path}</code></li>`)}</ul>
        </section>` : nothing}
        ${phases.length ? html`
        <ol>
          ${phases.map(phase => html`
            <li class=${`is-${phase.status}`}>
              <div class="nr-review__phase-heading">
                <strong>${implementationCommands(this.implementation!, this.project, this.moduleName)[Number(phase.name.split(':')[1])]?.agent}</strong>
                <span>${this.t(`review.implementation.status.${phase.status}`)}</span>
                ${phase.attempt ? html`<small>${this.t('review.implementation.attempt', { attempt: phase.attempt })}</small>` : nothing}
              </div>
              ${this.implementation?.phases.find(item => item.name === phase.name)?.report ? html`<pre>${this.implementation.phases.find(item => item.name === phase.name)!.report}</pre>` : nothing}
              ${phase.error ? html`<p class="nr-review__implementation-error">${this.tStoredReviewError(phase.error)}</p>` : nothing}
              ${phase.previousAttempts?.length ? html`<details>
                <summary>${this.t('review.implementation.previousAttempts')}</summary>
                ${phase.previousAttempts.map(previous => html`<p>${this.t('review.implementation.attempt', { attempt: previous.attempt })}: ${previous.error || this.t('review.implementation.status.falhou')}</p>`)}
              </details>` : nothing}
              ${phase.changedDefs?.length ? html`<details>
                <summary>${this.t('review.implementation.changedDefs', { count: phase.changedDefs.length })}</summary>
                <ul>${phase.changedDefs.map(file => html`<li><code>${file.path}</code> <span>${this.t(`review.implementation.file.${file.status}`)}</span></li>`)}</ul>
              </details>` : nothing}
              ${phase.podeTentarDeNovo ? html`
                <button type="button" class="nr-review__implementation-retry" ?disabled=${this.implementationBusy}
                  @click=${() => void this.advanceImplementation(this.loadToken, phase.name)}>${this.t('review.implementation.retry')}</button>
              ` : nothing}
            </li>
          `)}
        </ol>` : nothing}
        ${this.actionError ? html`<p role=${placement === 'top' ? 'alert' : nothing}>${this.tStoredReviewError(this.actionError)}</p>` : nothing}
        ${this.implementationComplete() ? html`
          <p class="nr-review__implementation-note">${this.t('review.implementation.completedBody')}</p>
          ${this.implementationDiff === null ? html`<p>${this.t('state.loading')}</p>` : html`
            ${([2, 1] as const).map(level => html`<details class="nr-review__implementation-level">
              <summary>${this.t('review.implementation.level', { level })}</summary>
              <ul>${this.implementationDiff!.filter(file => file.level === level).map(file => html`
                <li><code>${file.path}</code> <span>${this.t(`review.implementation.file.${file.status}`)}</span></li>
              `)}</ul>
              ${!this.implementationDiff!.some(file => file.level === level) ? html`<p>${this.t('review.implementation.noChanges')}</p>` : nothing}
            </details>`)}
          `}
          ${this.implementationRestored ? html`<p>${this.t('review.implementation.restored')}</p>` : html`
            <button type="button" class="nr-review__implementation-refuse" ?disabled=${this.implementationBusy || !this.data?.sealedRevision?.manifest.baseId}
              @click=${() => void this.refuseImplementation()}>${this.t('review.implementation.refuse')}</button>
          `}
        ` : nothing}
      </section>
    `;
  }

  private retryStartInput(run: PlatformReviewRun, userId: string): ReviewRunStartInput {
    const identity = this.identityForRun(run, userId);
    const { runId: _runId, ...input } = identity;
    return input;
  }

  private actionPresentation(view: ReviewView, current: boolean): ReviewPrimaryActionPresentation {
    if (this.isInitialGeneration() && (this.version === 'asis' || this.version === 'tobe')) {
      return { kind: 'continue', labelKey: this.actionBusy ? 'review.actionBusy' : 'review.implementation.accept',
        descriptionKey: 'review.panels.fullGenerationBody', availabilityKey: getUserId() ? '' : 'request.userUnavailable',
        disabled: !current || this.loading || this.actionBusy || !this.initialPlan || !!this.implementation || !getUserId()
          || this.data?.pipeline?.status !== 'complete' || this.data?.validation.ok !== true,
        busy: this.actionBusy, error: this.actionError ? [this.tStoredReviewError(this.actionError), this.initialErrorDetail].filter(Boolean).join(': ') : '' };
    }
    const backend = buildBackendReview(this.backendRead, view.kind === 'pending', this.moduleName);
    const effort = parseEffortSummary(this.effortRead, this.moduleName);
    const active = !!this.channelRun && !['ready', 'failed', 'disputed'].includes(this.channelRun.status);
    const retry = this.channelRun?.status === 'failed' || this.channelRun?.status === 'disputed';
    const action = buildReviewActionPresentation({
      viewKind: retry ? 'pending' : view.kind,
      version: this.version,
      loading: this.loading,
      current,
      resultCurrent: retry ? false : this.data?.resultCurrent === true,
      backendKind: backend.kind,
      effortKind: effort.kind,
      busy: this.actionBusy,
      connected: retry ? !active && !!getUserId() : canStartReviewRun({
        project: this.project,
        moduleName: this.moduleName,
        changeId: this.data?.changeId ?? null,
        revisionId: this.data?.revisionId ?? null,
        request: this.request,
        userId: getUserId(),
        hasRun: !!this.channelRun,
        sealedRevision: this.data?.sealedRevision ?? null,
      }),
      retry,
      retryAvailable: !retry || this.channelRun!.attempt < REVIEW_RUN_MAX_ATTEMPTS,
      error: this.actionError ? this.tStoredReviewError(this.actionError) : '',
    });
    const accepted = this.implementation?.changeId === this.data?.changeId
      && this.implementation?.revisionId === this.data?.revisionId && !!this.implementation;
    const changeEffort = buildChangeEffortView(this.changeEffortRead);
    if (this.version === 'tobe' && current && changeEffort.kind !== 'missing'
      && this.data?.resultCurrent && this.effortCurrent) {
      const reason = changeEffort.kind !== 'ready' ? 'review.effort.invalid'
        : changeEffort.status === 'blocked' ? 'review.effort.status.blocked'
          : 'review.implementation.body';
      return { ...action, kind: 'continue',
        labelKey: this.actionBusy ? 'review.actionBusy' : accepted ? 'review.implementation.accepted' : 'review.implementation.accept',
        descriptionKey: accepted ? 'review.implementation.acceptedBody' : reason,
        availabilityKey: '', disabled: this.actionBusy || this.loading || accepted || !getUserId() || !this.canImplement(),
      };
    }
    if (this.version === 'tobe' && current && accepted) {
      return { ...action, kind: 'continue',
        labelKey: this.actionBusy ? 'review.actionBusy' : accepted ? 'review.implementation.accepted' : 'review.implementation.accept',
        descriptionKey: accepted ? 'review.implementation.acceptedBody' : 'review.implementation.body',
        availabilityKey: '',
        disabled: this.actionBusy || this.loading || accepted || !getUserId() || !this.canImplement(),
      };
    }
    if (this.version === 'tobe' && current && !this.effortCurrent && !active && !retry) return {
      ...action, kind: 'calculate', labelKey: this.actionBusy ? 'review.actionBusy' : 'review.calculate',
      descriptionKey: 'review.actionCalculateBody', availabilityKey: getUserId() ? '' : 'request.userUnavailable',
      disabled: this.actionBusy || this.loading || !getUserId() || !this.data?.sealedRevision,
    };
    return action;
  }

  private reviewRunErrorKey(code: string | null): string {
    if (code && /(?:^| \| reason: )review\.not_publishable:(invalid|unsupported):([A-Z][A-Z0-9_]*(?:,[A-Z][A-Z0-9_]*){0,4})?$/u.test(code)) return 'review.run.error.notPublishable';
    if (code?.startsWith('review-worker.agent_paused')) return 'review.run.error.agentPaused';
    if (code === 'review.run.error.agentPaused') return code;
    if (code === 'review-run.planner_result_contract_pending') return 'review.run.error.resultPending';
    if (code === 'review-run.channel_failed' || code === 'review-run.channel_ended_without_terminal') {
      return 'review.run.error.channel';
    }
    if (code === 'review-run.invalid_terminal_result') return 'review.run.error.invalidResult';
    if (code === 'review-run.hub_publish_conflict') return 'review.run.error.hubConflict';
    if (code === 'review-run.hub_revision_differs') return 'review.run.error.hubRevisionDiffers';
    return code ? 'review.run.error.generic' : '';
  }

  private tReviewRunError(code: string | null): string {
    const key = this.reviewRunErrorKey(code);
    if (key === 'review.run.error.notPublishable') {
      const [, status = '', codes = ''] = code!.match(/(?:^| \| reason: )review\.not_publishable:(invalid|unsupported):([A-Z][A-Z0-9_]*(?:,[A-Z][A-Z0-9_]*){0,4})?$/u)!;
      return this.t(key, { status, codes });
    }
    if (key !== 'review.run.error.agentPaused') return this.t(key);
    const prefix = 'review-worker.agent_paused';
    const motivo = code?.startsWith(prefix) ? code.slice(prefix.length).replace(/^:/, '') : '';
    return this.t(key, { motivo });
  }

  private renderGenericFailureDetail(run: PlatformReviewRun) {
    if (run.status !== 'failed' || this.reviewRunErrorKey(run.errorCode) !== 'review.run.error.generic') return nothing;
    const taskId = run.executions[0]?.taskId;
    if (!run.errorCode && !taskId) return nothing;
    return html`
      <div>
        ${run.errorCode ? html`<p><span>${this.t('review.run.error.generic.code')}</span> <code style="overflow-wrap:anywhere;white-space:pre-wrap">${run.errorCode}</code></p>` : nothing}
        ${taskId ? html`<p><span>${this.t('review.run.error.generic.task')}</span> <code>${taskId}</code></p>` : nothing}
      </div>
    `;
  }

  private tStoredReviewError(stored: string): string {
    if (stored.startsWith('review-worker.agent_paused') || stored === 'review.run.error.agentPaused') {
      return this.tReviewRunError(stored);
    }
    return this.t(stored);
  }

  private renderReviewRun() {
    if (this.version !== 'tobe') return nothing;
    if (this.reviewRunLoadError) {
      return html`<section class="nr-review__run"><p role="alert">${this.tStoredReviewError(this.reviewRunLoadError)}</p></section>`;
    }
    const channel = this.channelRun;
    if (channel) {
      const execution = channel.executions[channel.executions.length - 1];
      const terminal = channel.status === 'ready' || channel.status === 'failed' || channel.status === 'disputed';
      const stateKey = terminal ? `review.run.status.${channel.status}` : `review.run.phase.${channel.status}`;
      return html`
        <section class=${`nr-review__run is-${channel.status}`} aria-live="polite">
          <header><div><span>${this.t('review.run.eyebrow')}</span><h3>${this.t('review.run.title')}</h3></div><strong>${this.t(stateKey)}</strong></header>
          ${channel.errorCode ? html`<p role="alert">${this.tReviewRunError(channel.errorCode)}</p>` : nothing}
          ${this.renderGenericFailureDetail(channel)}
          <dl>
            <div><dt>${this.t('review.run.runId')}</dt><dd><code>${channel.runId}</code></dd></div>
            ${execution?.taskId ? html`<div><dt>${this.t('review.run.taskId')}</dt><dd><code>${execution.taskId}</code></dd></div>` : nothing}
            ${execution?.threadId ? html`<div><dt>${this.t('review.run.threadId')}</dt><dd><code>${execution.threadId}</code></dd></div>` : nothing}
            ${execution?.provider ? html`<div><dt>${this.t('review.run.provider')}</dt><dd><code>${execution.provider}</code></dd></div>` : nothing}
            ${execution?.model ? html`<div><dt>${this.t('review.run.model')}</dt><dd><code>${execution.model}</code></dd></div>` : nothing}
          </dl>
        </section>
      `;
    }
    const run = this.reviewRun;
    if (!run) return nothing;
    const terminal = run.status === 'ready' || run.status === 'failed' || run.status === 'disputed';
    const stateKey = terminal ? `review.run.status.${run.status}` : `review.run.phase.${run.phase}`;
    const errorKey = this.reviewRunErrorKey(run.errorCode);
    return html`
      <section class=${`nr-review__run is-${run.status}`} aria-live="polite">
        <header>
          <div><span>${this.t('review.run.eyebrow')}</span><h3>${this.t('review.run.title')}</h3></div>
          <strong>${this.t(stateKey)}</strong>
        </header>
        ${run.superseded ? html`<p>${this.t('review.run.superseded')}</p>` : nothing}
        ${errorKey ? html`<p role="alert">${this.tReviewRunError(run.errorCode)}</p>` : nothing}
        <dl>
          <div><dt>${this.t('review.run.runId')}</dt><dd><code>${run.runId}</code></dd></div>
          ${run.taskId ? html`<div><dt>${this.t('review.run.taskId')}</dt><dd><code>${run.taskId}</code></dd></div>` : nothing}
          ${run.threadId ? html`<div><dt>${this.t('review.run.threadId')}</dt><dd><code>${run.threadId}</code></dd></div>` : nothing}
          ${run.output ? html`
            <div><dt>${this.t('review.run.resultId')}</dt><dd><code>${run.output.result.resultId}</code></dd></div>
            <div><dt>${this.t('review.run.manifestTaskId')}</dt><dd><code>${run.output.result.manifest.taskId}</code></dd></div>
            <div><dt>${this.t('review.run.trace')}</dt><dd><code>${run.output.result.manifest.traceHash}</code></dd></div>
          ` : nothing}
        </dl>
      </section>
    `;
  }

  private renderPrimaryAction(block: ReviewPrimaryActionPlacement) {
    const { placement } = block;
    const action = this.identityError ? { ...block.action, disabled: true,
      availabilityKey: this.identityError === 'pending' ? 'request.identityPending' : 'request.identityUnavailable' } : block.action;
    return html`
      <section class=${`nr-review__primary-action is-${placement}`} aria-busy=${action.busy ? 'true' : 'false'}>
        <div>
          <span>${this.t('review.primaryActionTitle')}</span>
          <p>${this.t(action.descriptionKey)}</p>
          ${action.availabilityKey ? html`<small>${this.t(action.availabilityKey, { reason: this.identityError })}</small>` : nothing}
          ${action.error ? html`<p class="nr-review__action-error" role=${block.announceError ? 'alert' : nothing}>${action.error}</p>` : nothing}
        </div>
        <button
          type="button"
          ?disabled=${action.disabled}
          aria-disabled=${action.disabled ? 'true' : 'false'}
          @click=${this.runReviewPrimaryAction}
        >${this.t(action.labelKey)}</button>
      </section>
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

  private renderChangeEffortUnits(label: string, units: EffortUnitRef[]) {
    return html`<section><h4>${this.t(label)}</h4>
      ${units.length ? html`<ul>${units.map(unit => html`<li><strong>${unit.kind}: ${unit.id}</strong><code>${unit.path}</code></li>`)}</ul>`
        : html`<p>${this.t('review.effort.none')}</p>`}
    </section>`;
  }

  private renderChangeEffort(view: ChangeEffortView) {
    if (view.kind === 'missing') return nothing;
    return html`<section class="nr-review__change-effort" aria-label=${this.t('review.effort.title')}>
      <header><h3>${this.t('review.effort.title')}</h3>
        ${view.kind === 'invalid' ? html`<p class="nr-review__effort-abend" role="alert">${this.t('review.effort.invalid')}</p>` : html`
          <p class=${view.status === 'blocked' ? 'nr-review__effort-abend' : ''}>${this.t(`review.effort.status.${view.status}`)}</p>
          <p>${this.t('review.effort.untouched', { count: view.untouched!.count })}</p><p>${this.t('review.effort.costUnavailable')}</p>
        `}
      </header>
      ${view.items.map(({ item, answers }) => html`<details class="nr-review__effort-item">
        <summary><strong>${item.kind} · ${item.op} · ${item.entity}</strong><code>${item.id}</code></summary>
        <div>${answers.map(answer => html`<article class="nr-review__effort-master">
          <h4>${this.t('review.effort.master', { project: answer.master.project, kind: answer.master.kind, device: answer.master.device })}</h4><p>${this.t('review.effort.contract')}: ${answer.contract}</p>
          ${answer.abend ? html`<p class="nr-review__effort-abend"><strong>${this.t('review.effort.abend')}</strong> ${answer.abend.reason}</p>` : nothing}
          ${this.renderChangeEffortUnits('review.effort.regenerateDefs', answer.regenerateDefs)}
          ${this.renderChangeEffortUnits('review.effort.materialize', answer.materialize)}
          <section><h4>${this.t('review.effort.runAgents')}</h4>
            ${answer.runAgents.length ? html`<ul>${answer.runAgents.map(agent => html`<li><strong>${agent.agent}</strong><code>${agent.command}</code></li>`)}</ul>`
              : html`<p>${this.t('review.effort.none')}</p>`}
          </section>
        </article>`)}</div>
      </details>`)}
    </section>`;
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
        ${backend.kind === 'ready' ? html`
          <ul class="nr-review__backend-legend">
            ${(['new', 'change', 'keep', 'remove', 'unknown'] as const).map(tone => html`<li class=${`is-${tone}`}>${this.t(`review.backend.status.${tone}`)}</li>`)}
          </ul>
          <div class="nr-review__backend-groups">
            ${backend.groups.map(group => this.renderBackendGroup(group.entity ? this.tableTitle(group.entity) : this.t('review.backend.removedTable'), group.tableId, group.items, knownTables))}
            ${backend.shared.length ? this.renderBackendGroup(this.t('review.backend.shared'), '', backend.shared, knownTables) : nothing}
            ${backend.unassociated.length ? this.renderBackendGroup(this.t('review.backend.unassociated'), '', backend.unassociated, knownTables) : nothing}
          </div>
          ${this.renderTestSupport(backend.testSupport)}
        ` : nothing}
      </section>
    `;
  }

  private renderTestSupportField(labelKey: string, value: string) {
    return value ? html`<p><span>${this.t(labelKey)}</span> ${value}</p>` : nothing;
  }

  private renderTestSupportItem(item: PoolTestSupportItem) {
    const tone = backendTone(item.status);
    const status = `${this.t(`review.backend.status.${tone}`)}${tone === 'unknown' ? ` (${item.status})` : ''}`;
    return html`
      <details class=${`nr-review__backend-item is-${tone}`}>
        <summary>
          <div>
            <span>${this.t('review.backend.testSupport.item')}</span>
            <strong>${item.id}</strong>
            ${item.gap ? html`<small class="nr-review__test-gap">${this.t('review.backend.testSupport.gap')}: ${item.gap}</small>` : nothing}
          </div>
          <small class=${`nr-review__badge is-${tone}`}>${status}</small>
        </summary>
        <div class="nr-review__backend-item-detail">
          ${this.renderTestSupportField('review.backend.testSupport.id', item.id)}
          ${this.renderTestSupportField('review.backend.testSupport.actorRefs', item.actorRefs.join(', '))}
          ${this.renderTestSupportField('review.backend.testSupport.entityRefs', item.entityRefs.join(', '))}
          ${this.renderTestSupportField('review.backend.testSupport.sourceRefs', item.sourceRefs.join(', '))}
          ${this.renderTestSupportField('review.backend.testSupport.status', status)}
          ${this.renderTestSupportField('review.backend.testSupport.owner', item.owner)}
          ${this.renderTestSupportField('review.backend.testSupport.executorRef', item.executorRef)}
          ${this.renderTestSupportField('review.backend.testSupport.cleanupRef', item.cleanupRef)}
          ${this.renderTestSupportField('review.backend.testSupport.gap', item.gap)}
        </div>
      </details>
    `;
  }

  private gapCount(items: readonly { gap: string }[]) {
    return items.filter(item => item.gap !== '').length;
  }

  private gapCountMark(count: number) {
    return count > 0
      ? html`<small class="nr-review__test-gap">${this.t('review.backend.testSupport.gapCount', { count })}</small>`
      : nothing;
  }

  private renderTestSupport(groups: BackendTestSupportOwnerGroup[]) {
    const allItems = groups.flatMap(owner => owner.groups.flatMap(status => status.items));
    return html`
      <details class="nr-review__backend-group nr-review__test-support">
        <summary><span><strong>${this.t('review.backend.testSupport')}</strong></span><small>${this.t('review.backend.itemCount', { count: allItems.length })}</small>${this.gapCountMark(this.gapCount(allItems))}</summary>
        <div>
          ${groups.length ? groups.map(owner => {
            const ownerItems = owner.groups.flatMap(status => status.items);
            return html`
            <details class="nr-review__backend-group">
              <summary><span><strong>${this.t('review.backend.testSupport.owner')}</strong><code>${owner.owner}</code></span><small>${this.t('review.backend.itemCount', { count: ownerItems.length })}</small>${this.gapCountMark(this.gapCount(ownerItems))}</summary>
              <div>
                ${owner.groups.map(status => html`
                  <details class="nr-review__backend-group">
                    <summary><span><strong>${this.t(`review.backend.status.${backendTone(status.status)}`)}</strong><code>${status.status}</code></span><small>${this.t('review.backend.itemCount', { count: status.items.length })}</small>${this.gapCountMark(this.gapCount(status.items))}</summary>
                    <div>${status.items.map(item => this.renderTestSupportItem(item))}</div>
                  </details>
                `)}
              </div>
            </details>
          `;
          }) : html`<p class="nr-review__backend-empty">${this.t('review.backend.testSupport.empty')}</p>`}
        </div>
      </details>
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

  private renderEffortPanel(view: ReviewView, changeEffort: ChangeEffortView, resultVisible: boolean, calculate: readonly ReviewPrimaryActionPlacement[]) {
    const summary = parseEffortSummary(this.effortRead, this.moduleName);
    return html`<details class="nr-review__panel nr-review__effort-panel">
      <summary><strong>${this.t('review.panels.effort')}</strong>
        <span>${!this.hasRelease ? this.t('review.panels.fullGeneration') : !resultVisible ? this.t('review.backend.notCalculated') : summary.kind === 'counts'
          ? summary.counts.filter(item => item.category !== 'endpoints').map(item => `${this.t(`review.backend.count.${item.category}`)}: ${item.statuses.reduce((count, value) => count + value.count, 0)}`).join(' · ')
          : this.t('review.backend.notCalculated')}</span>
      </summary>
      ${!this.hasRelease ? html`<p class="nr-review__panel-note">${this.t('review.panels.fullGenerationBody')}</p>` : nothing}
      ${calculate.map(block => this.renderPrimaryAction(block))}
      ${resultVisible ? html`${this.renderEffort()}${this.renderChangeEffort(changeEffort)}${this.renderMenu(view)}${this.renderBackend(view)}` : nothing}
    </details>`;
  }

  private renderPublish() {
    return html`<section class="nr-review__panel nr-review__publish" aria-label=${this.t('review.panels.publish')}>
      <h3>${this.t('review.panels.publish')}</h3>
      <button type="button" @click=${() => { this.publishNotice = true; }}>${this.t('review.panels.publish')}</button>
      ${this.publishNotice ? html`<p role="status">${this.t('review.panels.inDevelopment')}</p>` : nothing}
    </section>`;
  }

  render() {
    const view = this.view();
    const current = this.isCurrentLoad();
    const changeEffort = buildChangeEffortView(this.changeEffortRead);
    const action = this.actionPresentation(view, current);
    const actions = buildReviewActionPlacements(action, !this.hasRelease && this.version === 'asis' ? 'tobe' : this.version);
    const resultVisible = (!this.hasRelease && !!this.initialPlan && !this.loading && current) || reviewResultVisible({ version: this.version, loading: this.loading, current, resultCurrent: this.data?.resultCurrent === true });
    const initialPending = !!this.implementation?.initial && this.hasImplementation() && !this.implementationComplete();
    const lifecycle = initialPending ? 'new' : reviewReleaseState({ hasRelease: this.hasRelease,
      changed: !!this.data?.diffs.some(diff => diff.entries.length),
      effortCurrent: this.data?.resultCurrent === true && changeEffort.kind === 'ready' && this.effortCurrent,
      implementationComplete: this.implementationComplete(),
    });
    const calculate = this.hasRelease && lifecycle === 'calculate' && !this.hasImplementation() ? actions : [];
    return html`<section class="nr-review">
      <header class="nr-review__hero"><h2>${this.t(`review.release.${lifecycle}`)}</h2></header>
      ${this.loading || !current ? html`<p class="nr-review__loading">${this.t('state.loading')}</p>` : html`
        ${this.renderEffortPanel(view, changeEffort, resultVisible, calculate)}
        <section class="nr-review__panel nr-review__apply" aria-label=${this.t('review.panels.apply')}>
          <h3>${this.t('review.panels.apply')}</h3>
          ${!this.hasImplementation() && !calculate.length && lifecycle !== 'unchanged' && (this.hasRelease || action.kind === 'continue')
            ? actions.map(block => this.renderPrimaryAction(block))
            : html`<p class="nr-review__panel-note">${this.t(this.hasRelease ? 'review.actionUnavailableBody' : 'review.panels.generationPending')}</p>`}
        </section>
        ${this.renderPublish()}
      `}
      ${this.hasImplementation() ? this.renderImplementation('top') : nothing}
      ${this.renderReviewRun()}
      ${resultVisible && !this.version.startsWith('release:') ? this.renderPool() : nothing}
    </section>`;
  }
}
