/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/clientesCadastro.ts" enhancement="_blank" />

import { LocadoraClienteResponse, LocadoraUpdateClienteRequest } from "/_102035_/l2/locadora/web/contracts/clientesCadastro.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";
import { USE_MOCK, getMockClienteRepository } from "./mock.js";

async function getClienteRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockClienteRepository();
  return ctx.data.moduleData.getTable<LocadoraClienteResponse>("locadoraCliente");
}

export async function save(ctx: RequestContext, input: LocadoraUpdateClienteRequest): Promise<LocadoraClienteResponse> {
  const repo = await getClienteRepository(ctx);
  const existing = await repo.findOne({ where: { nome: input.nome } });
  if (!existing) throw new AppError("NOT_FOUND", "Cliente not found", 404);
  const merged: LocadoraClienteResponse = {
    ...existing,
    ...(input.cpf !== undefined ? { cpf: input.cpf } : {}),
    ...(input.cnh !== undefined ? { cnh: input.cnh } : {}),
    ...(input.telefone !== undefined ? { telefone: input.telefone } : {}),
    ...(input.email !== undefined ? { email: input.email } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function cancel(ctx: RequestContext, input: LocadoraUpdateClienteRequest): Promise<LocadoraClienteResponse> {
  const repo = await getClienteRepository(ctx);
  const existing = await repo.findOne({ where: { nome: input.nome } });
  if (!existing) throw new AppError("NOT_FOUND", "Cliente not found", 404);
  const merged: LocadoraClienteResponse = {
    ...existing,
    ...(input.cpf !== undefined ? { cpf: input.cpf } : {}),
    ...(input.cnh !== undefined ? { cnh: input.cnh } : {}),
    ...(input.telefone !== undefined ? { telefone: input.telefone } : {}),
    ...(input.email !== undefined ? { email: input.email } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function validate(ctx: RequestContext, input: LocadoraUpdateClienteRequest): Promise<LocadoraClienteResponse> {
  const repo = await getClienteRepository(ctx);
  const existing = await repo.findOne({ where: { nome: input.nome } });
  if (!existing) throw new AppError("NOT_FOUND", "Cliente not found", 404);
  const merged: LocadoraClienteResponse = {
    ...existing,
    ...(input.cpf !== undefined ? { cpf: input.cpf } : {}),
    ...(input.cnh !== undefined ? { cnh: input.cnh } : {}),
    ...(input.telefone !== undefined ? { telefone: input.telefone } : {}),
    ...(input.email !== undefined ? { email: input.email } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const clientesCadastroSaveHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await save(ctx, {
    nome: typeof params.nome === "string" ? params.nome : '',
    cpf: typeof params.cpf === "string" ? params.cpf : undefined,
    cnh: typeof params.cnh === "string" ? params.cnh : undefined,
    telefone: typeof params.telefone === "string" ? params.telefone : undefined,
    email: typeof params.email === "string" ? params.email : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};

export const clientesCadastroCancelHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await cancel(ctx, {
    nome: typeof params.nome === "string" ? params.nome : '',
    cpf: typeof params.cpf === "string" ? params.cpf : undefined,
    cnh: typeof params.cnh === "string" ? params.cnh : undefined,
    telefone: typeof params.telefone === "string" ? params.telefone : undefined,
    email: typeof params.email === "string" ? params.email : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};

export const clientesCadastroValidateHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await validate(ctx, {
    nome: typeof params.nome === "string" ? params.nome : '',
    cpf: typeof params.cpf === "string" ? params.cpf : undefined,
    cnh: typeof params.cnh === "string" ? params.cnh : undefined,
    telefone: typeof params.telefone === "string" ? params.telefone : undefined,
    email: typeof params.email === "string" ? params.email : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};