/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/caixaPagamentos.ts" enhancement="_blank" />

import { PizzariaPagamento, PizzariaPoliticaCancelamentoReembolso, PizzariaUpdatePagamentoParams } from "/_102035_/l1/pizzaria/module.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";

async function getPagamentoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPagamento>("pizzariaPagamento");
}

async function getPoliticaCancelamentoReembolsoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPoliticaCancelamentoReembolso>("pizzariaPoliticaCancelamentoReembolso");
}

export async function listPagamentos(ctx: RequestContext, input?: { status?: string; pedidoId?: string }): Promise<PizzariaPagamento[]> {
  const repo = await getPagamentoRepository(ctx);
  let rows = await repo.findMany();
  if (input?.status !== undefined) {
    rows = rows.filter((item: PizzariaPagamento) => item.status === input.status);
  }
  if (input?.pedidoId !== undefined) {
    rows = rows.filter((item: PizzariaPagamento) => item.pedidoId === input.pedidoId);
  }
  return rows;
}

export async function getPoliticaCancelamentoReembolso(ctx: RequestContext, input?: { ativo?: boolean }): Promise<PizzariaPoliticaCancelamentoReembolso | undefined> {
  const repo = await getPoliticaCancelamentoReembolsoRepository(ctx);
  let rows = await repo.findMany();
  if (input?.ativo !== undefined) {
    rows = rows.filter((item: PizzariaPoliticaCancelamentoReembolso) => item.ativo === input.ativo);
  }
  return rows[0];
}

export async function loadPagamentos(ctx: RequestContext, input: PizzariaUpdatePagamentoParams): Promise<PizzariaPagamento> {
  const repo = await getPagamentoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError("NOT_FOUND", "Pagamento not found", 404);
  const merged: PizzariaPagamento = {
    ...existing,
    ...(input.pedidoId !== undefined ? { pedidoId: input.pedidoId } : {}),
    ...(input.metodo !== undefined ? { metodo: input.metodo } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.valor !== undefined ? { valor: input.valor } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function processarReembolso(ctx: RequestContext, input: PizzariaUpdatePagamentoParams): Promise<PizzariaPagamento> {
  const repo = await getPagamentoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError("NOT_FOUND", "Pagamento not found", 404);
  const merged: PizzariaPagamento = {
    ...existing,
    ...(input.pedidoId !== undefined ? { pedidoId: input.pedidoId } : {}),
    ...(input.metodo !== undefined ? { metodo: input.metodo } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.valor !== undefined ? { valor: input.valor } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const caixaPagamentosListPagamentosHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await listPagamentos(ctx, {
    status: typeof params.status === "string" ? params.status : undefined,
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }));
};

export const caixaPagamentosGetPoliticaCancelamentoReembolsoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getPoliticaCancelamentoReembolso(ctx, {
    ativo: typeof params.ativo === "boolean" ? params.ativo : undefined
  }));
};

export const caixaPagamentosLoadPagamentosHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await loadPagamentos(ctx, {
    id: typeof params.id === "string" ? params.id : "",
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined,
    metodo: typeof params.metodo === "string" ? params.metodo as any : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    valor: typeof params.valor === "number" ? params.valor : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};

export const caixaPagamentosProcessarReembolsoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await processarReembolso(ctx, {
    id: typeof params.id === "string" ? params.id : "",
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined,
    metodo: typeof params.metodo === "string" ? params.metodo as any : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    valor: typeof params.valor === "number" ? params.valor : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};