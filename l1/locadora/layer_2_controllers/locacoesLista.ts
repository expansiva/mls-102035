/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/locacoesLista.ts" enhancement="_blank" />

import { LocadoraLocacaoResponse } from "/_102035_/l2/locadora/web/contracts/locacoesLista.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";
import { USE_MOCK, getMockLocacaoRepository } from "./mock.js";

async function getLocacaoRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockLocacaoRepository();
  return ctx.data.moduleData.getTable<LocadoraLocacaoResponse>("locadoraLocacao");
}

export async function listLocacoes(ctx: RequestContext, input?: {
  placaVeiculo?: string;
  dataRetiradaInicio?: string;
  dataRetiradaFim?: string;
  devolucaoPrevistaInicio?: string;
  devolucaoPrevistaFim?: string;
  formaPagamento?: string;
}): Promise<LocadoraLocacaoResponse[]> {
  const repo = await getLocacaoRepository(ctx);
  const rows = await repo.findMany();
  let result = rows;
  if (input?.placaVeiculo) {
    result = result.filter((item: LocadoraLocacaoResponse) => item.placaVeiculo.includes(input.placaVeiculo as string));
  }
  if (input?.dataRetiradaInicio) {
    result = result.filter((item: LocadoraLocacaoResponse) => item.dataRetirada >= (input.dataRetiradaInicio as string));
  }
  if (input?.dataRetiradaFim) {
    result = result.filter((item: LocadoraLocacaoResponse) => item.dataRetirada <= (input.dataRetiradaFim as string));
  }
  if (input?.devolucaoPrevistaInicio) {
    result = result.filter((item: LocadoraLocacaoResponse) => item.devolucaoPrevista >= (input.devolucaoPrevistaInicio as string));
  }
  if (input?.devolucaoPrevistaFim) {
    result = result.filter((item: LocadoraLocacaoResponse) => item.devolucaoPrevista <= (input.devolucaoPrevistaFim as string));
  }
  if (input?.formaPagamento) {
    result = result.filter((item: LocadoraLocacaoResponse) => item.formaPagamento.includes(input.formaPagamento as string));
  }
  return result;
}

export const locacoesListaListLocacoesHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await listLocacoes(ctx, {
    placaVeiculo: typeof params.placaVeiculo === "string" ? params.placaVeiculo : undefined,
    dataRetiradaInicio: typeof params.dataRetiradaInicio === "string" ? params.dataRetiradaInicio : undefined,
    dataRetiradaFim: typeof params.dataRetiradaFim === "string" ? params.dataRetiradaFim : undefined,
    devolucaoPrevistaInicio: typeof params.devolucaoPrevistaInicio === "string" ? params.devolucaoPrevistaInicio : undefined,
    devolucaoPrevistaFim: typeof params.devolucaoPrevistaFim === "string" ? params.devolucaoPrevistaFim : undefined,
    formaPagamento: typeof params.formaPagamento === "string" ? params.formaPagamento : undefined
  }));
};