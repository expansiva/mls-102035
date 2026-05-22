/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/confirmacaoImpressaoComanda.ts" enhancement="_blank" />

import { PizzariaItemPedido, PizzariaPedido, PizzariaUpdatePedidoParams } from "/_102035_/l1/pizzaria/module.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";

async function getPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPedido>("pizzariaPedido");
}

async function getItemPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaItemPedido>("pizzariaItemPedido");
}

export async function getPedidoResumoImpressao(ctx: RequestContext, input?: { pedidoId?: string }): Promise<PizzariaPedido | undefined> {
  const pedidoRepo = await getPedidoRepository(ctx);
  const itemPedidoRepo = await getItemPedidoRepository(ctx);
  let pedidos = await pedidoRepo.findMany();
  if (input?.pedidoId !== undefined) {
    pedidos = pedidos.filter((item: PizzariaPedido) => item.id === input.pedidoId);
  }
  const pedido = pedidos[0];
  if (!pedido) {
    return undefined;
  }
  const itens = (await itemPedidoRepo.findMany()).filter((item: PizzariaItemPedido) => item.pedidoId === pedido.id);
  return {
    ...pedido,
    itens
  };
}

export async function carregarResumo(ctx: RequestContext, input: PizzariaUpdatePedidoParams): Promise<PizzariaPedido> {
  const repo = await getPedidoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError("NOT_FOUND", "Pedido not found", 404);
  const merged: PizzariaPedido = {
    ...existing,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.criadoEm !== undefined ? { criadoEm: input.criadoEm } : {}),
    ...(input.atualizadoEm !== undefined ? { atualizadoEm: input.atualizadoEm } : {}),
    ...(input.itens !== undefined ? { itens: input.itens } : {}),
    ...(input.responsavelAtendimento !== undefined ? { responsavelAtendimento: input.responsavelAtendimento } : {}),
    ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
    ...(input.formaPagamento !== undefined ? { formaPagamento: input.formaPagamento } : {}),
    ...(input.statusPagamento !== undefined ? { statusPagamento: input.statusPagamento } : {}),
    ...(input.observacaoCritica !== undefined ? { observacaoCritica: input.observacaoCritica } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function imprimirComanda(ctx: RequestContext, input: PizzariaUpdatePedidoParams): Promise<PizzariaPedido> {
  const repo = await getPedidoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError("NOT_FOUND", "Pedido not found", 404);
  const merged: PizzariaPedido = {
    ...existing,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.criadoEm !== undefined ? { criadoEm: input.criadoEm } : {}),
    ...(input.atualizadoEm !== undefined ? { atualizadoEm: input.atualizadoEm } : {}),
    ...(input.itens !== undefined ? { itens: input.itens } : {}),
    ...(input.responsavelAtendimento !== undefined ? { responsavelAtendimento: input.responsavelAtendimento } : {}),
    ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
    ...(input.formaPagamento !== undefined ? { formaPagamento: input.formaPagamento } : {}),
    ...(input.statusPagamento !== undefined ? { statusPagamento: input.statusPagamento } : {}),
    ...(input.observacaoCritica !== undefined ? { observacaoCritica: input.observacaoCritica } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const confirmacaoImpressaoComandaGetPedidoResumoImpressaoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getPedidoResumoImpressao(ctx, {
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }));
};

export const confirmacaoImpressaoComandaCarregarResumoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await carregarResumo(ctx, {
    id: typeof params.id === "string" ? params.id : "",
    status: typeof params.status === "string" ? params.status as PizzariaPedido["status"] : undefined,
    criadoEm: params.criadoEm !== undefined ? params.criadoEm : undefined,
    atualizadoEm: params.atualizadoEm !== undefined ? params.atualizadoEm : undefined,
    itens: params.itens !== undefined ? params.itens : undefined,
    responsavelAtendimento: typeof params.responsavelAtendimento === "string" ? params.responsavelAtendimento : undefined,
    observacoes: typeof params.observacoes === "string" ? params.observacoes : undefined,
    formaPagamento: typeof params.formaPagamento === "string" ? params.formaPagamento : undefined,
    statusPagamento: typeof params.statusPagamento === "string" ? params.statusPagamento as PizzariaPedido["statusPagamento"] : undefined,
    observacaoCritica: typeof params.observacaoCritica === "string" ? params.observacaoCritica : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};

export const confirmacaoImpressaoComandaImprimirComandaHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await imprimirComanda(ctx, {
    id: typeof params.id === "string" ? params.id : "",
    status: typeof params.status === "string" ? params.status as PizzariaPedido["status"] : undefined,
    criadoEm: params.criadoEm !== undefined ? params.criadoEm : undefined,
    atualizadoEm: params.atualizadoEm !== undefined ? params.atualizadoEm : undefined,
    itens: params.itens !== undefined ? params.itens : undefined,
    responsavelAtendimento: typeof params.responsavelAtendimento === "string" ? params.responsavelAtendimento : undefined,
    observacoes: typeof params.observacoes === "string" ? params.observacoes : undefined,
    formaPagamento: typeof params.formaPagamento === "string" ? params.formaPagamento : undefined,
    statusPagamento: typeof params.statusPagamento === "string" ? params.statusPagamento as PizzariaPedido["statusPagamento"] : undefined,
    observacaoCritica: typeof params.observacaoCritica === "string" ? params.observacaoCritica : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};