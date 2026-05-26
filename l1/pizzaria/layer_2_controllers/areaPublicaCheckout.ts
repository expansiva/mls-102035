/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/areaPublicaCheckout.ts" enhancement="_blank" /> 

import { PizzariaPedido, PizzariaUpdatePedidoParams, PizzariaItemPedido, PizzariaCombo, PizzariaPoliticaCancelamentoReembolso, PizzariaPagamento, PizzariaUpdatePagamentoParams } from "/_102035_/l1/pizzaria/module.js"
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js"

async function getPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPedido>("pizzariaPedido");
}

async function getItemPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaItemPedido>("pizzariaItemPedido");
}

async function getComboRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaCombo>("pizzariaCombo");
}

async function getPoliticaCancelamentoReembolsoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPoliticaCancelamentoReembolso>("pizzariaPoliticaCancelamentoReembolso");
}

async function getPagamentoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPagamento>("pizzariaPagamento");
}

export async function getResumoCheckoutPublico(ctx: RequestContext, input: { pedidoId?: string } = {}): Promise<PizzariaPedido | undefined> {
  const repo = await getPedidoRepository(ctx);
  const rows = await repo.findMany();
  let filtered: PizzariaPedido[] = rows;
  if (input.pedidoId !== undefined) {
    filtered = filtered.filter((item: PizzariaPedido) => item.id === input.pedidoId);
  }
  return filtered[0];
}

export async function listarItensPedido(ctx: RequestContext, input: { pedidoId?: string } = {}): Promise<PizzariaItemPedido[]> {
  const repo = await getItemPedidoRepository(ctx);
  const rows = await repo.findMany();
  let filtered: PizzariaItemPedido[] = rows;
  if (input.pedidoId !== undefined) {
    filtered = filtered.filter((item: PizzariaItemPedido) => item.pedidoId === input.pedidoId);
  }
  return filtered;
}

export async function listarCombosAtivos(ctx: RequestContext): Promise<PizzariaCombo[]> {
  const repo = await getComboRepository(ctx);
  const rows = await repo.findMany();
  return rows;
}

export async function listarPoliticasCancelamentoAtivas(ctx: RequestContext): Promise<PizzariaPoliticaCancelamentoReembolso[]> {
  const repo = await getPoliticaCancelamentoReembolsoRepository(ctx);
  const rows = await repo.findMany();
  return rows;
}

export async function carregar(ctx: RequestContext, input: PizzariaUpdatePedidoParams): Promise<PizzariaPedido> {
  const repo = await getPedidoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError("NOT_FOUND", "Pedido not found", 404);
  const merged: PizzariaPedido = {
    ...existing,
    ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.itens !== undefined ? { itens: input.itens } : {}),
    ...(input.total !== undefined ? { total: input.total } : {}),
    ...(input.origem !== undefined ? { origem: input.origem } : {}),
    ...(input.cliente !== undefined ? { cliente: input.cliente } : {}),
    ...(input.enderecoEntrega !== undefined ? { enderecoEntrega: input.enderecoEntrega } : {}),
    ...(input.zonaEntregaId !== undefined ? { zonaEntregaId: input.zonaEntregaId } : {}),
    ...(input.taxaEntrega !== undefined ? { taxaEntrega: input.taxaEntrega } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function salvarPagamento(ctx: RequestContext, input: PizzariaUpdatePagamentoParams): Promise<PizzariaPagamento> {
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

export async function confirmarPedido(ctx: RequestContext, input: PizzariaUpdatePedidoParams): Promise<PizzariaPedido> {
  const repo = await getPedidoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError("NOT_FOUND", "Pedido not found", 404);
  const merged: PizzariaPedido = {
    ...existing,
    ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.itens !== undefined ? { itens: input.itens } : {}),
    ...(input.total !== undefined ? { total: input.total } : {}),
    ...(input.origem !== undefined ? { origem: input.origem } : {}),
    ...(input.cliente !== undefined ? { cliente: input.cliente } : {}),
    ...(input.enderecoEntrega !== undefined ? { enderecoEntrega: input.enderecoEntrega } : {}),
    ...(input.zonaEntregaId !== undefined ? { zonaEntregaId: input.zonaEntregaId } : {}),
    ...(input.taxaEntrega !== undefined ? { taxaEntrega: input.taxaEntrega } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const areaPublicaCheckoutGetResumoCheckoutPublicoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getResumoCheckoutPublico(ctx, {
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }));
};

export const areaPublicaCheckoutListarItensPedidoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await listarItensPedido(ctx, {
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }));
};

export const areaPublicaCheckoutListarCombosAtivosHandler: BffHandler = async ({ request, ctx }) => {
  return ok(await listarCombosAtivos(ctx));
};

export const areaPublicaCheckoutListarPoliticasCancelamentoAtivasHandler: BffHandler = async ({ request, ctx }) => {
  return ok(await listarPoliticasCancelamentoAtivas(ctx));
};

export const areaPublicaCheckoutCarregarHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await carregar(ctx, {
    id: typeof params.id === "string" ? params.id : undefined,
    tipo: typeof params.tipo === "string" ? (params.tipo as PizzariaPedido["tipo"]) : undefined,
    status: typeof params.status === "string" ? (params.status as PizzariaPedido["status"]) : undefined,
    itens: params.itens !== undefined ? (params.itens as PizzariaPedido["itens"]) : undefined,
    total: typeof params.total === "number" ? params.total : undefined,
    origem: typeof params.origem === "string" ? (params.origem as PizzariaPedido["origem"]) : undefined,
    cliente: typeof params.cliente === "string" ? params.cliente : undefined,
    enderecoEntrega: typeof params.enderecoEntrega === "string" ? params.enderecoEntrega : undefined,
    zonaEntregaId: typeof params.zonaEntregaId === "string" ? params.zonaEntregaId : undefined,
    taxaEntrega: typeof params.taxaEntrega === "number" ? params.taxaEntrega : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  } as PizzariaUpdatePedidoParams));
};

export const areaPublicaCheckoutSalvarPagamentoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await salvarPagamento(ctx, {
    id: typeof params.id === "string" ? params.id : undefined,
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined,
    metodo: typeof params.metodo === "string" ? (params.metodo as PizzariaPagamento["metodo"]) : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    valor: typeof params.valor === "number" ? params.valor : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  } as PizzariaUpdatePagamentoParams));
};

export const areaPublicaCheckoutConfirmarPedidoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await confirmarPedido(ctx, {
    id: typeof params.id === "string" ? params.id : undefined,
    tipo: typeof params.tipo === "string" ? (params.tipo as PizzariaPedido["tipo"]) : undefined,
    status: typeof params.status === "string" ? (params.status as PizzariaPedido["status"]) : undefined,
    itens: params.itens !== undefined ? (params.itens as PizzariaPedido["itens"]) : undefined,
    total: typeof params.total === "number" ? params.total : undefined,
    origem: typeof params.origem === "string" ? (params.origem as PizzariaPedido["origem"]) : undefined,
    cliente: typeof params.cliente === "string" ? params.cliente : undefined,
    enderecoEntrega: typeof params.enderecoEntrega === "string" ? params.enderecoEntrega : undefined,
    zonaEntregaId: typeof params.zonaEntregaId === "string" ? params.zonaEntregaId : undefined,
    taxaEntrega: typeof params.taxaEntrega === "number" ? params.taxaEntrega : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  } as PizzariaUpdatePedidoParams));
};