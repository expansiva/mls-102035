/// <mls fileReference="_102035_/l2/solution/helpers/ontologyLifecycleForm.ts" enhancement="_blank"/>

/**
 * The one text that says how an entity declares its lifecycle (`lifecycleStates` and `transitions`, at the top of the
 * entity). The ontology30 prompt (`promptEntity.md`, placeholder below) and the New Release edit read this same text.
 */
export const NS5_LIFECYCLE_FORM_PLACEHOLDER = '{{ns5LifecycleForm}}';

export const NS5_LIFECYCLE_FORM = "A lifecycle is for what somebody moves AND the system reacts to (a rule forbids or requires something\nwhile in the state, a process fires, another entity's derived value changes) or that has a duration\npeople ask about; a switch with no such consequence is a field, not a state. Each state is\n`{ state, reachedBy }` (`actor` or `command`); an entity with a lifecycle carries an indexed `status`\ncolumn whose `values` cover the states, and `status` holds only what an actor or a command writes. Transitions are\n`{ transitionId, from, to, by, description, payload?, ruleRefs? }`; `payload` is the explicit list of\nrecord paths consumed by the transition command (empty when it consumes only identity); `by` is a list of actor ids of the module, and\nis **empty** when the move belongs to a process and to no person. Every `transitionRef` an `act` cites\non this entity is required, with that journey's actor in `by`; a `decide` cited on this entity requires\nat least two transitions leaving the same state — one per outcome — with the deciding actor in `by`.\nThe human prompt lists the citations. `initialState` is the state a new record is written in, one of `lifecycleStates`, at the top of the entity; it is required when more than one state has no transition entering it, and left out when exactly one state has none.";

/** Fills the placeholder of a prompt file with the shared text. */
export function withNs5LifecycleForm(prompt: string): string {
  return prompt.split(NS5_LIFECYCLE_FORM_PLACEHOLDER).join(NS5_LIFECYCLE_FORM);
}
