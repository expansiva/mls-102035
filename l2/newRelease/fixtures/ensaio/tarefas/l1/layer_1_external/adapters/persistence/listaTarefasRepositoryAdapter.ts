/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefasRepositoryAdapter.ts" enhancement="_blank"/>
import { AppError, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { IModuleDataRuntime } from '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
import type { ListaTarefas } from '/_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.js';
import type { ListaTarefasRepository, ListaTarefasFilter } from '/_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.js';

const REPOSITORY = "listaTarefas";
const PRIMARY_KEY = ["id"] as const;
const UNIQUE_KEYS: readonly (readonly string[])[] = [["nome"]];
const BINDINGS = [{"field":"id","column":"id","placement":"column"},{"field":"version","column":"json:version","placement":"json"},{"field":"nome","column":"nome","placement":"column"},{"field":"details.descricao","column":"json:details.descricao","placement":"json"},{"field":"details.quantidadeTarefasAbertas","column":"json:details.quantidadeTarefasAbertas","placement":"json"}] as const;
const JSON_COLUMN = "details";
const VERSION_FIELD = "version";

type Row = Record<string, unknown>;

function readPath(record: Row, path: string): unknown {
  let node: unknown = record;
  for (const part of path.split('.').filter(Boolean)) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Row)[part];
  }
  return node;
}

function writePath(record: Row, path: string, value: unknown): void {
  if (value === undefined) return;
  const parts = path.split('.').filter(Boolean);
  let node = record;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      node[part] = value;
      return;
    }
    const next = node[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) node[part] = {};
    node = node[part] as Row;
  });
}

function jsonKey(field: string): string {
  const prefix = `${JSON_COLUMN}.`;
  return field.startsWith(prefix) ? field.slice(prefix.length) : field;
}

function columnOf(field: string): string {
  const binding = BINDINGS.find(item => item.field === field);
  return binding && binding.placement === 'column' ? binding.column : field;
}

function toRow(record: Row): Row {
  const row: Row = {};
  const details: Row = {};
  let json = false;
  for (const binding of BINDINGS) {
    const value = readPath(record, binding.field);
    if (binding.placement === 'json') {
      json = true;
      if (value !== undefined) writePath(details, jsonKey(binding.field), value);
    } else if (value !== undefined) row[binding.column] = value;
  }
  if (json) row[JSON_COLUMN] = details;
  return row;
}

function fromRow(row: Row): Row {
  const record: Row = {};
  const details = row[JSON_COLUMN];
  const bag = details && typeof details === 'object' && !Array.isArray(details) ? details as Row : {};
  for (const binding of BINDINGS) {
    const value = binding.placement === 'json' ? readPath(bag, jsonKey(binding.field)) : row[binding.column];
    if (value !== undefined) writePath(record, binding.field, value);
  }
  // A declared object comes back even when none of its fields holds a value (a comanda opens with empty details):
  // the entity type says it is there, and a usecase reads `details.x` without a guard.
  for (const binding of BINDINGS) {
    const parts = binding.field.split('.').filter(Boolean);
    let node = record;
    for (const part of parts.slice(0, -1)) {
      const next = node[part];
      if (!next || typeof next !== 'object' || Array.isArray(next)) node[part] = {};
      node = node[part] as Row;
    }
  }
  return record;
}

function sameIdentity(row: Row, record: Row): boolean {
  return PRIMARY_KEY.every(field => row[columnOf(field)] === readPath(record, field));
}

function rejectDuplicate(rows: readonly Row[], record: Row): void {
  // enforce:unique
  for (const key of UNIQUE_KEYS) {
    const matches = rows.filter(row => key.every(field => row[columnOf(field)] === readPath(record, field)));
    if (matches.some(row => !sameIdentity(row, record))) throw new AppError('CONFLICT', 'Unique key already stored.', 409);
  }
  // end:unique
}

function withVersion(record: Row, current: unknown): Row {
  // enforce:version
  if (!VERSION_FIELD) return record;
  const next: Row = { ...record };
  if (current === undefined) {
    if (readPath(next, VERSION_FIELD) === undefined) writePath(next, VERSION_FIELD, 1);
    return next;
  }
  const incoming = readPath(next, VERSION_FIELD);
  if (incoming === undefined) throw new AppError('PRECONDITION_UNDECLARED', 'Stored version has no incoming version.', 409);
  if (incoming !== current) throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  writePath(next, VERSION_FIELD, Number(current) + 1);
  return next;
}

export function bind(runtime: IModuleDataRuntime): ListaTarefasRepository {
  return {
    async create(record: ListaTarefas): Promise<ListaTarefas> {
      const body = withVersion(record as unknown as Row, undefined);
      const table = await runtime.getTable<Row>(REPOSITORY);
      rejectDuplicate(await table.findMany(), body);
      const row = toRow(body);
      await table.insert({ record: row });
      return fromRow(row) as unknown as ListaTarefas;
    },
    async list(filter: ListaTarefasFilter): Promise<ListaTarefas[]> {
      const where: Row = {};
      for (const binding of BINDINGS) {
        if (binding.placement !== 'column') continue;
        const value = readPath(filter as Row, binding.field);
        if (value !== undefined) where[binding.column] = value;
      }
      const table = await runtime.getTable<Row>(REPOSITORY);
      const rows = await table.findMany({ where });
      return rows.map(row => fromRow(row) as unknown as ListaTarefas);
    },
    async update(record: ListaTarefas): Promise<ListaTarefas> {
      
      const table = await runtime.getTable<Row>(REPOSITORY);
      const where: Row = {};
      for (const field of PRIMARY_KEY) where[columnOf(field)] = readPath(record as unknown as Row, field);
      const stored = await table.findOne({ where });
      if (!stored) throw new AppError('NOT_FOUND', 'Record not found.', 404);
      const current = VERSION_FIELD ? readPath(fromRow(stored), VERSION_FIELD) : undefined;
      const body = withVersion(record as unknown as Row, current);
      rejectDuplicate(await table.findMany(), body);
      const row = toRow(body);
      await table.update({ where, patch: row });
      return fromRow(row) as unknown as ListaTarefas;
    },
  };
}

export function createListaTarefasRepository(ctx: RequestContext): ListaTarefasRepository {
  return bind(ctx.data.moduleData);
}
