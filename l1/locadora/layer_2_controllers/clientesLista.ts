/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/clientesLista.ts" enhancement="_blank" />

import { LocadoraClienteResponse } from "/_102035_/l2/locadora/web/contracts/clientesLista.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";
import { USE_MOCK, getMockClienteRepository } from "./mock.js";

async function getClienteRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockClienteRepository();
  return ctx.data.moduleData.getTable<LocadoraClienteResponse>("locadoraCliente");
}

export async function listarClientes(
  ctx: RequestContext,
  input?: {
    nome?: string;
    cpf?: string;
    cnh?: string;
    telefone?: string;
    email?: string;
    statusValidacao?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: string;
  }
): Promise<LocadoraClienteResponse[]> {
  const repo = await getClienteRepository(ctx);
  let rows = await repo.findMany();
  if (input?.nome !== undefined) {
    rows = rows.filter((item: LocadoraClienteResponse) => item.nome.includes(input.nome as string));
  }
  if (input?.cpf !== undefined) {
    rows = rows.filter((item: LocadoraClienteResponse) => item.cpf.includes(input.cpf as string));
  }
  if (input?.cnh !== undefined) {
    rows = rows.filter((item: LocadoraClienteResponse) => item.cnh.includes(input.cnh as string));
  }
  if (input?.telefone !== undefined) {
    rows = rows.filter((item: LocadoraClienteResponse) => item.telefone.includes(input.telefone as string));
  }
  if (input?.email !== undefined) {
    rows = rows.filter((item: LocadoraClienteResponse) => item.email.includes(input.email as string));
  }
  return rows;
}

export const clientesListaListarClientesHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(
    await listarClientes(ctx, {
      nome: typeof params.nome === "string" ? params.nome : undefined,
      cpf: typeof params.cpf === "string" ? params.cpf : undefined,
      cnh: typeof params.cnh === "string" ? params.cnh : undefined,
      telefone: typeof params.telefone === "string" ? params.telefone : undefined,
      email: typeof params.email === "string" ? params.email : undefined,
      statusValidacao: typeof params.statusValidacao === "string" ? params.statusValidacao : undefined,
      page: typeof params.page === "number" ? params.page : undefined,
      pageSize: typeof params.pageSize === "number" ? params.pageSize : undefined,
      sortBy: typeof params.sortBy === "string" ? params.sortBy : undefined,
      sortDir: typeof params.sortDir === "string" ? params.sortDir : undefined
    })
  );
};