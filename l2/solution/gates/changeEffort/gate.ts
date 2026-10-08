import {
  CHANGE_EFFORT_SCHEMA_VERSION,
  L4_DIFF_KINDS,
  L4_DIFF_OPS,
  POOL_DEVICES,
  type ChangeEffortFile,
  type ChangeEffortMerged,
  type EffortAgentRef,
  type EffortAnswer,
  type EffortMaster,
  type EffortUnitRef,
  type L4DiffItem,
  EFFORT_UNIT_KINDS,
  EFFORT_MASTER_KINDS,
  EFFORT_ANSWER_STATUSES,
  CHANGE_EFFORT_STATUSES,
} from '/_102035_/l2/solution/poolPlan.js';

export type ChangeEffortIssue = { code: string; path: string };

export type ChangeEffortGateResult =
  | { ok: true; file: ChangeEffortFile }
  | { ok: false; issues: ChangeEffortIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function masterKey(master: EffortMaster): string {
  return `${master.project}\0${master.kind}\0${master.device}`;
}

function unitKey(unit: EffortUnitRef): string {
  return `${unit.kind}\0${unit.id}`;
}

function push(issues: ChangeEffortIssue[], code: string, path: string) {
  issues.push({ code, path });
}

function readString(issues: ChangeEffortIssue[], value: unknown, path: string): string | undefined {
  if (typeof value !== 'string') {
    push(issues, 'schema', path);
    return undefined;
  }
  return value;
}

function readUnit(issues: ChangeEffortIssue[], value: unknown, path: string): EffortUnitRef | undefined {
  if (!isRecord(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const kind = value.kind;
  const id = readString(issues, value.id, `${path}.id`);
  const unitPath = readString(issues, value.path, `${path}.path`);
  if (typeof kind !== 'string' || !(EFFORT_UNIT_KINDS as readonly string[]).includes(kind)) {
    push(issues, 'schema', `${path}.kind`);
    return undefined;
  }
  if (id === undefined || unitPath === undefined) return undefined;
  return { kind: kind as EffortUnitRef['kind'], id, path: unitPath };
}

function readUnits(issues: ChangeEffortIssue[], value: unknown, path: string): EffortUnitRef[] | undefined {
  if (!Array.isArray(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const units: EffortUnitRef[] = [];
  let ok = true;
  for (let i = 0; i < value.length; i++) {
    const unit = readUnit(issues, value[i], `${path}[${i}]`);
    if (!unit) ok = false;
    else units.push(unit);
  }
  return ok ? units : undefined;
}

function readAgent(issues: ChangeEffortIssue[], value: unknown, path: string): EffortAgentRef | undefined {
  if (!isRecord(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const agent = readString(issues, value.agent, `${path}.agent`);
  const command = readString(issues, value.command, `${path}.command`);
  if (agent === undefined || command === undefined) return undefined;
  return { agent, command };
}

function readAgents(issues: ChangeEffortIssue[], value: unknown, path: string): EffortAgentRef[] | undefined {
  if (!Array.isArray(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const agents: EffortAgentRef[] = [];
  let ok = true;
  for (let i = 0; i < value.length; i++) {
    const agent = readAgent(issues, value[i], `${path}[${i}]`);
    if (!agent) ok = false;
    else agents.push(agent);
  }
  return ok ? agents : undefined;
}

function readMaster(issues: ChangeEffortIssue[], value: unknown, path: string): EffortMaster | undefined {
  if (!isRecord(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const project = readString(issues, value.project, `${path}.project`);
  const kind = value.kind;
  const device = value.device;
  if (typeof kind !== 'string' || !(EFFORT_MASTER_KINDS as readonly string[]).includes(kind)) {
    push(issues, 'schema', `${path}.kind`);
  }
  if (typeof device !== 'string' || !(POOL_DEVICES as readonly string[]).includes(device)) {
    push(issues, 'schema', `${path}.device`);
  }
  if (
    project === undefined
    || typeof kind !== 'string'
    || !(EFFORT_MASTER_KINDS as readonly string[]).includes(kind)
    || typeof device !== 'string'
    || !(POOL_DEVICES as readonly string[]).includes(device)
  ) {
    return undefined;
  }
  return { project, kind: kind as EffortMaster['kind'], device: device as EffortMaster['device'] };
}

function readItem(issues: ChangeEffortIssue[], value: unknown, path: string): L4DiffItem | undefined {
  if (!isRecord(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const changeId = readString(issues, value.changeId, `${path}.changeId`);
  const entity = readString(issues, value.entity, `${path}.entity`);
  const source = readString(issues, value.source, `${path}.source`);
  const kind = value.kind;
  const op = value.op;
  if (typeof kind !== 'string' || !(L4_DIFF_KINDS as readonly string[]).includes(kind)) {
    push(issues, 'schema', `${path}.kind`);
  }
  if (typeof op !== 'string' || !(L4_DIFF_OPS as readonly string[]).includes(op)) {
    push(issues, 'schema', `${path}.op`);
  }
  if (
    changeId === undefined
    || entity === undefined
    || source === undefined
    || typeof kind !== 'string'
    || !(L4_DIFF_KINDS as readonly string[]).includes(kind)
    || typeof op !== 'string'
    || !(L4_DIFF_OPS as readonly string[]).includes(op)
  ) {
    return undefined;
  }
  const item: L4DiffItem = { changeId, kind: kind as L4DiffItem['kind'], op: op as L4DiffItem['op'], entity, source };
  if ('before' in value) item.before = value.before;
  if ('after' in value) item.after = value.after;
  return item;
}

function readAnswer(
  issues: ChangeEffortIssue[],
  value: unknown,
  path: string,
  itemId: string,
): EffortAnswer | undefined {
  if (!isRecord(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const master = readMaster(issues, value.master, `${path}.master`);
  const item = readString(issues, value.item, `${path}.item`);
  const status = value.status;
  if (item !== undefined && item !== itemId) push(issues, 'schema', `${path}.item`);
  if (typeof status !== 'string' || !(EFFORT_ANSWER_STATUSES as readonly string[]).includes(status)) {
    push(issues, 'schema', `${path}.status`);
  }
  const regenerateDefs = readUnits(issues, value.regenerateDefs, `${path}.regenerateDefs`);
  const materialize = readUnits(issues, value.materialize, `${path}.materialize`);
  const runAgents = readAgents(issues, value.runAgents, `${path}.runAgents`);
  let abend: { reason: string } | undefined;
  if ('abend' in value && value.abend !== undefined) {
    if (!isRecord(value.abend)) push(issues, 'schema', `${path}.abend`);
    else {
      const reason = readString(issues, value.abend.reason, `${path}.abend.reason`);
      if (reason !== undefined) abend = { reason };
    }
  }
  if (status === 'abend' && !abend) push(issues, 'schema', `${path}.abend`);
  if (status === 'computed' && abend) push(issues, 'schema', `${path}.abend`);
  if (
    !master
    || item === undefined
    || item !== itemId
    || typeof status !== 'string'
    || !(EFFORT_ANSWER_STATUSES as readonly string[]).includes(status)
    || !regenerateDefs
    || !materialize
    || !runAgents
    || (status === 'abend' && !abend)
    || (status === 'computed' && abend)
  ) {
    return undefined;
  }
  const answer: EffortAnswer = {
    master,
    item,
    status: status as EffortAnswer['status'],
    regenerateDefs,
    materialize,
    runAgents,
  };
  if (abend) answer.abend = abend;
  return answer;
}

function sameMaster(a: EffortMaster, b: EffortMaster): boolean {
  return a.project === b.project && a.kind === b.kind && a.device === b.device;
}

function sameUnit(a: EffortUnitRef, b: EffortUnitRef): boolean {
  return a.kind === b.kind && a.id === b.id && a.path === b.path;
}

function sameAgent(a: EffortAgentRef, b: EffortAgentRef): boolean {
  return a.agent === b.agent && a.command === b.command;
}

function sortUnits(units: EffortUnitRef[]): EffortUnitRef[] {
  return [...units].sort((a, b) => unitKey(a).localeCompare(unitKey(b)) || a.path.localeCompare(b.path));
}

function sortAgents(agents: EffortAgentRef[]): EffortAgentRef[] {
  return [...agents].sort((a, b) => a.agent.localeCompare(b.agent) || a.command.localeCompare(b.command));
}

/** União por unidade: `regenerateDefs` vence `materialize`; abend entra por item e master. */
export function mergeChangeEffort(perItem: Array<{ item: string; answers: EffortAnswer[] }>): ChangeEffortMerged {
  const regen = new Map<string, EffortUnitRef>();
  const material = new Map<string, EffortUnitRef>();
  const agents = new Map<string, EffortAgentRef>();
  const abend: ChangeEffortMerged['abend'] = [];

  for (const row of perItem) {
    for (const answer of row.answers) {
      for (const unit of answer.regenerateDefs) regen.set(unitKey(unit), unit);
      for (const agent of answer.runAgents) agents.set(`${agent.agent}\0${agent.command}`, agent);
      if (answer.status === 'abend' && answer.abend) {
        abend.push({ item: row.item, master: answer.master, reason: answer.abend.reason });
      }
    }
  }
  for (const row of perItem) {
    for (const answer of row.answers) {
      for (const unit of answer.materialize) {
        const key = unitKey(unit);
        if (!regen.has(key)) material.set(key, unit);
      }
    }
  }

  abend.sort((a, b) =>
    a.item.localeCompare(b.item)
    || masterKey(a.master).localeCompare(masterKey(b.master))
    || a.reason.localeCompare(b.reason));

  return {
    regenerateDefs: sortUnits([...regen.values()]),
    materialize: sortUnits([...material.values()]),
    runAgents: sortAgents([...agents.values()]),
    abend,
  };
}

function sameMerged(a: ChangeEffortMerged, b: ChangeEffortMerged): boolean {
  const units = (left: EffortUnitRef[], right: EffortUnitRef[]) =>
    left.length === right.length && left.every((unit, i) => sameUnit(unit, right[i]!));
  const agents = (left: EffortAgentRef[], right: EffortAgentRef[]) =>
    left.length === right.length && left.every((agent, i) => sameAgent(agent, right[i]!));
  const abends = a.abend.length === b.abend.length && a.abend.every((row, i) => {
    const other = b.abend[i]!;
    return row.item === other.item && row.reason === other.reason && sameMaster(row.master, other.master);
  });
  return units(a.regenerateDefs, b.regenerateDefs)
    && units(a.materialize, b.materialize)
    && agents(a.runAgents, b.runAgents)
    && abends;
}

function readMerged(issues: ChangeEffortIssue[], value: unknown, path: string): ChangeEffortMerged | undefined {
  if (!isRecord(value)) {
    push(issues, 'schema', path);
    return undefined;
  }
  const regenerateDefs = readUnits(issues, value.regenerateDefs, `${path}.regenerateDefs`);
  const materialize = readUnits(issues, value.materialize, `${path}.materialize`);
  const runAgents = readAgents(issues, value.runAgents, `${path}.runAgents`);
  if (!Array.isArray(value.abend)) {
    push(issues, 'schema', `${path}.abend`);
    return undefined;
  }
  const abend: ChangeEffortMerged['abend'] = [];
  let abendOk = true;
  for (let i = 0; i < value.abend.length; i++) {
    const row = value.abend[i];
    const rowPath = `${path}.abend[${i}]`;
    if (!isRecord(row)) {
      push(issues, 'schema', rowPath);
      abendOk = false;
      continue;
    }
    const item = readString(issues, row.item, `${rowPath}.item`);
    const master = readMaster(issues, row.master, `${rowPath}.master`);
    const reason = readString(issues, row.reason, `${rowPath}.reason`);
    if (item === undefined || !master || reason === undefined) abendOk = false;
    else abend.push({ item, master, reason });
  }
  if (!regenerateDefs || !materialize || !runAgents || !abendOk) return undefined;
  return { regenerateDefs, materialize, runAgents, abend };
}

export function validateChangeEffort(value: unknown): ChangeEffortGateResult {
  const issues: ChangeEffortIssue[] = [];
  if (!isRecord(value)) return { ok: false, issues: [{ code: 'schema', path: '' }] };

  if (value.schemaVersion !== CHANGE_EFFORT_SCHEMA_VERSION) push(issues, 'schema', 'schemaVersion');
  const moduleName = readString(issues, value.module, 'module');

  let base: ChangeEffortFile['base'] | undefined;
  if (!isRecord(value.base)) push(issues, 'schema', 'base');
  else {
    const baseId = readString(issues, value.base.baseId, 'base.baseId');
    const revisionId = readString(issues, value.base.revisionId, 'base.revisionId');
    const candidateRoot = readString(issues, value.base.candidateRoot, 'base.candidateRoot');
    if (baseId !== undefined && revisionId !== undefined && candidateRoot !== undefined) {
      base = { baseId, revisionId, candidateRoot };
    }
  }

  const changeIds = new Set<string>();
  let items: L4DiffItem[] | undefined;
  let requestText: string | undefined;
  if (!isRecord(value.request)) push(issues, 'schema', 'request');
  else {
    requestText = readString(issues, value.request.text, 'request.text');
    if (!Array.isArray(value.request.items)) push(issues, 'schema', 'request.items');
    else {
      items = [];
      for (let i = 0; i < value.request.items.length; i++) {
        const item = readItem(issues, value.request.items[i], `request.items[${i}]`);
        if (!item) items = undefined;
        else if (items) {
          items.push(item);
          changeIds.add(item.changeId);
        }
      }
    }
  }

  let masters: EffortMaster[] | undefined;
  if (!Array.isArray(value.masters)) push(issues, 'schema', 'masters');
  else {
    masters = [];
    for (let i = 0; i < value.masters.length; i++) {
      const master = readMaster(issues, value.masters[i], `masters[${i}]`);
      if (!master) masters = undefined;
      else if (masters) masters.push(master);
    }
  }

  let perItem: ChangeEffortFile['perItem'] | undefined;
  if (!Array.isArray(value.perItem)) push(issues, 'schema', 'perItem');
  else {
    perItem = [];
    for (let i = 0; i < value.perItem.length; i++) {
      const row = value.perItem[i];
      const rowPath = `perItem[${i}]`;
      if (!isRecord(row)) {
        push(issues, 'schema', rowPath);
        perItem = undefined;
        continue;
      }
      const item = readString(issues, row.item, `${rowPath}.item`);
      if (item !== undefined && !changeIds.has(item)) push(issues, 'unknown-item', `${rowPath}.item`);
      if (!Array.isArray(row.answers)) {
        push(issues, 'schema', `${rowPath}.answers`);
        perItem = undefined;
        continue;
      }
      const answers: EffortAnswer[] = [];
      let answersOk = item !== undefined;
      for (let j = 0; j < row.answers.length; j++) {
        const answer = readAnswer(issues, row.answers[j], `${rowPath}.answers[${j}]`, item ?? '');
        if (!answer) answersOk = false;
        else {
          answers.push(answer);
          if (masters && !masters.some((master) => sameMaster(master, answer.master))) {
            push(issues, 'unknown-master', `${rowPath}.answers[${j}].master`);
          }
        }
      }
      if (perItem && answersOk && item !== undefined) perItem.push({ item, answers });
      else perItem = undefined;
    }
  }

  const merged = readMerged(issues, value.merged, 'merged');

  let untouched: ChangeEffortFile['untouched'] | undefined;
  if (!isRecord(value.untouched)) push(issues, 'schema', 'untouched');
  else {
    const count = value.untouched.count;
    const sealHash = readString(issues, value.untouched.sealHash, 'untouched.sealHash');
    if (typeof count !== 'number' || !Number.isInteger(count)) push(issues, 'schema', 'untouched.count');
    else if (count < 0) push(issues, 'untouched-count', 'untouched.count');
    if (typeof count === 'number' && Number.isInteger(count) && count >= 0 && sealHash !== undefined) {
      untouched = { count, sealHash };
    }
  }

  const status = value.status;
  if (typeof status !== 'string' || !(CHANGE_EFFORT_STATUSES as readonly string[]).includes(status)) {
    push(issues, 'schema', 'status');
  }

  if (perItem && merged) {
    const expected = mergeChangeEffort(perItem);
    if (!sameMerged(merged, expected)) push(issues, 'merged-mismatch', 'merged');
    const expectedStatus = expected.abend.length > 0 ? 'blocked' : 'simple';
    if (status === 'simple' || status === 'blocked') {
      if (status !== expectedStatus) push(issues, 'status', 'status');
    }
  }

  if (
    issues.length > 0
    || moduleName === undefined
    || !base
    || requestText === undefined
    || !items
    || !masters
    || !perItem
    || !merged
    || !untouched
    || (status !== 'simple' && status !== 'blocked')
  ) {
    return { ok: false, issues };
  }

  const file: ChangeEffortFile = {
    schemaVersion: CHANGE_EFFORT_SCHEMA_VERSION,
    module: moduleName,
    base,
    request: { text: requestText, items },
    masters,
    perItem,
    merged,
    untouched,
    status,
  };
  return { ok: true, file };
}
