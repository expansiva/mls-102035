/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/veiculosLista.ts" enhancement="_blank" />

import { LocadoraVeiculoResponse } from "/_102035_/l2/locadora/web/contracts/veiculosLista.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";
import { USE_MOCK, getMockVeiculoRepository } from "./mock.js";

async function getVeiculoRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockVeiculoRepository();
  return ctx.data.moduleData.getTable<LocadoraVeiculoResponse>('locadoraVeiculo');
}

export async function listVeiculos(ctx: RequestContext, input?: { status?: string }): Promise<LocadoraVeiculoResponse[]> {
  const repo = await getVeiculoRepository(ctx);
  const rows = await repo.findMany();
  if (input?.status !== '') {
    return rows.filter((item: LocadoraVeiculoResponse) => item.status === input.status);
  }
  return rows;
}

export const veiculosListaListVeiculosHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await listVeiculos(ctx, {
    status: typeof params.status === 'string' && params.status !== 'todos'? params.status : ''
  }));
};