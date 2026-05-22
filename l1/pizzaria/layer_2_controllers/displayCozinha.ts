/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/displayCozinha.ts" enhancement="_blank" />

import { PizzariaPedido, PizzariaProducao, PizzariaItemPedido, PizzariaUpdateProducaoParams } from '/_102035_/l1/pizzaria/module.js'
import { AppError, ok, type BffHandler, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js'

async function getPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPedido>('pizzariaPedido');
}

async function getProducaoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaProducao>('pizzariaProducao');
}

async function getItemPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaItemPedido>('pizzariaItemPedido');
}

export async function getResumoProducaoCozinha(ctx: RequestContext, input?: { cozinhaId?: string }): Promise<PizzariaPedido | undefined> {
  const repo = await getPedidoRepository(ctx);
  let rows = await repo.findMany();
  if (input?.cozinhaId !== undefined) {
    rows = rows.filter((item: PizzariaPedido) => (item as unknown as { cozinhaId?: string }).cozinhaId === input.cozinhaId);
  }
  return rows[0];
}

export async function listarPedidosCozinha(ctx: RequestContext, input?: { status?: string[]; prioridade?: string; cozinhaId?: string }): Promise<PizzariaPedido[]> {
  const repo = await getPedidoRepository(ctx);
  let rows = await repo.findMany();
  const statusFilter = input?.status;
  if (statusFilter !== undefined) {
    rows = rows.filter((item: PizzariaPedido) => statusFilter.includes(item.status));
  }
  if (input?.prioridade !== undefined) {
    rows = rows.filter((item: PizzariaPedido) => (item as unknown as { prioridade?: string }).prioridade === input.prioridade);
  }
  if (input?.cozinhaId !== undefined) {
    rows = rows.filter((item: PizzariaPedido) => (item as unknown as { cozinhaId?: string }).cozinhaId === input.cozinhaId);
  }
  return rows;
}

export async function getPedidoCozinhaDetalhe(ctx: RequestContext, input?: { pedidoId?: string }): Promise<PizzariaPedido | undefined> {
  const repo = await getPedidoRepository(ctx);
  let rows = await repo.findMany();
  if (input?.pedidoId !== undefined) {
    rows = rows.filter((item: PizzariaPedido) => (item as unknown as { pedidoId?: string }).pedidoId === input.pedidoId);
  }
  return rows[0];
}

export async function load(ctx: RequestContext, input: PizzariaUpdateProducaoParams): Promise<PizzariaProducao> {
  const repo = await getProducaoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError('NOT_FOUND', 'Producao not found', 404);
  const merged: PizzariaProducao = {
    ...existing,
    ...(input.pedidoId !== undefined ? { pedidoId: input.pedidoId } : {}),
    ...(input.statusProducao !== undefined ? { statusProducao: input.statusProducao } : {}),
    ...(input.inicioEm !== undefined ? { inicioEm: input.inicioEm } : {}),
    ...(input.fimEm !== undefined ? { fimEm: input.fimEm } : {}),
    ...(input.cozinheiroResponsavelId !== undefined ? { cozinheiroResponsavelId: input.cozinheiroResponsavelId } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function updateStatus(ctx: RequestContext, input: PizzariaUpdateProducaoParams): Promise<PizzariaProducao> {
  const repo = await getProducaoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError('NOT_FOUND', 'Producao not found', 404);
  const merged: PizzariaProducao = {
    ...existing,
    ...(input.pedidoId !== undefined ? { pedidoId: input.pedidoId } : {}),
    ...(input.statusProducao !== undefined ? { statusProducao: input.statusProducao } : {}),
    ...(input.inicioEm !== undefined ? { inicioEm: input.inicioEm } : {}),
    ...(input.fimEm !== undefined ? { fimEm: input.fimEm } : {}),
    ...(input.cozinheiroResponsavelId !== undefined ? { cozinheiroResponsavelId: input.cozinheiroResponsavelId } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function assignCook(ctx: RequestContext, input: PizzariaUpdateProducaoParams): Promise<PizzariaProducao> {
  const repo = await getProducaoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError('NOT_FOUND', 'Producao not found', 404);
  const merged: PizzariaProducao = {
    ...existing,
    ...(input.pedidoId !== undefined ? { pedidoId: input.pedidoId } : {}),
    ...(input.statusProducao !== undefined ? { statusProducao: input.statusProducao } : {}),
    ...(input.inicioEm !== undefined ? { inicioEm: input.inicioEm } : {}),
    ...(input.fimEm !== undefined ? { fimEm: input.fimEm } : {}),
    ...(input.cozinheiroResponsavelId !== undefined ? { cozinheiroResponsavelId: input.cozinheiroResponsavelId } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const displayCozinhaGetResumoProducaoCozinhaHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getResumoProducaoCozinha(ctx, {
    cozinhaId: typeof params.cozinhaId === 'string' ? params.cozinhaId : undefined
  }));
};

export const displayCozinhaListarPedidosCozinhaHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  const statusParam = params.status;
  const status = Array.isArray(statusParam) ? statusParam.filter((item: unknown): item is string => typeof item === 'string') : undefined;
  return ok(await listarPedidosCozinha(ctx, {
    status,
    prioridade: typeof params.prioridade === 'string' ? params.prioridade : undefined,
    cozinhaId: typeof params.cozinhaId === 'string' ? params.cozinhaId : undefined
  }));
};

export const displayCozinhaGetPedidoCozinhaDetalheHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getPedidoCozinhaDetalhe(ctx, {
    pedidoId: typeof params.pedidoId === 'string' ? params.pedidoId : undefined
  }));
};

export const displayCozinhaLoadHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await load(ctx, {
    id: typeof params.id === 'string' ? params.id : '',
    pedidoId: typeof params.pedidoId === 'string' ? params.pedidoId : undefined,
    statusProducao: typeof params.statusProducao === 'string' ? (params.statusProducao as PizzariaProducao['statusProducao']) : undefined,
    inicioEm: params.inicioEm as any,
    fimEm: params.fimEm as any,
    cozinheiroResponsavelId: typeof params.cozinheiroResponsavelId === 'string' ? params.cozinheiroResponsavelId : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  } as PizzariaUpdateProducaoParams));
};

export const displayCozinhaUpdateStatusHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await updateStatus(ctx, {
    id: typeof params.id === 'string' ? params.id : '',
    pedidoId: typeof params.pedidoId === 'string' ? params.pedidoId : undefined,
    statusProducao: typeof params.statusProducao === 'string' ? (params.statusProducao as PizzariaProducao['statusProducao']) : undefined,
    inicioEm: params.inicioEm as any,
    fimEm: params.fimEm as any,
    cozinheiroResponsavelId: typeof params.cozinheiroResponsavelId === 'string' ? params.cozinheiroResponsavelId : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  } as PizzariaUpdateProducaoParams));
};

export const displayCozinhaAssignCookHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await assignCook(ctx, {
    id: typeof params.id === 'string' ? params.id : '',
    pedidoId: typeof params.pedidoId === 'string' ? params.pedidoId : undefined,
    statusProducao: typeof params.statusProducao === 'string' ? (params.statusProducao as PizzariaProducao['statusProducao']) : undefined,
    inicioEm: params.inicioEm as any,
    fimEm: params.fimEm as any,
    cozinheiroResponsavelId: typeof params.cozinheiroResponsavelId === 'string' ? params.cozinheiroResponsavelId : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  } as PizzariaUpdateProducaoParams));
};