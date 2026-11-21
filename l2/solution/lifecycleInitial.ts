/// <mls fileReference="_102035_/l2/solution/lifecycleInitial.ts" enhancement="_blank"/>

/** What the reader needs of an entity: its states, its transitions and the optional explicit initial state. */
export interface Ns5InitialStateInput {
  entityId: string;
  initialState?: string;
  lifecycleStates?: ReadonlyArray<{ state: string }>;
  transitions?: ReadonlyArray<{ to: string }>;
}

export interface Ns5InitialState {
  /** The state a new record is written in; absent when the entity has no lifecycle or the choice is ambiguous. */
  state?: string;
  source: 'explicit' | 'derived' | 'none' | 'ambiguous';
  /** The states no transition enters: the candidates when `source` is `ambiguous`. */
  withoutEntry: string[];
}

export interface Ns5InitialStateIssue {
  entityId: string;
  path: string;
  message: string;
}

/**
 * The one reader of the state a new record starts in. `initialState` says it when the entity does; otherwise it is the
 * only state no transition enters. Several states without an entering transition and no `initialState` is ambiguous:
 * the finalize80 gate, the New Release candidate and the L1 domain generator all ask this function and none guesses.
 */
export function ns5InitialState(entity: Ns5InitialStateInput): Ns5InitialState {
  const states = (entity.lifecycleStates ?? []).map(item => item.state).filter(Boolean);
  if (!states.length) return { source: 'none', withoutEntry: [] };
  const entered = new Set((entity.transitions ?? []).map(item => item.to));
  const withoutEntry = states.filter(state => !entered.has(state));
  if (entity.initialState) return { state: entity.initialState, source: 'explicit', withoutEntry };
  if (withoutEntry.length === 1) return { state: withoutEntry[0], source: 'derived', withoutEntry };
  if (withoutEntry.length > 1) return { source: 'ambiguous', withoutEntry };
  return { source: 'none', withoutEntry };
}

/** An `initialState` that is no state of the entity, or several entry-less states with none chosen, is an error on the entity. */
export function ns5InitialStateIssues(entities: readonly Ns5InitialStateInput[]): Ns5InitialStateIssue[] {
  const issues: Ns5InitialStateIssue[] = [];
  for (const entity of entities) {
    const states = (entity.lifecycleStates ?? []).map(item => item.state);
    const path = `ontology.${entity.entityId}.initialState`;
    if (entity.initialState !== undefined && !states.includes(entity.initialState)) {
      issues.push({
        entityId: entity.entityId,
        path,
        message: `initialState ${entity.initialState} of ${entity.entityId} is not one of its lifecycleStates (${states.join(', ') || 'none'}).`,
      });
      continue;
    }
    const initial = ns5InitialState(entity);
    if (initial.source === 'ambiguous') {
      issues.push({
        entityId: entity.entityId,
        path,
        message: `${entity.entityId} has ${initial.withoutEntry.length} states no transition enters (${initial.withoutEntry.join(', ')}); say which one a new record starts in with initialState.`,
      });
    }
  }
  return issues;
}
