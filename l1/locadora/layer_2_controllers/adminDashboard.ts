/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/adminDashboard.ts" enhancement="_blank" />

import { LocadoraClienteResponse, LocadoraLocacaoResponse, LocadoraVeiculoResponse } from "/_102035_/l2/locadora/web/contracts/adminDashboard.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";
import { USE_MOCK, getMockVeiculoRepository, getMockClienteRepository, getMockLocacaoRepository } from "./mock.js";

async function getVeiculoRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockVeiculoRepository();
  return ctx.data.moduleData.getTable<LocadoraVeiculoResponse>('locadoraVeiculo');
}

async function getClienteRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockClienteRepository();
  return ctx.data.moduleData.getTable<LocadoraClienteResponse>('locadoraCliente');
}

async function getLocacaoRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockLocacaoRepository();
  return ctx.data.moduleData.getTable<LocadoraLocacaoResponse>('locadoraLocacao');
}

export async function getQuickAccess(ctx: RequestContext, input?: {}): Promise<{}> {
  return {};
}

export async function getSummary(ctx: RequestContext, input?: {}): Promise<{ veiculos: LocadoraVeiculoResponse[]; clientes: LocadoraClienteResponse[]; locacoes: LocadoraLocacaoResponse[] }> {
  const veiculoRepo = await getVeiculoRepository(ctx);
  const clienteRepo = await getClienteRepository(ctx);
  const locacaoRepo = await getLocacaoRepository(ctx);
  const veiculos = await veiculoRepo.findMany();
  const clientes = await clienteRepo.findMany();
  const locacoes = await locacaoRepo.findMany();
  return { veiculos, clientes, locacoes };
}

export const adminDashboardGetQuickAccessHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getQuickAccess(ctx, {}));
};

export const adminDashboardGetSummaryHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getSummary(ctx, {}));
};