/// <mls fileReference="_102035_/l2/solution/arrivalEffects.ts" enhancement="_blank"/>

/**
 * One reading of what an arrival does to each entity.
 * New artifacts say it in `entityEffects`. Older ones say one effect for every entity
 * (`inbound.writes` / `serve.entityRefs` plus `effect`). Call rows are not arrivals.
 * Pure: types and this reading only.
 */

export type Ns5ArrivalEffect = 'create' | 'update' | 'transition' | 'list' | 'read' | 'remove';

export interface Ns5ArrivalEntityEffects {
  entityId: string;
  effects: Ns5ArrivalEffect[];
}

const ARRIVAL_EFFECTS: readonly Ns5ArrivalEffect[] = ['create', 'update', 'transition', 'list', 'read', 'remove'];
const WRITE_EFFECTS = new Set<Ns5ArrivalEffect>(['create', 'update', 'remove', 'transition']);

export interface Ns5ArrivalEffectsItem {
  entityEffects?: readonly { entityId?: string; effects?: readonly string[] }[] | null;
  writes?: readonly string[] | null;
  entityRefs?: readonly string[] | null;
  effect?: string | null;
}

function listedEffects(effects: readonly string[] | undefined): Ns5ArrivalEffect[] {
  const seen = new Set<string>();
  const out: Ns5ArrivalEffect[] = [];
  for (const effect of effects || []) {
    if (!ARRIVAL_EFFECTS.includes(effect as Ns5ArrivalEffect) || seen.has(effect)) continue;
    seen.add(effect);
    out.push(effect as Ns5ArrivalEffect);
  }
  return out;
}

/** Entries of an arrival. `entityEffects` wins when it is an array, including an empty one. */
export function ns5ArrivalEffects(item: Ns5ArrivalEffectsItem, kind: 'inbound' | 'serve'): Ns5ArrivalEntityEffects[] {
  if (Array.isArray(item.entityEffects)) {
    return item.entityEffects.map(entry => ({
      entityId: entry.entityId || '',
      effects: listedEffects(entry.effects),
    }));
  }
  const entityIds = kind === 'inbound' ? (item.writes || []) : (item.entityRefs || []);
  const effect = item.effect && ARRIVAL_EFFECTS.includes(item.effect as Ns5ArrivalEffect)
    ? item.effect as Ns5ArrivalEffect
    : '';
  return entityIds.map(entityId => ({
    entityId,
    effects: effect ? [effect] : [],
  }));
}

/** Write effects of one entry. `list` and `read` are not writes. */
export function ns5ArrivalWriteEffects(entry: Ns5ArrivalEntityEffects): Ns5ArrivalEffect[] {
  return entry.effects.filter(effect => WRITE_EFFECTS.has(effect));
}

export function ns5ArrivalEntityIds(item: Ns5ArrivalEffectsItem, kind: 'inbound' | 'serve'): string[] {
  return ns5ArrivalEffects(item, kind).map(entry => entry.entityId);
}
