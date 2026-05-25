/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/areaPublicaAcompanhamento.ts" enhancement="_blank" />

import { PizzariaConfiguracaoWhatsApp, PizzariaEntrega, PizzariaItemPedido, PizzariaPedido, PizzariaTempoAlvoEtapa } from "/_102035_/l1/pizzaria/module.js"
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js"

async function getPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPedido>("pizzariaPedido")
}

async function getTempoAlvoEtapaRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaTempoAlvoEtapa>("pizzariaTempoAlvoEtapa")
}

async function getItemPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaItemPedido>("pizzariaItemPedido")
}

async function getEntregaRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaEntrega>("pizzariaEntrega")
}

async function getConfiguracaoWhatsAppRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaConfiguracaoWhatsApp>("pizzariaConfiguracaoWhatsApp")
}

export async function getPedidoResumoPublico(ctx: RequestContext, input?: { pedidoId?: string }): Promise<PizzariaPedido | undefined> {
  const repo = await getPedidoRepository(ctx)
  const rows = await repo.findMany()
  const filtered = input?.pedidoId ? rows.filter((item: PizzariaPedido) => (item as unknown as Record<string, unknown>).pedidoId === input.pedidoId) : rows
  return filtered[0]
}

export async function listPedidoEtapasPublico(ctx: RequestContext, input?: { pedidoId?: string }): Promise<PizzariaTempoAlvoEtapa[]> {
  const repo = await getTempoAlvoEtapaRepository(ctx)
  const rows = await repo.findMany()
  const filtered = input?.pedidoId ? rows.filter((item: PizzariaTempoAlvoEtapa) => (item as unknown as Record<string, unknown>).pedidoId === input.pedidoId) : rows
  return filtered
}

export async function listItensPedidoPublico(ctx: RequestContext, input?: { pedidoId?: string }): Promise<PizzariaItemPedido[]> {
  const repo = await getItemPedidoRepository(ctx)
  const rows = await repo.findMany()
  const filtered = input?.pedidoId ? rows.filter((item: PizzariaItemPedido) => (item as unknown as Record<string, unknown>).pedidoId === input.pedidoId) : rows
  return filtered
}

export async function getEntregaPublica(ctx: RequestContext, input?: { pedidoId?: string }): Promise<PizzariaEntrega | undefined> {
  const repo = await getEntregaRepository(ctx)
  const rows = await repo.findMany()
  const filtered = input?.pedidoId ? rows.filter((item: PizzariaEntrega) => (item as unknown as Record<string, unknown>).pedidoId === input.pedidoId) : rows
  return filtered[0]
}

export async function getConfiguracaoWhatsAppPublica(ctx: RequestContext): Promise<PizzariaConfiguracaoWhatsApp | undefined> {
  const repo = await getConfiguracaoWhatsAppRepository(ctx)
  const rows = await repo.findMany()
  return rows[0]
}

export const areaPublicaAcompanhamentoGetPedidoResumoPublicoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>
  return ok(await getPedidoResumoPublico(ctx, {
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }))
}

export const areaPublicaAcompanhamentoListPedidoEtapasPublicoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>
  return ok(await listPedidoEtapasPublico(ctx, {
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }))
}

export const areaPublicaAcompanhamentoListItensPedidoPublicoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>
  return ok(await listItensPedidoPublico(ctx, {
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }))
}

export const areaPublicaAcompanhamentoGetEntregaPublicaHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>
  return ok(await getEntregaPublica(ctx, {
    pedidoId: typeof params.pedidoId === "string" ? params.pedidoId : undefined
  }))
}

export const areaPublicaAcompanhamentoGetConfiguracaoWhatsAppPublicaHandler: BffHandler = async ({ request, ctx }) => {
  return ok(await getConfiguracaoWhatsAppPublica(ctx))
}
